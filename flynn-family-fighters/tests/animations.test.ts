import { describe, expect, it } from "vitest";
import {
  animLength, bodyDims, DEFAULT_LOOK, groundOffset, normalizeLook, plantFeet, samplePose, skeleton, solvePose, STANCE, type Look,
} from "@web-games/rig";
import { ANIMS, specialTiming } from "../src/animations";
import { NORMAL_IDS } from "../src/fighter";
import { MOVE_TYPES, NORMALS } from "../src/moves";

// These read the kid files moves.ts and animations.ts as they are now, and only
// check what stays true after edits: every animation lasts exactly as long as
// its attack's numbers say, and every pose stands on the floor. How animFor
// picks animations is tested with frozen moves in animFor.test.ts.

/** How far below the ankle the floor sits (the foot), as in the rig's groundOffset. */
const FOOT_HEIGHT = 26;
const total = (a: { startup: number; active: number; recovery: number }) => a.startup + a.active + a.recovery;
const NAMES = Object.keys(ANIMS);
const JUMPS = ["jumpUp", "jumpFwd", "jumpBack"];
const JUMP_NORMALS = NORMAL_IDS.filter((id) => id.startsWith("j."));
const SPECIAL_TYPES = Object.keys(MOVE_TYPES);
const ATTACKS = [...NORMAL_IDS, ...SPECIAL_TYPES, "throw", "thrown"];

/** Every frame 0..len of an animation, as poses (what the baker samples). */
function framesOf(name: string) {
  const a = ANIMS[name]!;
  return Array.from({ length: animLength(a) + 1 }, (_, f) => samplePose(a, f, STANCE));
}

const LOOKS: [string, Look][] = [
  ["default", DEFAULT_LOOK],
  ["short feminine", normalizeLook({ body: "feminine", height: 0.85, build: "lean" }, () => {})],
  ["tall big", normalizeLook({ height: 1.15, build: "big", muscle: 1.4 }, () => {})],
];

describe("attack animations match the frame data", () => {
  it.each([...NORMAL_IDS])("%s lasts startup + active + recovery", (id) => {
    expect(animLength(ANIMS[id]!)).toBe(total(NORMALS[id]));
  });

  it.each(SPECIAL_TYPES)("special %s lasts startup + active + recovery (strength 1)", (type) => {
    expect(animLength(ANIMS[type]!)).toBe(total(specialTiming(type, MOVE_TYPES[type], () => {})));
  });

  it("attacks don't loop", () => {
    for (const name of ATTACKS) expect(ANIMS[name]!.loop, name).toBe(false);
  });
});

describe("the animation list", () => {
  it("has every animation the game asks for", () => {
    const wanted = [
      "idle", "walkF", "walkB", "crouch", "jumpSquat", "jumpUp", "jumpFwd", "jumpBack",
      ...ATTACKS,
      "guard", "guardCrouch", "blockStand", "blockCrouch", "hitHigh", "hitLow", "knockdown", "getup",
      "dizzy", "ko", "win", "lose", "intro",
    ];
    for (const name of wanted) expect(ANIMS[name], name).toBeDefined();
  });

  it("idle, walking, guarding and crouching loop", () => {
    for (const name of ["idle", "walkF", "walkB", "guard", "guardCrouch", "crouch", "dizzy"]) {
      expect(ANIMS[name]!.loop, name).toBe(true);
    }
  });

  it("every animation has keys and a positive length", () => {
    for (const name of NAMES) expect(animLength(ANIMS[name]!), name).toBeGreaterThan(0);
  });
});

describe("poses", () => {
  const d = bodyDims(DEFAULT_LOOK);
  const bones = skeleton(d);

  it("every pose gives finite joint positions", () => {
    for (const name of NAMES) {
      for (const pose of framesOf(name)) {
        const world = solvePose(bones, plantFeet(bones, pose, d));
        for (const [joint, w] of Object.entries(world)) {
          expect(Number.isFinite(w.x) && Number.isFinite(w.y) && Number.isFinite(w.r), `${name} ${joint}`).toBe(true);
        }
      }
    }
  });

  it("jumps are in the air after the squat, and jump attacks are in the air the whole time", () => {
    for (const name of JUMPS) {
      const [squat, ...air] = ANIMS[name]!.keys;
      expect(squat!.pose.plant, `${name} squat`).not.toBe("");
      for (const k of air) expect(k.pose.plant, name).toBe("");
    }
    for (const id of JUMP_NORMALS) for (const k of ANIMS[id]!.keys) expect(k.pose.plant, id).toBe("");
  });

  it.each(LOOKS)("planted feet land on the floor (%s)", (_label, look) => {
    const dims = bodyDims(look);
    const rig = skeleton(dims);
    for (const name of NAMES) {
      framesOf(name).forEach((pose, frame) => {
        const plant = typeof pose.plant === "string" ? pose.plant : "fb";
        if (plant === "") return;
        const world = solvePose(rig, plantFeet(rig, pose, dims));
        // The floor the baker stands the sprite on: the lowest ankle of BOTH legs (groundOffset minus the foot).
        // A planted ankle above it floats; a lifted foot below it would sink through the floor.
        const floor = groundOffset(world) - FOOT_HEIGHT;
        for (const side of plant) {
          expect(Math.abs(world[`${side}Ft`]!.y - floor), `${name} frame ${frame} (${side} foot)`).toBeLessThanOrEqual(1);
        }
      });
    }
  });
});
