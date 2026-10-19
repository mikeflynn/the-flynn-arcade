import Phaser from "phaser";

export class HudScene extends Phaser.Scene {
  constructor() {
    super("Hud");
  }

  create(): void {
    this.add.text(160, 88, "Hud: coming in the next task", { fontFamily: "monospace", fontSize: "8px" }).setOrigin(0.5);
  }
}

export interface HudState {
  score: number;
  donuts: number;
  timeMs: number;
  heroes: { name: string; hearts: number; out: boolean }[];
  maxHearts: number;
  muted: boolean;
}
