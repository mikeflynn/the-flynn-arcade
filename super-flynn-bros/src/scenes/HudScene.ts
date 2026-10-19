import Phaser from "phaser";
import { formatTime, textStyle } from "../engine/ui";
import { getServices } from "../engine/services";
import { fitBody } from "../engine/sprites";

export interface HudState {
  score: number;
  donuts: number;
  timeMs: number;
  heroes: { name: string; hearts: number; out: boolean }[];
  maxHearts: number;
  muted: boolean;
}

/** Hearts, donuts, time, and score, drawn on top of the level. */
export class HudScene extends Phaser.Scene {
  private last = "";
  private shown: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("Hud");
  }

  create(): void {
    this.last = "";
    this.shown = [];
    const play = this.scene.get("Play");
    play.events.on("hud", this.draw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => play.events.off("hud", this.draw, this));
  }

  private draw(state: HudState): void {
    // Only redraw when something you can see changed.
    const key = JSON.stringify({ ...state, timeMs: Math.floor(state.timeMs / 1000) });
    if (key === this.last) return;
    this.last = key;
    this.shown.forEach((thing) => thing.destroy());
    this.shown = [];
    const keep = <T extends Phaser.GameObjects.GameObject>(thing: T): T => {
      this.shown.push(thing);
      return thing;
    };

    state.heroes.forEach((hero, row) => {
      const y = 7 + row * 11;
      keep(this.add.text(4, y, hero.name.toUpperCase(), textStyle(8)).setOrigin(0, 0.5));
      for (let i = 0; i < state.maxHearts; i++) {
        keep(this.add.image(44 + i * 10, y, "heart", i < hero.hearts ? 0 : 1).setAlpha(hero.out ? 0.4 : 1));
      }
    });
    const donut = this.add.image(200, 7, "donut", 0);
    const art = getServices().artSizes.get("donut") ?? { width: donut.frame.width, height: donut.frame.height };
    // Sized from the art, so a big custom donut.png still fits in the HUD.
    keep(donut.setScale(0.8 * fitBody({ width: donut.frame.width, height: donut.frame.height }, art).scale));
    keep(this.add.text(208, 7, `x${state.donuts}`, textStyle(8)).setOrigin(0, 0.5));
    keep(this.add.text(316, 7, formatTime(state.timeMs), textStyle(8)).setOrigin(1, 0.5));
    keep(this.add.text(316, 18, `SCORE ${state.score}`, textStyle(8)).setOrigin(1, 0.5));
    if (state.muted) keep(this.add.text(316, 29, "MUTED (M)", textStyle(8, "#d4f1ff")).setOrigin(1, 0.5));
  }
}
