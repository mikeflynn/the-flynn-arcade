import type Phaser from "phaser";
import { FONT_FAMILY } from "./hud";

// Arcade-logo lettering, drawn as pixel art: each letter is filled with flat
// bands of color (a bright shine on top, deeper colors below), wrapped in a
// dark outline and a drop shadow. It's drawn once into a canvas at real-pixel
// size, then shown at scale 2 (the camera's zoom is 0.5).

export interface LogoLine {
  text: string;
  /** Letter size in real pixels. Press Start 2P stays crisp at multiples of 8. */
  size: number;
}

/** Fire colors, top to bottom. The first band is the shine. */
export const FIRE_BANDS = ["#fff6c8", "#ffd23b", "#ffa62b", "#f2652b", "#c8303a"];
/** Cool colors, top to bottom. */
export const ICE_BANDS = ["#f2fbff", "#8fe3ff", "#3fa9f5", "#2f6fd6", "#3a3aa8"];

const OUTLINE = "#160c22";
const SHADOW = "#4a1d5c";
const OUTLINE_PX = 2;
const SHADOW_PX = 4;
const LINE_GAP = 6;
/** Press Start 2P letters fill the top 7/8 of their size. */
const GLYPH = 7 / 8;

let logoCount = 0;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Every pixel either fully there or fully gone, so no soft edges survive. */
function crisp(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i]! >= 128 ? 255 : 0;
  ctx.putImageData(img, 0, 0);
}

/** The letters filled with one color. */
function tinted(shape: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [c, ctx] = canvas(shape.width, shape.height);
  ctx.drawImage(shape, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * Draws the lines as a logo and adds it as a texture. Returns the texture key
 * (remove it with `scene.textures.remove` when the screen closes).
 */
export function makeLogo(scene: Phaser.Scene, lines: LogoLine[], bands: string[] = FIRE_BANDS): string {
  const pad = OUTLINE_PX + SHADOW_PX;
  const [, measure] = canvas(1, 1);
  const widths = lines.map((l) => {
    measure.font = `${l.size}px ${FONT_FAMILY}`;
    return Math.ceil(measure.measureText(l.text).width);
  });
  const w = Math.max(...widths) + pad * 2;
  const h = lines.reduce((sum, l) => sum + l.size, 0) + LINE_GAP * (lines.length - 1) + pad * 2;

  // 1. The letters' shapes.
  const [shape, sctx] = canvas(w, h);
  sctx.fillStyle = "#ffffff";
  sctx.textBaseline = "top";
  let y = pad;
  const tops: number[] = [];
  lines.forEach((l, i) => {
    sctx.font = `${l.size}px ${FONT_FAMILY}`;
    sctx.fillText(l.text, Math.round((w - widths[i]!) / 2), y);
    tops.push(y);
    y += l.size + LINE_GAP;
  });
  crisp(sctx, w, h);

  // 2. Flat bands of color, one set per line, then keep only the parts inside the letters.
  const [fill, fctx] = canvas(w, h);
  lines.forEach((l, i) => {
    const bandH = (l.size * GLYPH) / bands.length;
    bands.forEach((color, b) => {
      fctx.fillStyle = color;
      const top = Math.round(tops[i]! + b * bandH);
      const bottom = b === bands.length - 1 ? tops[i]! + l.size + LINE_GAP : Math.round(tops[i]! + (b + 1) * bandH);
      fctx.fillRect(0, top, w, bottom - top);
    });
  });
  fctx.globalCompositeOperation = "destination-in";
  fctx.drawImage(shape, 0, 0);

  // 3. Shadow, then outline, then the colored letters on top.
  const [out, octx] = canvas(w, h);
  const outline = tinted(shape, OUTLINE), shadow = tinted(shape, SHADOW);
  const ring = (img: HTMLCanvasElement, ox: number, oy: number) => {
    for (let dy = -OUTLINE_PX; dy <= OUTLINE_PX; dy++)
      for (let dx = -OUTLINE_PX; dx <= OUTLINE_PX; dx++) octx.drawImage(img, ox + dx, oy + dy);
  };
  ring(shadow, SHADOW_PX, SHADOW_PX);
  ring(outline, 0, 0);
  octx.drawImage(fill, 0, 0);

  const key = `logo-${logoCount++}`;
  scene.textures.addCanvas(key, out);
  return key;
}

/** Shows a logo texture at scale 2, centered on x with its top at y, on a whole pixel. */
export function addLogo(scene: Phaser.Scene, key: string, x: number, y: number): Phaser.GameObjects.Image {
  const image = scene.add.image(0, 0, key).setOrigin(0).setScale(2).setDepth(10);
  return image.setPosition(Math.round((x - image.width) / 2) * 2, Math.round(y / 2) * 2);
}
