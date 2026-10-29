export const INK = 0x160c22;
export const SHADE = 0x2c1458;
export const HILITE = 0xfff0c8;

/** Parse "#rrggbb" (or "rrggbb"); anything else gives the fallback. */
export function hex(s: unknown, fallback: number): number {
  if (typeof s !== "string") return fallback;
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  return m ? parseInt(m[1]!, 16) : fallback;
}

/** Blend color a toward b by f (0 = a, 1 = b). */
export function mix(a: number, b: number, f: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Shadows lean purple. */
export const darken = (c: number, f = 0.3): number => mix(c, SHADE, f);
/** Highlights lean warm. */
export const lighten = (c: number, f = 0.3): number => mix(c, HILITE, f);
/** An outline is a dark version of the color it surrounds. */
export const outlineOf = (c: number): number => mix(c, INK, 0.74);
/** Far limbs: same colors, a step darker. */
export const backTint = (c: number): number => mix(c, 0x3a2a66, 0.26);

type Hsl = { h: number; s: number; l: number };

/** "#rrggbb" to hue (0-360), saturation and lightness (0-1), plus chroma: how far it is from a gray (0-1). */
function toHsl(color: string): Hsl & { chroma: number } {
  const n = hex(color, 0);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l, chroma: d };
}

function fromHsl({ h, s, l }: Hsl): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, "0");
  return `#${to(r1!)}${to(g1!)}${to(b1!)}`;
}

/** Spin a "#rrggbb" color around the color wheel by `deg` degrees (HSL). Grays stay gray. */
export function rotateHue(color: string, deg: number): string {
  const c = toHsl(color);
  return fromHsl({ ...c, h: c.h + deg });
}

/** Colors closer to a gray than this (chroma, 0-1) are "black, white or gray" to alternateColor. */
const GRAYISH = 0.2;

/**
 * A clearly different version of a "#rrggbb" color, for a mirror match's
 * second outfit. Colorful ones spin to the opposite side of the color wheel.
 * Black, white, gray and nearly-gray ones look the same after a spin, so their
 * lightness moves halfway round instead (black becomes gray, gray becomes
 * black, white becomes gray). Doing it twice gives the color back.
 */
export function alternateColor(color: string): string {
  const c = toHsl(color);
  if (c.chroma >= GRAYISH) return fromHsl({ ...c, h: c.h + 180 });
  return fromHsl({ ...c, l: (c.l + 0.5) % 1 });
}
