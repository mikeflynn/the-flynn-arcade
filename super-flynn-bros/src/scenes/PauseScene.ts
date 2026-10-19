import Phaser from "phaser";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("Pause");
  }

  create(): void {
    this.add.text(160, 88, "Pause: coming in the next task", { fontFamily: "monospace", fontSize: "8px" }).setOrigin(0.5);
  }
}
