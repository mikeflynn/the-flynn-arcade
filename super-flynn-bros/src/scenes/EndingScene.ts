import Phaser from "phaser";

export class EndingScene extends Phaser.Scene {
  constructor() {
    super("Ending");
  }

  create(): void {
    this.add.text(160, 88, "Ending: coming in the next task", { fontFamily: "monospace", fontSize: "8px" }).setOrigin(0.5);
  }
}
