import Phaser from "phaser";
import { gameUrl, type GameInfo } from "@web-games/arcade";
import { GameAudio, loadSoundsWithBackups, phaserAudioBackend } from "@web-games/audio";
import type { InputManager } from "@web-games/input";
import { buildSlots, initialIndex, nextAttractIndex, wrap, type Slot } from "../selection";
import { saveArcadeSettings } from "../storage";
import { settings } from "../settings";
import { musicTracks, soundEffects } from "../sounds";
import { createBackground } from "./background";
import { createLogo } from "./logo";
import { CabinetRow } from "./cabinets";
import { InfoPanel } from "./infoPanel";
import { HEIGHT, outlined, WIDTH } from "./style";

/** Handed over by main.ts through the game registry. */
export interface ArcadeBoot {
  input: InputManager;
  games: GameInfo[];
  /** Sound and music files that exist: cache key → urls (.mp3 first, then .ogg). */
  audioFiles: Map<string, string[]>;
  /** The game the player just came back from, if any. */
  fromId: string | null;
  muted: boolean;
}

/** The whole arcade: one scene with the background, logo, cabinets, and info panel. */
export class ArcadeScene extends Phaser.Scene {
  private boot!: ArcadeBoot;
  private audio!: GameAudio;
  private slots: Slot[] = [];
  private row!: CabinetRow;
  private panel!: InfoPanel;
  private coinText!: Phaser.GameObjects.Text;
  private updateBackground: (deltaMs: number) => void = () => {};
  private ready = false;
  private starting = false;
  private lastInputAt = 0;
  private attracting = false;
  private nextAttractAt = 0;

  constructor() {
    super("Arcade");
  }

  create(): void {
    this.boot = this.registry.get("boot") as ArcadeBoot;
    loadSoundsWithBackups(this, this.boot.audioFiles, () => this.build());
  }

  private build(): void {
    const { games, fromId, muted, audioFiles } = this.boot;
    this.audio = new GameAudio(phaserAudioBackend(this.sound), {
      sfx: soundEffects,
      music: musicTracks,
      available: new Set([...audioFiles.keys()].filter((key) => this.cache.audio.exists(key))),
      sfxVolume: settings.sfxVolume,
      musicVolume: settings.musicVolume,
      muted,
    });
    this.audio.reportMissing();
    // Browsers hold music until the first key press, then it starts.
    this.audio.playMusic("arcade");

    this.updateBackground = createBackground(this);
    this.slots = buildSlots(games, settings.comingSoonCabinets);
    this.row = new CabinetRow(this, this.slots);
    this.panel = new InfoPanel(this);
    createLogo(this, fromId === null);
    this.coinText = outlined(this, WIDTH - 4, 38, "INSERT COIN", 8, "#fff35c").setOrigin(1, 0.5).setDepth(5);
    this.tweens.add({ targets: this.coinText, alpha: 0, duration: 500, yoyo: true, repeat: -1, hold: 0 });

    const index = initialIndex(this.slots, fromId);
    this.row.select(index, false);
    this.panel.show(this.slots[index]);
    this.lastInputAt = this.time.now;
    this.ready = true;
  }

  update(_time: number, delta: number): void {
    if (!this.ready) return;
    this.updateBackground(delta);
    if (this.starting) return;

    const { input } = this.boot;
    const now = this.time.now;
    const pressed = (action: string) => input.anyJustPressed(action);
    const anyPress = ["left", "right", "start", "mute"].some(pressed);

    if (pressed("mute")) {
      this.audio.toggleMute();
      saveArcadeSettings({ muted: this.audio.muted });
    }

    if (this.attracting) {
      // Any press just wakes the arcade up.
      if (anyPress) {
        this.attracting = false;
        this.lastInputAt = now;
      } else if (now >= this.nextAttractAt) {
        this.selectIndex(nextAttractIndex(this.row.selected, this.slots), false);
        this.nextAttractAt = now + settings.attractStepMs;
      }
      return;
    }

    if (anyPress) this.lastInputAt = now;
    if (pressed("left")) this.selectIndex(wrap(this.row.selected - 1, this.slots.length), true);
    else if (pressed("right")) this.selectIndex(wrap(this.row.selected + 1, this.slots.length), true);
    else if (pressed("start")) this.start();

    if (now - this.lastInputAt > settings.attractDelayMs) {
      this.attracting = true;
      this.nextAttractAt = now;
    }
  }

  private selectIndex(index: number, withSound: boolean): void {
    if (withSound) this.audio.playSfx("move");
    this.row.select(index);
    this.panel.show(this.slots[index]);
  }

  private start(): void {
    const slot = this.slots[this.row.selected];
    if (slot.kind === "soon") {
      this.audio.playSfx("nope");
      this.row.notYet();
      return;
    }
    this.starting = true;
    this.audio.playSfx("coin");
    this.tweens.killTweensOf(this.coinText);
    this.coinText.setAlpha(1).setText("CREDIT 1");

    this.time.delayedCall(150, () => {
      this.cameras.main.flash(120, 255, 255, 255);
      this.audio.playSfx("select");
      this.row.flashScreen();
      this.gameStartBanner();
    });
    this.time.delayedCall(150 + 400 + 500, () => {
      this.audio.stopMusic();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        window.location.assign(gameUrl(slot.game, { dev: import.meta.env.DEV }));
      });
    });
  }

  /** A giant "GAME START!" zooming in over a burst of speed lines. */
  private gameStartBanner(): void {
    const lines = this.add.graphics({ x: WIDTH / 2, y: HEIGHT / 2 }).setDepth(9);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      lines.fillStyle(i % 2 ? 0xffd200 : 0xffffff, 0.9);
      lines.fillTriangle(Math.cos(a) * 20, Math.sin(a) * 20, Math.cos(a + 0.04) * 260, Math.sin(a + 0.04) * 260, Math.cos(a - 0.04) * 260, Math.sin(a - 0.04) * 260);
    }
    this.tweens.add({ targets: lines, alpha: 0, scale: 1.5, duration: 700 });
    const banner = outlined(this, WIDTH / 2, HEIGHT / 2, "GAME START!", 24, "#ff2a2a").setDepth(10).setScale(4);
    this.tweens.add({ targets: banner, scale: 1, duration: 400, ease: "Back.easeOut" });
  }
}
