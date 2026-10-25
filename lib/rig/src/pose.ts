/** Joint angles in degrees by name, plus string fields like `plant`, `hand`, `face`. */
export type Pose = Record<string, number | string>;
export type Ease = "sine" | "out" | "linear" | "snap";
export interface Keyframe { pose: Pose; frames: number; ease: Ease }
export interface Animation { loop: boolean; keys: Keyframe[] }

const EASE: Record<Ease, (p: number) => number> = {
  sine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * p),
  out: (p) => 1 - (1 - p) * (1 - p),
  linear: (p) => p,
  snap: () => 1,
};

export function animLength(a: Animation): number {
  return a.keys.reduce((sum, k) => sum + k.frames, 0);
}

/** Looping animations wrap; non-looping ones hold their last frame. */
function localFrame(a: Animation, frame: number): number {
  const len = animLength(a);
  if (len <= 0) return 0;
  return a.loop ? ((frame % len) + len) % len : Math.min(Math.max(frame, 0), len - 1);
}

/**
 * The pose at an animation frame. Key 0 eases from the last key (looping) or from
 * `from` (non-looping; callers pass STANCE because SF2 frames snap).
 */
export function samplePose(a: Animation, frame: number, from: Pose): Pose {
  const keys = a.keys;
  if (keys.length === 0) return { ...from };
  let t = a.loop ? localFrame(a, frame) : Math.max(frame, 0);
  let i = 0;
  while (i < keys.length - 1 && t >= keys[i].frames) { t -= keys[i].frames; i++; }
  const prev = i === 0 ? (a.loop ? keys[keys.length - 1].pose : from) : keys[i - 1].pose;
  const key = keys[i];
  const p = key.ease === "snap" || key.frames <= 0 ? 1 : EASE[key.ease](Math.min(1, t / key.frames));
  const out: Pose = {};
  for (const name in key.pose) {
    const v = key.pose[name];
    if (typeof v === "string") { out[name] = v; continue; }
    const before = typeof prev[name] === "number" ? (prev[name] as number) : 0;
    out[name] = before + (v - before) * p;
  }
  return out;
}

/** Fills the feet so they stay flat on the floor: foot = -(thigh + shin). */
export function flatFeet(p: Pose): Pose {
  const n = (k: string) => (typeof p[k] === "number" ? (p[k] as number) : 0);
  const out: Pose = { ...p };
  if (out.fFt === undefined) out.fFt = -(n("fTh") + n("fSh"));
  if (out.bFt === undefined) out.bFt = -(n("bTh") + n("bSh"));
  return out;
}

/** Frames that get baked: every (60 / fps)th frame plus each key's first frame. */
export function heldFrames(a: Animation, fps: 15 | 20 | 30): number[] {
  const step = 60 / fps, len = animLength(a), set = new Set<number>();
  for (let f = 0; f < len; f += step) set.add(f);
  let start = 0;
  for (const k of a.keys) { if (k.frames > 0) set.add(start); start += k.frames; }
  return [...set].sort((x, y) => x - y);
}

/** The latest held frame at or before `frame` (after looping/holding like samplePose). */
export function shownFrame(a: Animation, held: number[], frame: number): number {
  const f = localFrame(a, frame);
  let shown = held[0] ?? 0;
  for (const h of held) { if (h <= f) shown = h; else break; }
  return shown;
}
