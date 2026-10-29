const HEX = /^#[0-9a-f]{6}$/i;

/** A "#rrggbb" color from settings.ts, or the fallback if it isn't one. */
export function safeColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && HEX.test(value)) return value;
  if (value !== undefined) console.warn(`🎨 "${String(value)}" isn't a "#rrggbb" color. Using ${fallback} instead.`);
  return fallback;
}
