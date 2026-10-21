import { cabinetColors } from "./cabinet";

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The box covering every `char` in some text art (e.g. the cabinet screen "G"), or null. */
export function findRegion(art: readonly string[], char: string): Region | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  art.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== char) return;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    });
  });
  return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Makes a "#rrggbb" color darker (amount 0 to 1). */
export function shade(hex: string, amount: number): string {
  const channel = (i: number) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** The full color list for one game's cabinet. */
export function cabinetPalette(primary: string, secondary: string): Record<string, string> {
  return { ...cabinetColors, P: primary, p: shade(primary, 0.3), S: secondary, s: shade(secondary, 0.3) };
}
