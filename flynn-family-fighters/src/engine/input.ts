// Reads button presses and joystick motions (quarter-circles and friends).
// Pure and frame-counted: no Phaser, no randomness, no DOM.

/** One bit per button. An InputFrame is these bits OR-ed together. */
export const B = {
  UP: 1,
  DOWN: 2,
  LEFT: 4,
  RIGHT: 8,
  LP: 16,
  MP: 32,
  HP: 64,
  LK: 128,
  MK: 256,
  HK: 512,
} as const;

export type InputFrame = number;

/** Numpad notation relative to facing: 6 = forward, 4 = back, 2 = down, 8 = up, 5 = neutral. */
export type Dir = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const PUNCHES: number = B.LP | B.MP | B.HP;

/** Turn raw bits into a numpad direction. Facing 1 = looking right, -1 = looking left. */
export function toDir(frame: InputFrame, facing: 1 | -1): Dir {
  const up = (frame & B.UP) !== 0;
  const down = (frame & B.DOWN) !== 0;
  const left = (frame & B.LEFT) !== 0;
  const right = (frame & B.RIGHT) !== 0;
  // Opposite keys cancel out, like on a real stick.
  const v = up === down ? 0 : up ? 1 : -1;
  const rawH = left === right ? 0 : right ? 1 : -1;
  const h = rawH * facing; // 1 = forward, -1 = back
  if (v === 0) return h === 0 ? 5 : h > 0 ? 6 : 4;
  if (v < 0) return h === 0 ? 2 : h > 0 ? 3 : 1;
  return h === 0 ? 8 : h > 0 ? 9 : 7;
}

const CAPACITY = 90;
const CHARGE_FRAMES = 45;
const CHARGE_RELEASE_WINDOW = 10;
const MASH_PRESSES = 5;
const MASH_WINDOW = 30;

const BACK: Dir[] = [4, 1, 7];
const FORWARD: Dir[] = [6, 3, 9];
const DOWNS: Dir[] = [1, 2, 3];
const UPS: Dir[] = [7, 8, 9];

/** The last 90 frames of input, newest last (a ring buffer). */
export class InputHistory {
  private readonly frames = new Array<InputFrame>(CAPACITY).fill(0);
  private readonly dirs = new Array<Dir>(CAPACITY).fill(5);
  private head = 0; // index of the newest frame
  private count = 0;

  push(frame: InputFrame, facing: 1 | -1): void {
    this.head = (this.head + 1) % CAPACITY;
    this.frames[this.head] = frame;
    this.dirs[this.head] = toDir(frame, facing);
    this.count = Math.min(this.count + 1, CAPACITY);
  }

  /** Raw bits from n frames ago (0 = now). Older than the history = nothing held. */
  private frameAgo(n: number): InputFrame {
    if (n < 0 || n >= this.count) return 0;
    return this.frames[(this.head - n + CAPACITY) % CAPACITY];
  }

  /** True if any of these buttons went down this frame (not held from before). */
  pressed(bits: number): boolean {
    return (this.frameAgo(0) & bits & ~this.frameAgo(1)) !== 0;
  }

  /** The direction n frames ago (0 = now). Before the history starts it is neutral. */
  dirAgo(n: number): Dir {
    if (n < 0 || n >= this.count) return 5;
    return this.dirs[(this.head - n + CAPACITY) % CAPACITY];
  }

  /** Consecutive frames, ending now, where the direction is one of dirs. */
  heldFor(dirs: Dir[]): number {
    return this.runStartingAt(0, dirs);
  }

  /** Consecutive frames going back in time from n frames ago. */
  runStartingAt(n: number, dirs: Dir[]): number {
    let len = 0;
    while (n + len < this.count && dirs.includes(this.dirAgo(n + len))) len++;
    return len;
  }

  /** How many separate presses of these buttons happened in the last `window` frames. */
  pressCount(bits: number, window: number): number {
    let presses = 0;
    for (let i = 0; i < window && i < this.count; i++) {
      if ((this.frameAgo(i) & bits & ~this.frameAgo(i + 1)) !== 0) presses++;
    }
    return presses;
  }

  /** The buttons (of these bits) that went down on the newest frame with a press in the last `window` frames, or 0. */
  newestPress(bits: number, window: number): number {
    for (let i = 0; i < window && i < this.count; i++) {
      const down = this.frameAgo(i) & bits & ~this.frameAgo(i + 1);
      if (down !== 0) return down;
    }
    return 0;
  }
}

export type Motion = "qcf" | "qcb" | "dp" | "chargeBF" | "chargeDU" | "mash" | "360";
export const MOTIONS: readonly Motion[] = ["qcf", "qcb", "dp", "chargeBF", "chargeDU", "mash", "360"];

/** Do these directions show up in order (other directions may sit in between)? */
function hasSequence(h: InputHistory, seq: Dir[], window: number): boolean {
  let next = 0;
  for (let ago = Math.min(window, CAPACITY) - 1; ago >= 0; ago--) {
    if (h.dirAgo(ago) === seq[next]) {
      next++;
      if (next === seq.length) return true;
    }
  }
  return false;
}

/** Was a `from` direction held long enough, then released within the last few frames, with `to` held now? */
function hasCharge(h: InputHistory, from: Dir[], to: Dir[]): boolean {
  if (!to.includes(h.dirAgo(0))) return false;
  for (let ago = 0; ago < CHARGE_RELEASE_WINDOW; ago++) {
    if (h.runStartingAt(ago, from) >= CHARGE_FRAMES) return true;
  }
  return false;
}

/** Does the recent input draw this motion? The button is checked separately by the caller. */
export function matchMotion(h: InputHistory, motion: Motion, window: number): boolean {
  switch (motion) {
    case "qcf":
      return hasSequence(h, [2, 3, 6], window);
    case "qcb":
      return hasSequence(h, [2, 1, 4], window);
    case "dp":
      return hasSequence(h, [6, 2, 3], window);
    case "chargeBF":
      return hasCharge(h, BACK, FORWARD);
    case "chargeDU":
      return hasCharge(h, DOWNS, UPS);
    case "mash":
      return h.pressCount(PUNCHES, MASH_WINDOW) >= MASH_PRESSES;
    case "360": {
      const span = Math.min(window + 10, CAPACITY);
      const seen = new Set<Dir>();
      for (let ago = 0; ago < span; ago++) seen.add(h.dirAgo(ago));
      return [4, 2, 6, 8].every((d) => seen.has(d as Dir));
    }
    default:
      return false; // a motion we don't know (a typo in moves.ts) never matches
  }
}
