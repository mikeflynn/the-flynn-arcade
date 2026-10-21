import type { Range } from "@web-games/settings";

/** Safe ranges for settings.ts. Out-of-range values get fixed with a friendly message. */
export const settingLimits: Record<string, Range> = {
  sunburstSecondsPerTurn: { min: 10, max: 300 },
  speedLineSpeed: { min: 10, max: 300 },
  sparkleEveryMs: { min: 100, max: 3000 },
  attractDelayMs: { min: 5000, max: 300000 },
  attractStepMs: { min: 1000, max: 10000 },
  comingSoonCabinets: { min: 0, max: 5 },
  typeLettersPerSecond: { min: 5, max: 200 },
  musicVolume: { min: 0, max: 1 },
  sfxVolume: { min: 0, max: 1 },
};
