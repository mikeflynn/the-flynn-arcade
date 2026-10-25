import { describe, expect, it } from "vitest";
import {
  animLength, bodyDims, DEFAULT_LOOK, groundOffset, normalizeLook, plantFeet, samplePose, skeleton, solvePose, STANCE, type Look,
} from "@web-games/rig";
import { ANIMS, animFor } from "../src/animations";
import { normalizeFighter, NORMAL_IDS, type Fighter } from "../src/fighter";
import { B, type InputFrame } from "../src/engine/input";
import { createMatch, stepMatch } from "../src/engine/match";
import type { FState, FighterState, MatchState } from "../src/engine/types";
import { MOVE_TYPES, NORMALS } from "../src/moves";
import { mySettings } from "../src/settings";

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
    const data = MOVE_TYPES[type]!.attack(1, { type, name: "TEST" });
    expect(animLength(ANIMS[type]!)).toBe(total(data));
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

function fighter(): Fighter {
  return normalizeFighter({ name: "T", look: {}, specials: [{ type: "fireball", name: "BOOM" }] }, "t", SPECIAL_TYPES, () => {})!;
}

/** A match past the intro, with the fighters close together. */
function newMatch(): MatchState {
  const s = createMatch({ p1: fighter(), p2: fighter(), settings: mySettings, seed: 1 });
  for (let i = 0; i < 90; i++) stepMatch(s, [0, 0]);
  s.fighters[0].x = 400;
  s.fighters[1].x = 500;
  return s;
}

const run = (s: MatchState, n: number, p1: InputFrame = 0) => {
  for (let i = 0; i < n; i++) stepMatch(s, [p1, 0]);
};

describe("animFor", () => {
  // A Record, so TypeScript complains here if a new state is added and not tested.
  const STATES: Record<FState, true> = {
    idle: true, walkF: true, walkB: true, crouch: true, guard: true, jumpSquat: true, jump: true, attack: true,
    hitstun: true, blockstun: true, knockdown: true, getup: true, dizzy: true, throwing: true, thrown: true, ko: true, win: true,
  };

  /** stateFrame at the start, the middle, the end and well past the end of a 20-frame state. */
  const STATE_FRAMES = [0, 10, 20, 35, 500];

  function variants(state: FState): FighterState[] {
    const out: FighterState[] = [];
    for (const crouching of [false, true]) {
      for (const jumpDir of [-1, 0, 1] as const) {
        for (const stateFrame of STATE_FRAMES) {
          for (const lastHitLevel of ["high", "low"] as const) {
            const f = newMatch().fighters[0];
            Object.assign(f, { state, crouching, jumpDir, lastHitLevel, airborne: state === "jump", stateFrame, stateLength: 20 });
            out.push(f);
          }
        }
      }
    }
    return out;
  }

  /** Every attack (normals and specials, on the ground and rising), at frames from 0 to well past its end. */
  function attackVariants(): FighterState[] {
    const out: FighterState[] = [];
    const attacks = [
      ...NORMAL_IDS.map((id) => ({ data: { ...NORMALS[id], level: "mid" as const } })),
      ...SPECIAL_TYPES.map((type) => ({
        data: { ...MOVE_TYPES[type]!.attack(1, { type, name: "X" }), level: "mid" as const },
        special: { type, name: "X" },
      })),
    ];
    for (const a of attacks) {
      const len = total(a.data);
      for (const frame of [0, Math.floor(len / 2), len, len + 1, len + 200]) {
        for (const inAir of [false, true]) {
          const f = newMatch().fighters[0];
          Object.assign(f, { state: "attack", airborne: inAir, attack: { ...a, frame, hasHit: false, inAir } });
          out.push(f);
        }
      }
    }
    return out;
  }

  const inRange = (name: string, frame: number) => frame >= 0 && frame <= animLength(ANIMS[name]!);

  it.each(Object.keys(STATES) as FState[])("%s maps to an animation that exists, at a frame inside it", (state) => {
    for (const f of [...variants(state), ...(state === "attack" ? attackVariants() : [])]) {
      const { name, frame } = animFor(f);
      expect(ANIMS[name], `${state} → ${name}`).toBeDefined();
      expect(inRange(name, frame), `${state} → ${name} frame ${frame} (stateFrame ${f.stateFrame}, attack frame ${f.attack?.frame})`).toBe(true);
    }
  });

  it("an attack plays its own animation at the attack's frame", () => {
    const f = newMatch().fighters[0];
    for (const id of NORMAL_IDS) {
      Object.assign(f, { state: "attack", attack: { data: { ...NORMALS[id], level: "mid" }, frame: 5, hasHit: false } });
      expect(animFor(f)).toEqual({ name: id, frame: 5 });
    }
  });

  it("a special plays its move type's animation", () => {
    const f = newMatch().fighters[0];
    for (const type of SPECIAL_TYPES) {
      const data = { ...MOVE_TYPES[type]!.attack(1, { type, name: "X" }), level: "mid" as const };
      Object.assign(f, { state: "attack", attack: { data, frame: 2, hasHit: false, special: { type, name: "X" } } });
      expect(animFor(f)).toEqual({ name: type, frame: Math.min(2, total(data)) }); // command-throw lasts 1 frame
    }
  });

  it("a rising special holds its strike in the air, then plays its recovery after landing", () => {
    const f = newMatch().fighters[0];
    const data = { ...MOVE_TYPES.uppercut!.attack(1, { type: "uppercut", name: "X" }), level: "mid" as const };
    Object.assign(f, { state: "attack", airborne: true, attack: { data, frame: 30, hasHit: true, inAir: true, special: { type: "uppercut", name: "X" } } });
    expect(animFor(f).frame).toBe(data.startup + data.active - 1);
  });

  it("jumps pick the animation for their direction", () => {
    const f = newMatch().fighters[0];
    Object.assign(f, { state: "jump", airborne: true, stateFrame: 7 });
    for (const [dir, name] of [[-1, "jumpBack"], [0, "jumpUp"], [1, "jumpFwd"]] as const) {
      f.jumpDir = dir;
      expect(animFor(f)).toEqual({ name, frame: 7 });
    }
  });

  it("guarding and blocking use the crouching version when crouched", () => {
    const f = newMatch().fighters[0];
    Object.assign(f, { state: "guard", crouching: true });
    expect(animFor(f).name).toBe("guardCrouch");
    Object.assign(f, { state: "blockstun", crouching: false, stateLength: 10 });
    expect(animFor(f).name).toBe("blockStand");
  });

  it("timed states stretch their animation to fit how long they last", () => {
    const f = newMatch().fighters[0];
    Object.assign(f, { state: "blockstun", crouching: false, stateFrame: 5, stateLength: 10 });
    expect(animFor(f).frame).toBeCloseTo(animLength(ANIMS.blockStand!) / 2);
  });

  it("a low hit shows hitLow, and a high or mid hit shows hitHigh", () => {
    const low = newMatch();
    run(low, 1, B.DOWN | B.LK);
    run(low, 6, B.DOWN);
    expect(low.fighters[1].state).toBe("hitstun");
    expect(low.fighters[1].lastHitLevel).toBe("low");
    expect(animFor(low.fighters[1]).name).toBe("hitLow");

    const mid = newMatch();
    run(mid, 1, B.LP);
    run(mid, 6);
    expect(mid.fighters[1].state).toBe("hitstun");
    expect(mid.fighters[1].lastHitLevel).toBe("mid");
    expect(animFor(mid.fighters[1]).name).toBe("hitHigh");
  });
});
