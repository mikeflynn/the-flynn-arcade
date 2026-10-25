// The fight runs in fixed steps: 60 per second (faster with gameSpeed), no
// matter how fast the screen refreshes. Each browser frame we add the time that
// passed and run as many whole steps as fit.

/** gameSpeed 1 to 4: how many times faster than 60 steps a second. */
export const SPEED_MULTIPLIERS = [1, 1.15, 1.3, 1.5] as const;

/** A slow computer never runs more than this many steps in one frame, so it can't fall further and further behind. */
export const MAX_STEPS_PER_FRAME = 5;

/** How long one step lasts in milliseconds at this game speed (1 to 4). */
export function stepMs(speed: number): number {
  const index = Number.isFinite(speed) ? Math.min(4, Math.max(1, Math.round(speed))) - 1 : 0;
  return 1000 / (60 * SPEED_MULTIPLIERS[index]!);
}

/**
 * Adds `dtMs` to the time saved up in `accMs` and works out how many steps to run.
 * Returns the steps and the time left over for next frame. Past the cap of
 * MAX_STEPS_PER_FRAME the extra time is dropped (only the part of a step stays).
 */
export function stepsToRun(accMs: number, dtMs: number, speed: number): { steps: number; accMs: number } {
  const step = stepMs(speed);
  const total = Math.max(0, (Number.isFinite(accMs) ? accMs : 0) + (Number.isFinite(dtMs) ? dtMs : 0));
  const whole = Math.floor(total / step);
  const steps = Math.min(whole, MAX_STEPS_PER_FRAME);
  return { steps, accMs: total - whole * step };
}
