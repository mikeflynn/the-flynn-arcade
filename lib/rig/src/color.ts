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
