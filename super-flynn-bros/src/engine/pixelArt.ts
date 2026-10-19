import type Phaser from "phaser";

/** Maps one character to one color, e.g. { H: "#f6d860" } for blonde hair. */
export type Palette = Record<string, string>;

export interface ParsedGrid {
  width: number;
  height: number;
  /** Row by row, left to right. null = see-through. */
  pixels: (string | null)[];
}

export interface ParsedSheet {
  width: number;
  height: number;
  frames: ParsedGrid[];
  warnings: string[];
}

/** Characters that mean "see-through". */
export const TRANSPARENT = new Set([".", " "]);

/** Color for characters missing from the palette: bright pink, so mistakes are easy to spot. */
export const UNKNOWN_COLOR = "#ff00ff";

/**
 * Turns frames of text art into pixels. Every frame gets the same size (the
 * biggest one). Short frames get see-through rows added at the TOP, so feet
 * stay on the ground.
 */
export function parseFrames(
  frames: readonly (readonly string[])[],
  colors: Palette,
  name: string,
): ParsedSheet {
  const warnings: string[] = [];
  const width = Math.max(1, ...frames.flatMap((frame) => frame.map((row) => row.length)));
  const height = Math.max(1, ...frames.map((frame) => frame.length));
  const unknown = new Set<string>();

  const parsed = frames.map((rows, frameIndex) => {
    const label = frames.length > 1 ? `${name} (frame ${frameIndex + 1})` : name;
    rows.forEach((row, i) => {
      if (row.length !== width) {
        warnings.push(
          `${label}: row ${i + 1} is ${row.length} pixels wide, but the widest row is ${width}. Filling the gap with see-through pixels.`,
        );
      }
    });
    const padTop = height - rows.length;
    const pixels: (string | null)[] = [];
    for (let y = 0; y < height; y++) {
      const row = rows[y - padTop] ?? "";
      for (let x = 0; x < width; x++) {
        const ch = row[x] ?? ".";
        if (TRANSPARENT.has(ch)) {
          pixels.push(null);
        } else if (colors[ch] === undefined) {
          unknown.add(ch);
          pixels.push(UNKNOWN_COLOR);
        } else {
          pixels.push(colors[ch]);
        }
      }
    }
    return { width, height, pixels };
  });

  if (unknown.size > 0) {
    const list = [...unknown].map((ch) => `"${ch}"`).join(", ");
    warnings.push(`${name}: there's no color for ${list}. Add it to the colors list! Showing pink for now.`);
  }
  return { width, height, frames: parsed, warnings };
}

/**
 * A kid's custom PNG can be a strip of frames side by side, or one picture
 * used for every frame. Returns how many frames the picture holds (count or 1),
 * picking whichever shape is closer.
 */
export function stripFrameCount(
  sourceWidth: number,
  sourceHeight: number,
  artWidth: number,
  artHeight: number,
  count: number,
): number {
  if (count <= 1) return 1;
  const aspect = sourceWidth / sourceHeight;
  const single = artWidth / artHeight;
  const strip = (artWidth * count) / artHeight;
  return Math.abs(Math.log(aspect / strip)) < Math.abs(Math.log(aspect / single)) ? count : 1;
}

/** Draws parsed frames side by side into a new texture. Frame i is named i. */
export function addTextureFromFrames(
  scene: Phaser.Scene,
  key: string,
  frames: ParsedGrid[],
  width: number,
  height: number,
): void {
  const texture = scene.textures.createCanvas(key, width * frames.length, height);
  if (!texture) return;
  const ctx = texture.getContext();
  frames.forEach((frame, i) => {
    frame.pixels.forEach((color, p) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(i * width + (p % width), Math.floor(p / width), 1, 1);
    });
    texture.add(i, 0, i * width, 0, width, height);
  });
  texture.refresh();
}

/** Adds frames 0..count-1 to a loaded PNG override. */
function usePngOverride(scene: Phaser.Scene, key: string, count: number, artWidth: number, artHeight: number): void {
  const texture = scene.textures.get(key);
  if (texture.has("0")) return;
  const source = texture.getSourceImage() as HTMLImageElement;
  const frames = stripFrameCount(source.width, source.height, artWidth, artHeight, count);
  const frameWidth = Math.floor(source.width / frames);
  for (let i = 0; i < count; i++) {
    const slot = frames === 1 ? 0 : i;
    texture.add(i, 0, slot * frameWidth, 0, frameWidth, source.height);
  }
}

/**
 * Builds a sprite sheet from text art. If a PNG with the same key was already
 * loaded (a kid's custom picture in public/assets/), that wins instead.
 * Returns the text art's size, which sprites use as their on-screen size.
 */
export function makeSpriteSheet(
  scene: Phaser.Scene,
  key: string,
  frames: readonly (readonly string[])[],
  colors: Palette,
  warn: (message: string) => void = console.warn,
): { width: number; height: number } {
  const sheet = parseFrames(frames, colors, key);
  sheet.warnings.forEach((message) => warn(message));
  if (scene.textures.exists(key)) {
    usePngOverride(scene, key, frames.length, sheet.width, sheet.height);
  } else {
    addTextureFromFrames(scene, key, sheet.frames, sheet.width, sheet.height);
  }
  return { width: sheet.width, height: sheet.height };
}
