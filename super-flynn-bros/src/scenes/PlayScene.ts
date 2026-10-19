import Phaser from "phaser";

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("Play");
  }

  create(): void {
    this.add.text(160, 88, "Play: coming in the next task", { fontFamily: "monospace", fontSize: "8px" }).setOrigin(0.5);
  }
}
