export interface Range {
  min: number;
  max: number;
}

export type Limits<T> = { [K in keyof T]?: Range };

/**
 * Returns a copy of `values` with every number that has a limit kept inside
 * that limit. Anything out of range gets fixed, with a friendly message, so a
 * typo in settings.ts can't break the game.
 */
export function clampSettings<T extends object>(
  values: T,
  limits: Limits<T>,
  warn: (message: string) => void = console.warn,
): T {
  const result = { ...values };
  for (const key of Object.keys(limits) as (keyof T)[]) {
    const limit = limits[key];
    if (!limit) continue;
    const value = values[key] as unknown;
    const name = String(key);
    if (typeof value !== "number" || Number.isNaN(value)) {
      warn(`⚠️ ${name} should be a number from ${limit.min} to ${limit.max}. Using ${limit.min} for now.`);
      result[key] = limit.min as T[keyof T];
    } else if (value < limit.min || value > limit.max) {
      const fixed = Math.min(limit.max, Math.max(limit.min, value));
      const tooWhat = value < limit.min ? "small" : "big";
      warn(`⚠️ ${name} = ${value} is too ${tooWhat}! Using ${fixed} instead (try ${limit.min} to ${limit.max}).`);
      result[key] = fixed as T[keyof T];
    }
  }
  return result;
}
