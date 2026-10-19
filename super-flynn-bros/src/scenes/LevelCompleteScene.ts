import Phaser from "phaser";

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super("LevelComplete");
  }

  create(): void {
    this.add.text(160, 88, "LevelComplete: coming in the next task", { fontFamily: "monospace", fontSize: "8px" }).setOrigin(0.5);
  }
}
