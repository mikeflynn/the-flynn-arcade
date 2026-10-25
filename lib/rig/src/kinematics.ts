import type { BodyDims } from "./body";
import type { Bone } from "./skeleton";

/** Joint angles in degrees by name (plus `plant`). Task 4 moves this to pose.ts. */
export type Pose = Record<string, number | string>;
export type World = Record<string, { x: number; y: number; r: number }>;

const RAD = Math.PI / 180;

const num = (v: number | string | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Forward kinematics: where every bone's joint is, and which way it points (radians). */
export function solvePose(bones: Bone[], pose: Pose): World {
  const byName = new Map(bones.map((b) => [b.name, b]));
  const world: World = {};
  const place = (b: Bone): World[string] => {
    const done = world[b.name];
    if (done) return done;
    const r = num(pose[b.angleKey ?? b.name]) * RAD;
    const parent = b.parent === null ? undefined : byName.get(b.parent);
    if (!parent) return (world[b.name] = { x: b.at.x, y: b.at.y, r });
    const p = place(parent), c = Math.cos(p.r), s = Math.sin(p.r);
    return (world[b.name] = {
      x: p.x + b.at.x * c - b.at.y * s,
      y: p.y + b.at.x * s + b.at.y * c,
      r: p.r + r,
    });
  };
  bones.forEach(place);
  return world;
}

type Leg = [thigh: string, shin: string, foot: string];
const LEGS: Record<string, Leg> = {
  f: ["fTh", "fSh", "fFt"],
  b: ["bTh", "bSh", "bFt"],
};

/**
 * Bend each planted leg (two-bone IK) so its ankle lands on the floor, the lowest planted ankle.
 * `pose.plant` is "fb" (default), "f", "b" or "" (airborne: nothing changes).
 */
export function plantFeet(bones: Bone[], pose: Pose, d: BodyDims): Pose {
  const plant = typeof pose.plant === "string" ? pose.plant : "fb";
  const legs = [...plant].map((s) => LEGS[s]).filter((l): l is Leg => Boolean(l));
  if (!legs.length) return pose;
  const W = solvePose(bones, pose), R = 180 / Math.PI, out: Pose = { ...pose };
  const floor = Math.max(...legs.map(([, , ft]) => W[ft].y));
  const l1 = d.thighL - 8, l2 = d.shinL - 10, reach = l1 + l2 - 0.5;
  for (const [th, sh, ft] of legs) {
    const H = W[th], parentR = H.r - num(pose[th]) * RAD;
    let dx = W[ft].x - H.x;
    const dy = floor - H.y;
    if (Math.hypot(dx, dy) > reach) dx = Math.sign(dx || 1) * Math.sqrt(Math.max(0, reach * reach - dy * dy));
    const D = Math.max(Math.abs(l1 - l2) + 1, Math.min(reach, Math.hypot(dx, dy)));
    const alpha = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D))));
    const r1 = Math.atan2(-dx, dy) - alpha; // knee bends toward the opponent
    const kx = H.x - l1 * Math.sin(r1), ky = H.y + l1 * Math.cos(r1);
    const r2 = Math.atan2(-(H.x + dx - kx), H.y + dy - ky);
    out[th] = (r1 - parentR) * R;
    out[sh] = (r2 - r1) * R;
    out[ft] = -r2 * R; // foot stays flat
  }
  return out;
}

/** The lowest ankle plus the foot's height: how far down the ground is from the hips. */
export function groundOffset(world: World): number {
  return Math.max(world.fFt.y, world.bFt.y) + 26;
}
