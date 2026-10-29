const HEX = /^#[0-9a-f]{6}$/i;

/** A "#rrggbb" color from settings.ts, or the fallback if it isn't one. */
export function safeColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && HEX.test(value)) return value;
  if (value !== undefined) console.warn(`🎨 "${String(value)}" isn't a "#rrggbb" color. Using ${fallback} instead.`);
  return fallback;
}

/**
 * A list of words from settings.ts. Plain words written without the [ ] still
 * work (they become a one-item list), and an empty list uses the fallback.
 */
export function textList(value: unknown, fallback: string[]): string[] {
  const list = Array.isArray(value) ? value.map(String) : value === undefined || value === null ? [] : [String(value)];
  return list.length > 0 ? list : fallback;
}
