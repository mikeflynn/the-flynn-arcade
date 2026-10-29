import { gameUrl } from "@web-games/arcade";
import type { GameAudio } from "@web-games/audio";
import type { InputManager } from "@web-games/input";
import { AttractClock } from "./attract";
import type { PosterView } from "./poster/poster";
import { moveSelection, nextAttractIndex, type Direction, type Slot } from "./selection";
import { settings } from "./settings";

export interface ControllerDeps {
  view: PosterView;
  slots: Slot[];
  input: Pick<InputManager, "update" | "anyJustPressed">;
  audio: Pick<GameAudio, "playSfx" | "playMusic" | "stopMusic" | "toggleMute" | "muted">;
  startIndex: number;
  now: number;
  dev: boolean;
  /** Goes to a game's address (the browser's location in real life). */
  go: (url: string) => void;
  saveMuted: (muted: boolean) => void;
}

/** From pressing Start to leaving for the game: coin, "GAME START!", fade. */
export const START_DELAY_MS = 1050;
/** "GAME START!" pops up this long after the coin sound. */
const BANNER_AT_MS = 150;
const FADE_MS = 300;

const DIRECTIONS: Direction[] = ["left", "right", "up", "down"];

/**
 * The arcade's brain: reads the controls every frame, moves the selection,
 * runs show-off mode, and does the "GAME START!" sequence. The poster (the
 * view) only draws what it's told.
 */
export class ArcadeController {
  private index: number;
  private readonly attract: AttractClock;
  private startAt = -1;
  private bannerShown = false;
  private fading = false;
  private left = false;
  private musicStarted = false;
  private pending: { kind: "hover" | "click"; index: number }[] = [];

  constructor(private readonly deps: ControllerDeps) {
    this.index = deps.startIndex;
    this.attract = new AttractClock(settings.attractDelayMs, settings.attractStepMs, deps.now);
    deps.view.select(this.index);
    deps.view.onHover((index) => this.pending.push({ kind: "hover", index }));
    deps.view.onClick((index) => this.pending.push({ kind: "click", index }));
  }

  get selected(): number {
    return this.index;
  }

  get starting(): boolean {
    return this.startAt >= 0;
  }

  frame(now: number): void {
    const { input, audio } = this.deps;
    input.update();
    if (this.starting) {
      this.pending = [];
      this.runStart(now);
      return;
    }

    const pressed = (a: string) => input.anyJustPressed(a);
    const pointer = this.pending;
    this.pending = [];
    const anyPress = pressed("start") || pressed("mute") || DIRECTIONS.some(pressed);
    if (anyPress || pointer.length > 0) this.wakeUp();

    if (pressed("mute")) this.deps.saveMuted(audio.toggleMute());

    if (this.attract.active) {
      // Any key or click just wakes the arcade up.
      if (anyPress || pointer.length > 0) this.attract.poke(now);
      else if (this.attract.tick(now)) this.select(nextAttractIndex(this.index, this.deps.slots), false);
      return;
    }

    for (const p of pointer) {
      this.select(p.index, true);
      if (p.kind === "click") return this.start(now);
    }

    const dir = DIRECTIONS.find(pressed);
    if (dir) this.select(moveSelection(this.index, dir, this.deps.view.columns(), this.deps.slots.length), true);
    else if (pressed("start")) return this.start(now);

    if (anyPress || pointer.length > 0) this.attract.poke(now);
    else if (this.attract.tick(now)) this.select(nextAttractIndex(this.index, this.deps.slots), false);
  }

  /** Browsers only allow sound after the first key press or click, so the music starts then. */
  private wakeUp(): void {
    if (this.musicStarted) return;
    this.musicStarted = true;
    this.deps.audio.playMusic("arcade");
  }

  private select(index: number, withSound: boolean): void {
    if (index === this.index || !this.deps.slots[index]) return;
    this.index = index;
    if (withSound) this.deps.audio.playSfx("move");
    this.deps.view.select(index);
  }

  private start(now: number): void {
    const slot = this.deps.slots[this.index];
    if (!slot || slot.kind === "soon") {
      this.deps.audio.playSfx("nope");
      this.deps.view.notYet(this.index);
      return;
    }
    this.startAt = now;
    this.deps.audio.playSfx("coin");
    this.deps.view.setCredit("CREDIT 1");
  }

  private runStart(now: number): void {
    const t = now - this.startAt;
    if (t >= BANNER_AT_MS && !this.bannerShown) {
      this.bannerShown = true;
      this.deps.audio.playSfx("select");
      this.deps.view.showGameStart();
    }
    if (t >= START_DELAY_MS - FADE_MS && !this.fading) {
      this.fading = true;
      this.deps.audio.stopMusic();
      void this.deps.view.fadeOut(FADE_MS);
    }
    if (t >= START_DELAY_MS && !this.left) {
      this.left = true;
      const slot = this.deps.slots[this.index];
      if (slot?.kind === "game") this.deps.go(gameUrl(slot.game, { dev: this.deps.dev }));
    }
  }
}
