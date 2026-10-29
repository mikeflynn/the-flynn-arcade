import type Phaser from "phaser";
import type { InputManager } from "@web-games/input";
import type { GameAudio } from "@web-games/audio";
import { player1Controls, player2Controls } from "../controls";
import { FONT_FAMILY } from "./hud";

// Pieces every menu screen shares: pixel-font text, flat color bands, the
// controls, and a simple up/down menu.

export const INK = "#160c22";
export const P1_COLOR = 0x3f8cff;
export const P2_COLOR = 0xff4a4a;

const even = (n: number) => Math.round(n / 2) * 2;

/**
 * Pixel-font text with a dark outline. `size` is in world units (16, 32, 48...)
 * and the text lands on even units, so the letters stay crisp.
 */
export function label(
  scene: Phaser.Scene, text: string, x: number, y: number,
  opts: { size?: number; color?: string; align?: "left" | "center" | "right"; wrap?: number } = {},
): Phaser.GameObjects.Text {
  const size = opts.size ?? 32;
  const t = scene.add.text(0, 0, text, {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    color: opts.color ?? "#ffffff",
    stroke: INK,
    strokeThickness: size >= 32 ? 8 : 4,
    align: opts.align ?? "left",
    lineSpacing: size / 2,
    ...(opts.wrap && { wordWrap: { width: opts.wrap } }),
  });
  return place(t, x, y, opts.align ?? "left");
}

/** Puts text with its left edge, middle or right edge at x (top at y), on even units. Call again after setText. */
export function place(t: Phaser.GameObjects.Text, x: number, y: number, align: "left" | "center" | "right"): Phaser.GameObjects.Text {
  const left = align === "left" ? x : align === "center" ? x - t.width / 2 : x - t.width;
  return t.setPosition(even(left), even(y));
}

/** Flat horizontal bands of color filling the screen, top to bottom. */
export function bands(scene: Phaser.Scene, colors: number[], depth = 0): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  const h = even(540 / colors.length);
  colors.forEach((c, i) => g.fillStyle(c).fillRect(0, i * h, 960, i === colors.length - 1 ? 540 - i * h : h));
  return g;
}

/**
 * Gives each player their own controls and reads them once, so a button
 * still held from the last screen doesn't count as a new press here.
 */
export function useMenuControls(input: InputManager): void {
  input.setBindings(1, player1Controls);
  input.setBindings(2, player2Controls);
  input.update();
}

const PICK = ["start", "LP", "MP", "HP"];
const BACK = ["LK", "MK", "HK"];

/** Did this player (or anyone, if `player` is left out) just press start or a punch? */
export function pickPressed(input: InputManager, player?: number): boolean {
  return PICK.some((a) => (player ? input.justPressed(player, a) : input.anyJustPressed(a)));
}

/** Did this player (or anyone) just press a kick? Kicks go back. */
export function backPressed(input: InputManager, player?: number): boolean {
  return BACK.some((a) => (player ? input.justPressed(player, a) : input.anyJustPressed(a)));
}

/** True on and off, a few times a second: for flashing cursors. */
export const flashOn = (timeMs: number, periodMs = 400) => Math.floor(timeMs / (periodMs / 2)) % 2 === 0;

/**
 * An up/down list of options for both players. Call `update` every frame; it
 * returns the option picked (start or a punch), or null.
 */
export class Menu {
  private readonly items: Phaser.GameObjects.Text[];
  private readonly arrow: Phaser.GameObjects.Text;
  private index = 0;

  constructor(scene: Phaser.Scene, options: readonly string[], x: number, y: number, spacing = 56, depth = 10) {
    this.items = options.map((o, i) => label(scene, o, x, y + i * spacing, { align: "center" }).setDepth(depth));
    this.arrow = label(scene, ">", 0, 0, { color: "#ffd23b" }).setDepth(depth);
    this.highlight();
  }

  update(input: InputManager, audio: GameAudio, timeMs: number): number | null {
    const move = (input.anyJustPressed("DOWN") ? 1 : 0) - (input.anyJustPressed("UP") ? 1 : 0);
    if (move !== 0) {
      this.index = (this.index + move + this.items.length) % this.items.length;
      audio.playSfx("menuMove");
      this.highlight();
    }
    this.arrow.setVisible(flashOn(timeMs, 600));
    if (pickPressed(input)) {
      audio.playSfx("menuSelect");
      return this.index;
    }
    return null;
  }

  /** Removes the menu from the screen. */
  destroy(): void {
    this.items.forEach((t) => t.destroy());
    this.arrow.destroy();
  }

  private highlight(): void {
    this.items.forEach((t, i) => t.setColor(i === this.index ? "#ffd23b" : "#ffffff"));
    const chosen = this.items[this.index]!;
    this.arrow.setPosition(even(chosen.x - 48), chosen.y);
  }
}
