import type { Range } from "@web-games/settings";

/** Safe ranges for everything in settings.ts. Out-of-range values get clamped. */
export const settingLimits: Record<string, Range> = {
  gravity: { min: 400, max: 1500 },
  maxFallSpeed: { min: 300, max: 800 },
  acceleration: { min: 300, max: 2000 },
  deceleration: { min: 200, max: 2000 },
  airControl: { min: 0.3, max: 1 },
  jumpCut: { min: 0.2, max: 1 },
  hearts: { min: 1, max: 10 },
  maxHearts: { min: 1, max: 10 },
  safeTimeMs: { min: 500, max: 4000 },
  knockback: { min: 0, max: 300 },
  respawnDelayMs: { min: 0, max: 5000 },
  musicVolume: { min: 0, max: 1 },
  sfxVolume: { min: 0, max: 1 },
  coyoteTimeMs: { min: 0, max: 300 },
  jumpBufferMs: { min: 0, max: 300 },
};
