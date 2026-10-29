import type { Range } from "@web-games/settings";

/** Safe ranges for settings.ts. Out-of-range values get fixed with a friendly message. */
export const settingLimits: Record<string, Range> = {
  tickerSecondsPerLoop: { min: 5, max: 120 },
  attractDelayMs: { min: 5000, max: 300000 },
  attractStepMs: { min: 2000, max: 15000 },
  comingSoonPanels: { min: 0, max: 5 },
  typeLettersPerSecond: { min: 5, max: 200 },
  musicVolume: { min: 0, max: 1 },
  sfxVolume: { min: 0, max: 1 },
};
