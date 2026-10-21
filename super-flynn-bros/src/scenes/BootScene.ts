import Phaser from "phaser";
import type { InputManager } from "@web-games/input";
import { catalog, heroList } from "../engine/catalog";
import { makeSpriteSheet } from "@web-games/pixel-art";
import { GameAudio, loadSoundsWithBackups, phaserAudioBackend } from "@web-games/audio";
import { buildTileset } from "../engine/tileset";
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
  }

  create(): void {
    // Sounds load after the pictures, with backups: a broken jump.mp3 falls back to jump.ogg.
    loadSoundsWithBackups(this, this.boot.audioFiles, () => this.finishBoot());
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
