import Phaser from "phaser";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 320,
  height: 176,
  pixelArt: true,
  backgroundColor: "#6cc4ff",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: {
    create(this: Phaser.Scene) {
      this.add
        .text(160, 88, "SUPER FLYNN BROS", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" })
        .setOrigin(0.5);
    },
  },
});
