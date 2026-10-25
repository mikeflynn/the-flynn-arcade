import { bodyDims } from "../body";
import { groundOffset, plantFeet, solvePose, type World } from "../kinematics";
import type { Look } from "../look";
import type { PaintMode } from "../paint";
import type { ShapeName } from "../parts/index";
import { flatFeet, heldFrames, samplePose, type Animation, type Pose } from "../pose";
import { LIMB_GROUPS, skeleton, type Bone } from "../skeleton";

/** One part to draw: which shape, where its joint is (art units, relative to the feet point), its angle (radians). */
export interface DrawStep { shape: ShapeName; x: number; y: number; r: number; back: boolean; mode: PaintMode }
/** One sprite to bake. `ground` is how far below the hips the feet point is. */
export interface FrameJob { key: string; world: World; ground: number; steps: DrawStep[] }
/** Per animation: which animation frames are baked and which job draws each one. */
export type FrameIndex = Record<string, { frame: number; job: number }[]>;

/** The fighting stance from the spike: the standing pose every other pose is measured against. */
export const STANCE: Pose = flatFeet({
  torso: 4, chest: 6, head: -8, fUA: -58, fFA: -100, fH: 0, bUA: -22, bFA: -118, bH: 0,
  fTh: -32, fSh: 38, bTh: 30, bSh: 22, hips: 0, knot: 0,
});

/** Which shape a bone draws in this pose: hands swap to palms or the armed fist, the head to its hit face. */
function shapeFor(bone: Bone, pose: Pose): ShapeName {
  if (bone.part === "hand") {
    if (pose.hand === "palm") return "palm";
    return bone.back ? "fist" : "fistArmed";
  }
  if (bone.part === "head" && pose.face === "hit") return "headHit";
  return bone.part;
}

/** Two poses with the same key look identical, so they share one baked sprite. */
function poseKey(pose: Pose): string {
  return Object.keys(pose)
    .sort()
    .map((k) => {
      const v = pose[k];
      return `${k}=${typeof v === "number" ? (Math.round(v * 10) / 10).toFixed(1) : v}`;
    })
    .join(",");
}

/**
 * Work out every sprite a fighter needs, without drawing anything: the held frames of
 * each animation, with identical poses sharing one job.
 */
export function planFrames(
  look: Look,
  anims: Record<string, Animation>,
  fps: 15 | 20 | 30,
  stance: Pose,
): { jobs: FrameJob[]; index: FrameIndex } {
  const d = bodyDims(look);
  const bones = skeleton(d);
  const byName = new Map(bones.map((b) => [b.name, b]));
  // Airborne poses (plant: "") hang from the standing pose's ground, so a jump lifts the whole body.
  const standGround = groundOffset(solvePose(bones, plantFeet(bones, stance, d)));
  const jobs: FrameJob[] = [];
  const byKey = new Map<string, number>();

  const jobFor = (pose: Pose): number => {
    const key = poseKey(pose);
    const known = byKey.get(key);
    if (known !== undefined) return known;
    const world = solvePose(bones, plantFeet(bones, pose, d));
    const ground = pose.plant === "" ? standGround : groundOffset(world);
    const steps: DrawStep[] = [];
    for (const group of LIMB_GROUPS) {
      // A limb is one shape: outline every piece first, then fill every piece, so no seams show inside it.
      const modes: PaintMode[] = group.length > 1 ? ["outline", "fill"] : ["both"];
      for (const mode of modes) {
        for (const name of group) {
          const bone = byName.get(name);
          const w = world[name];
          if (!bone || !w) continue;
          steps.push({ shape: shapeFor(bone, pose), x: w.x, y: w.y - ground, r: w.r, back: bone.back === true, mode });
        }
      }
    }
    byKey.set(key, jobs.length);
    jobs.push({ key, world, ground, steps });
    return jobs.length - 1;
  };

  const index: FrameIndex = {};
  for (const [name, anim] of Object.entries(anims)) {
    index[name] = heldFrames(anim, fps).map((frame) => ({ frame, job: jobFor(samplePose(anim, frame, stance)) }));
  }
  return { jobs, index };
}
