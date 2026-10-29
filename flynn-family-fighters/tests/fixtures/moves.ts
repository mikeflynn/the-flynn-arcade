// The engine tests' own copy of src/moves.ts, frozen at the starter numbers.
//
// src/moves.ts is a kid file: kids are invited to change every number in it.
// Tests about how the engine works (timing, hits, combos, specials) load this
// file in its place with
//   vi.mock("../../src/moves", () => import("../fixtures/moves"));
// so a kid's edit to moves.ts can never make them fail. Change numbers here
// only to test the engine differently, never to match moves.ts.

import type { NormalId, SpecialChoice } from "../../src/fighter";
import type { MoveData, MoveTypeDef } from "../../src/moves";

const LIGHT = {
  startup: 4, active: 3, recovery: 7, damage: 4, chip: 0,
  hitstun: 16, blockstun: 8, hitstop: 8, dizzy: 6, pushback: 12,
  level: "mid", knockdown: false, cancellable: false,
} as const;

const MEDIUM = {
  startup: 6, active: 4, recovery: 12, damage: 8, chip: 0,
  hitstun: 18, blockstun: 12, hitstop: 10, dizzy: 10, pushback: 16,
  level: "mid", knockdown: false, cancellable: false,
} as const;

const HEAVY = {
  startup: 9, active: 4, recovery: 20, damage: 12, chip: 0,
  hitstun: 22, blockstun: 16, hitstop: 12, dizzy: 14, pushback: 20,
  level: "mid", knockdown: false, cancellable: false,
} as const;

export const NORMALS: Record<NormalId, MoveData> = {
  "st.LP": { ...LIGHT, id: "st.LP", hitbox: { x: 10, y: -210, w: 110, h: 70 }, cancellable: true },
  "st.MP": { ...MEDIUM, id: "st.MP", hitbox: { x: 10, y: -215, w: 130, h: 75 } },
  "st.HP": { ...HEAVY, id: "st.HP", hitbox: { x: 10, y: -220, w: 160, h: 80 } },

  "st.LK": { ...LIGHT, id: "st.LK", hitbox: { x: 10, y: -150, w: 134, h: 50 } },
  "st.MK": { ...MEDIUM, id: "st.MK", hitbox: { x: 10, y: -170, w: 158, h: 60 } },
  "st.HK": { ...HEAVY, id: "st.HK", hitbox: { x: 10, y: -220, w: 194, h: 70 } },

  "cr.LP": { ...LIGHT, id: "cr.LP", hitbox: { x: 10, y: -140, w: 100, h: 40 }, cancellable: true },
  "cr.MP": { ...MEDIUM, id: "cr.MP", hitbox: { x: 10, y: -145, w: 120, h: 45 } },
  "cr.HP": { ...HEAVY, id: "cr.HP", hitbox: { x: 10, y: -260, w: 140, h: 130 } },

  "cr.LK": { ...LIGHT, id: "cr.LK", hitbox: { x: 10, y: -40, w: 122, h: 40 }, level: "low", cancellable: true },
  "cr.MK": { ...MEDIUM, id: "cr.MK", hitbox: { x: 10, y: -45, w: 146, h: 45 }, level: "low", cancellable: true },
  "cr.HK": { ...HEAVY, id: "cr.HK", hitbox: { x: 10, y: -40, w: 170, h: 40 }, level: "low", knockdown: true },

  "j.LP": { ...LIGHT, id: "j.LP", hitbox: { x: 10, y: -120, w: 90, h: 60 }, level: "high" },
  "j.MP": { ...MEDIUM, id: "j.MP", hitbox: { x: 10, y: -110, w: 100, h: 70 }, level: "high" },
  "j.HP": { ...HEAVY, id: "j.HP", hitbox: { x: 10, y: -100, w: 110, h: 80 }, level: "high" },
  "j.LK": { ...LIGHT, id: "j.LK", hitbox: { x: 10, y: -80, w: 110, h: 70 }, level: "high" },
  "j.MK": { ...MEDIUM, id: "j.MK", hitbox: { x: 10, y: -70, w: 122, h: 80 }, level: "high" },
  "j.HK": { ...HEAVY, id: "j.HK", hitbox: { x: 10, y: -60, w: 134, h: 90 }, level: "high" },

  "cl.MP": { ...MEDIUM, id: "cl.MP", hitbox: { x: 10, y: -220, w: 80, h: 80 }, cancellable: true },
  "cl.HP": { ...HEAVY, id: "cl.HP", hitbox: { x: 10, y: -240, w: 90, h: 110 }, cancellable: true },
};

const SPECIAL = {
  chip: 0, hitstun: 20, blockstun: 14, hitstop: 10, dizzy: 12, pushback: 20,
  level: "mid", knockdown: false, cancellable: false,
} as const;

/** Extra damage from the fighter's file (0 to 5). */
const bonus = (choice: SpecialChoice) => choice.damageBonus ?? 0;

export const MOVE_TYPES: Record<string, MoveTypeDef> = {
  fireball: {
    type: "fireball", motion: "qcf", button: "P",
    attack: (strength, choice) => ({
      ...SPECIAL, id: "fireball",
      startup: 12, active: 1, recovery: 30,
      damage: 10 + bonus(choice), hitstun: 20, blockstun: 16, hitstop: 8, pushback: 30,
      hitbox: { x: 0, y: 0, w: 0, h: 0 },
      projectile: { speed: [4, 6, 8][strength] * (choice.speed ?? 1), color: choice.color },
    }),
  },

  uppercut: {
    type: "uppercut", motion: "dp", button: "P",
    attack: (strength, choice) => ({
      ...SPECIAL, id: "uppercut",
      startup: 3, active: 12, recovery: 28,
      damage: 12 + 2 * strength + bonus(choice), hitstop: 12, knockdown: true,
      invulnFrames: 5 + strength,
      move: { vx: 2, vy: -16 - 2 * strength },
      hitbox: { x: 0, y: -280, w: 80, h: 200 },
    }),
  },

  "spin-kick": {
    type: "spin-kick", motion: "qcb", button: "K",
    attack: (strength, choice) => ({
      ...SPECIAL, id: "spin-kick",
      startup: 6, active: 30, recovery: 10,
      damage: 5 + bonus(choice), hitstun: 14, hitstop: 6, pushback: 4,
      rehitEvery: 10,
      move: { vx: 5 + strength, vy: -5 },
      hitbox: { x: -60, y: -200, w: 180, h: 90 },
    }),
    onFrame: (f, frame) => {
      if (frame >= 6 && frame < 36) f.vy = f.y > -50 ? -5 : 0;
    },
  },

  "charge-dash": {
    type: "charge-dash", motion: "chargeBF", button: "P",
    attack: (strength, choice) => ({
      ...SPECIAL, id: "charge-dash",
      startup: 4, active: 14, recovery: 16,
      damage: 11 + bonus(choice), pushback: 30,
      move: { vx: 9 + strength },
      hitbox: { x: 10, y: -210, w: 90, h: 110 },
    }),
  },

  "flip-kick": {
    type: "flip-kick", motion: "chargeDU", button: "K",
    attack: (_strength, choice) => ({
      ...SPECIAL, id: "flip-kick",
      startup: 4, active: 16, recovery: 18,
      damage: 13 + bonus(choice), hitstop: 12, level: "high", knockdown: true,
      move: { vx: 3, vy: -15 },
      hitbox: { x: 0, y: -170, w: 110, h: 170 },
    }),
  },

  "rapid-hits": {
    type: "rapid-hits", motion: "mash", button: "P",
    attack: (_strength, choice) => ({
      ...SPECIAL, id: "rapid-hits",
      startup: 4, active: 24, recovery: 14,
      damage: 3 + bonus(choice), hitstun: 12, blockstun: 10, hitstop: 4, pushback: 2,
      rehitEvery: 6,
      hitbox: { x: 10, y: -230, w: 120, h: 100 },
    }),
  },

  "command-throw": {
    type: "command-throw", motion: "360", button: "P",
    attack: (_strength, choice) => ({
      ...SPECIAL, id: "command-throw",
      startup: 0, active: 1, recovery: 0,
      damage: 22 + bonus(choice), dizzy: 12,
      grab: { range: 30 },
      hitbox: { x: 0, y: 0, w: 0, h: 0 },
    }),
  },
};

export const KNOWN_MOVE_TYPES = Object.keys(MOVE_TYPES);
