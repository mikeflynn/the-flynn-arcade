import Phaser from "phaser";
import type { InputManager } from "@web-games/input";
import { catalog, heroList } from "../engine/catalog";
import { makeSpriteSheet } from "../engine/pixelArt";
import { nextAttempts } from "../engine/assets";
import { buildTileset } from "../engine/tileset";
import { GameAudio } from "../engine/audio";
import { phaserAudioBackend } from "../engine/phaserAudio";
import { setServices, useControls, type GameMode } from "../engine/services";
import type { Progress } from "../engine/progress";
import type { Size } from "../engine/types";
import { heartArt } from "../items";
import { goalArt } from "../tiles";
import { musicTracks, soundEffects } from "../sounds";
import { settings } from "../settings";

/** Handed over by main.ts through the game registry. */
export interface BootData {
  input: InputManager;
  progress: Progress;
  /** Custom PNGs that exist: key → url. */
  overrides: Map<string, string>;
  /** Sound and music files that exist: cache key → urls (.mp3 first, then .ogg). */
  audioFiles: Map<string, string[]>;
  /** From ?level=2&mode=coop: skip the title screen. */
  quickStart: { mode: GameMode; levelIndex: number } | null;
}

/** Loads optional files, draws every sprite from text art, then starts the game. */
export class BootScene extends Phaser.Scene {
  private boot!: BootData;

  constructor() {
    super("Boot");
  }

  preload(): void {
    this.boot = this.registry.get("boot") as BootData;
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.info(`Couldn't load ${file.src}.`);
    });
    for (const [key, url] of this.boot.overrides) this.load.image(key, url);
    for (const [key, urls] of this.boot.audioFiles) this.load.audio(key, urls[0]);
  }

  create(): void {
    this.retryBrokenSounds(new Map([...this.boot.audioFiles].map(([key, urls]) => [key, urls.slice(1)])));
  }

  /**
   * If a sound file was broken (say jump.mp3 won't play), load the next one
   * with the same name (jump.ogg), round after round, then finish setting up.
   */
  private retryBrokenSounds(backups: Map<string, string[]>): void {
    const { attempts, remaining } = nextAttempts(backups, (key) => this.cache.audio.exists(key));
    if (attempts.length === 0) {
      this.finishBoot();
      return;
    }
    for (const [key, url] of attempts) {
      console.info(`Trying ${url} instead.`);
      this.load.audio(key, url);
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.retryBrokenSounds(remaining));
    this.load.start();
  }

  private finishBoot(): void {
    const warn = (message: string) => console.warn(message);
    const artSizes = new Map<string, Size>();
    for (const hero of heroList) {
      const { idle, walk1, walk2, jump } = hero.frames;
      artSizes.set(hero.key, makeSpriteSheet(this, hero.key, [idle, walk1, walk2, jump], hero.colors, warn));
    }
    for (const def of [...catalog.hazards, ...catalog.items]) {
      artSizes.set(def.key, makeSpriteSheet(this, def.key, def.frames, def.colors, warn));
    }
    makeSpriteSheet(this, "heart", heartArt.frames, heartArt.colors, warn);
    artSizes.set("goal", makeSpriteSheet(this, "goal", [goalArt.art], goalArt.colors, warn));
    const tileset = buildTileset(this, "tiles", catalog.tiles, warn);

    const available = new Set([...this.boot.audioFiles.keys()].filter((key) => this.cache.audio.exists(key)));
    const audio = new GameAudio(phaserAudioBackend(this.sound), {
      sfx: soundEffects,
      music: musicTracks,
      available,
      sfxVolume: settings.sfxVolume,
      musicVolume: settings.musicVolume,
      muted: this.boot.progress.muted,
    });
    audio.reportMissing();

    setServices({ input: this.boot.input, audio, progress: this.boot.progress, artSizes, tileset });

    const quick = this.boot.quickStart;
    if (quick) {
      useControls(this.boot.input, quick.mode);
      this.scene.start("Play", { mode: quick.mode, levelIndex: quick.levelIndex, score: 0 });
    } else {
      useControls(this.boot.input, "menu");
      this.scene.start("Title");
    }
  }
}
