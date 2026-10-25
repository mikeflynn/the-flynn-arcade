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

/** Spin a "#rrggbb" color around the color wheel by `deg` degrees (HSL). Grays stay gray. */
export function rotateHue(color: string, deg: number): string {
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
  h = (((h + deg) % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r1!)}${to(g1!)}${to(b1!)}`;
}
