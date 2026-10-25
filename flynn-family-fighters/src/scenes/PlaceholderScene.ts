import Phaser from "phaser";

/** Stands in for the fight until the real one is built. */
export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super("placeholder");
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    this.add
      .text(480, 270, "FIGHT COMING SOON", { fontFamily: "monospace", fontSize: "48px", color: "#ffffff" })
      .setOrigin(0.5);
  }
}
