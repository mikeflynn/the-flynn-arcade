import Phaser from "phaser";
import { InputManager } from "@web-games/input";
import {
  audioCandidates, findAllAssets, findAssets, GameAudio, loadSoundsWithBackups, makeHttpExists, phaserAudioBackend,
} from "@web-games/audio";
import { bodyDims, buildParts, DEFAULT_LOOK, type ShapeName } from "@web-games/rig";
import type { Fighter } from "../fighter";
import { KNOWN_MOVE_TYPES } from "../moves";
import type { PartPictures } from "../render/FighterView";
import { loadPixelFont } from "../render/hud";
import { loadRoster } from "../roster";
import { musicTracks, soundEffects } from "../sounds";
import { stageById } from "../stages";
import type { FightData } from "./FightScene";

/** Things every scene shares. BootScene creates them. */
export interface Services {
  input: InputManager;
  audio: GameAudio;
  roster: Fighter[];
  /** Pictures that replace parts of a fighter, by fighter id. */
  parts: Map<string, PartPictures>;
}

let services: Services | null = null;

export function getServices(): Services {
  if (!services) throw new Error("BootScene hasn't finished setting up yet.");
  return services;
}

/** What main.ts asks Boot to start, read from the address bar. */
export interface BootRequest {
  /** ?fight=colin,ryan: straight into a fight. `cpu` says which side the computer plays. */
  fight?: { p1: string; p2: string; cpu: [boolean, boolean]; stage?: string };
}

/** Every part a picture can replace (head, chest, fist, ...). */
const PART_NAMES = Object.keys(buildParts(DEFAULT_LOOK, bodyDims(DEFAULT_LOOK))) as ShapeName[];
const partKey = (id: string, part: string) => `part:${id}:${part}`;

/**
 * Loads the font, the roster, any custom part pictures and sounds, then
 * starts the game. Missing pictures and sounds are simply skipped.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    void this.boot();
  }

  private async boot(): Promise<void> {
    const exists = makeHttpExists();
    const [, { fighters, problems }, audioFiles] = await Promise.all([
      loadPixelFont(),
      loadRoster(KNOWN_MOVE_TYPES),
      findAllAssets(audioCandidates(soundEffects, musicTracks), exists),
    ]);
    problems.forEach((p) => console.warn(`🥊 ${p}`));
    if (fighters.length === 0) {
      this.add.text(480, 270, "NO FIGHTERS FOUND\nCHECK src/characters/", { fontFamily: "monospace", fontSize: "32px", align: "center" }).setOrigin(0.5);
      return;
    }

    // Custom part pictures: public/assets/fighters/<id>/<part>.png
    const candidates = fighters.flatMap((f) => PART_NAMES.map((part) => ({ key: partKey(f.id, part), urls: [`assets/fighters/${f.id}/${part}.png`] })));
    const pictures = await findAssets(candidates, exists);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => console.info(`Couldn't load ${file.src}.`));
    for (const [key, url] of pictures) this.load.image(key, url);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      // Sounds load after the pictures, with backups: a broken hit.mp3 falls back to hit.ogg.
      loadSoundsWithBackups(this, audioFiles, () => this.finish(fighters, audioFiles));
    });
    this.load.start();
  }

  private finish(roster: Fighter[], audioFiles: Map<string, string[]>): void {
    const parts = new Map<string, PartPictures>();
    for (const f of roster) {
      const mine: PartPictures = {};
      for (const part of PART_NAMES) {
        const key = partKey(f.id, part);
        if (this.textures.exists(key)) mine[part] = this.textures.get(key).getSourceImage() as HTMLImageElement;
      }
      parts.set(f.id, mine);
    }

    const available = new Set([...audioFiles.keys()].filter((key) => this.cache.audio.exists(key)));
    const audio = new GameAudio(phaserAudioBackend(this.sound), {
      sfx: soundEffects,
      music: musicTracks,
      available,
      sfxVolume: 1,
      musicVolume: 1,
      muted: false,
    });
    audio.reportMissing();
    services = { input: new InputManager(window), audio, roster, parts };

    // For now Boot only runs for ?fight=... (the title and select screens come next).
    const request = (this.registry.get("boot") as BootRequest | undefined) ?? {};
    if (request.fight) this.startQuickFight(request.fight);
  }

  /** ?fight=colin,ryan: the two fighters (or the first ones in the roster), and a rematch when it ends. */
  private startQuickFight(req: NonNullable<BootRequest["fight"]>): void {
    const { roster } = getServices();
    const byId = (id: string, fallback: number) => roster.find((f) => f.id === id) ?? roster[fallback % roster.length]!;
    const p1 = byId(req.p1, 0);
    const p2 = byId(req.p2, 1);
    const data: FightData = {
      p1,
      p2,
      cpu: req.cpu,
      stage: stageById(req.stage ?? p1.stage),
      onDone: () => this.game.scene.start("fight", data),
    };
    this.scene.start("fight", data);
  }
}
