import Phaser from "phaser";

export const WIDTH = 320;
export const HEIGHT = 176;
/** Where the floor starts, and where the cabinets' feet stand. */
export const FLOOR_Y = 112;
export const CABINET_BASE_Y = 132;

/** "#ff0000" → 0xff0000, for Phaser's drawing functions. */
export const toColor = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

/** Bold text with a thick black outline: the arcade's house style. */
export function outlined(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color = "#ffffff",
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: "monospace",
      fontStyle: "bold",
      fontSize: `${size}px`,
      color,
      stroke: "#000000",
      strokeThickness: Math.max(2, Math.round(size / 4)),
    })
    .setOrigin(0.5);
}

/** A little 4-point twinkle, drawn centered on (0, 0). */
export function drawTwinkle(g: Phaser.GameObjects.Graphics, size: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillRect(-size, -1, size * 2 + 1, 3);
  g.fillRect(-1, -size, 3, size * 2 + 1);
  g.fillRect(-2, -2, 5, 5);
}
