import Phaser from "phaser";
import { colors, logoText } from "../settings";
import { drawTwinkle, toColor, WIDTH } from "./style";

/** The big chrome "THE FLYNN ARCADE" logo. With intro, it slams in and shakes the screen. */
export function createLogo(scene: Phaser.Scene, intro: boolean): Phaser.GameObjects.Text {
  const logo = scene.add
    .text(WIDTH / 2, 17, logoText, {
      fontFamily: "monospace",
      fontStyle: "bold",
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setShadow(2, 2, "#000000", 0, true, true)
    .setDepth(5);

  // Yellow → orange → red, top to bottom
  const gradient = logo.context.createLinearGradient(0, 0, 0, logo.height);
  colors.logo.forEach((color, i) => gradient.addColorStop(i / Math.max(1, colors.logo.length - 1), color));
  logo.setFill(gradient);

  if (intro) {
    logo.setScale(3);
    scene.tweens.add({
      targets: logo,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => scene.cameras.main.shake(150, 0.01),
    });
  }

  // A glint sweeps across the logo every few seconds
  scene.time.addEvent({
    delay: 4000,
    loop: true,
    callback: () => {
      const glint = scene.add.graphics({ x: logo.x - logo.width / 2, y: logo.y - 4 }).setDepth(6);
      drawTwinkle(glint, 5, toColor("#ffffff"));
      scene.tweens.add({
        targets: glint,
        x: logo.x + logo.width / 2,
        duration: 500,
        ease: "Sine.easeInOut",
        onComplete: () => glint.destroy(),
      });
    },
  });
  return logo;
}
