/**
 * Show-off mode's timer. After `delayMs` with nobody pressing anything it
 * becomes active and asks to move on to the next game every `stepMs`.
 * Times are milliseconds from any clock (the browser's frame time).
 */
export class AttractClock {
  private lastInput: number;
  private nextStep = 0;
  private on = false;

  constructor(
    private readonly delayMs: number,
    private readonly stepMs: number,
    now: number,
  ) {
    this.lastInput = now;
  }

  get active(): boolean {
    return this.on;
  }

  /** Someone pressed something: stop showing off and start waiting again. */
  poke(now: number): void {
    this.lastInput = now;
    this.on = false;
  }

  /** True when show-off mode should move to the next game now. */
  tick(now: number): boolean {
    if (!this.on) {
      if (now - this.lastInput <= this.delayMs) return false;
      this.on = true;
      this.nextStep = now + this.stepMs;
      return true;
    }
    if (now < this.nextStep) return false;
    this.nextStep = now + this.stepMs;
    return true;
  }
}
