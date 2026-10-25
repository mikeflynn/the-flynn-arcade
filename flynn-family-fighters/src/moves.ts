// 🥊 FLYNN FAMILY FIGHTERS MOVES
//
// Every normal attack (the punches and kicks you get by pressing one button)
// is one block of numbers below. Change a number, save, and the game reloads.
//
// Times are in FRAMES. The game runs at 60 frames a second, so 60 = 1 second.
//   startup   frames before the attack can hit (smaller = faster). Try 2 to 15.
//   active    frames the attack can hit for. Try 1 to 8.
//   recovery  frames you're stuck afterwards (smaller = safer). Try 4 to 30.
//   damage    how much health it takes. Try 1 to 30.
//   chip      damage that still gets through a block. Normals use 0.
//   hitstun   frames the other fighter is stunned when it hits. Try 8 to 30.
//             Light hitstun 16 is just long enough for crouching Light Punch
//             to hit twice in a row (a combo!). Lower it and that combo breaks.
//   blockstun frames the other fighter is stuck when they block it. Try 4 to 24.
//   hitstop   frames both fighters freeze when it connects (that "crunch"!). Try 4 to 16.
//   dizzy     how much it fills the hidden dizzy meter. Try 0 to 20.
//   pushback  how far the hit pushes the other fighter away. Try 0 to 40.
//   level     "high" (block standing), "low" (block crouching) or "mid" (block either way).
//   knockdown true = the hit knocks them over.
//   cancellable true = a special move can interrupt it when it connects.
//
// The hitbox is the rectangle where the attack hurts, measured from the
// attacker's feet: x is how far in front it starts, w is how wide it is,
// y is how high it starts (negative = up) and h is how tall it is.
// x + w is the attack's REACH. Turn on showHitboxes in settings.ts to see them!
//
// Names: st = standing, cr = crouching, j = jumping, cl = close (Medium and
// Heavy Punch right next to the other fighter). LP/MP/HP = Light/Medium/Heavy
// Punch, LK/MK/HK = Light/Medium/Heavy Kick.
//
// Want one fighter to hit harder or reach further? Don't change it here (that
// changes everyone): use "normals" in their file in src/characters/.
//
// SPECIAL MOVES are further down, in MOVE_TYPES. Each fighter picks 2 to 4 of
// them in their character file and gives each one a name (and maybe a color).

import type { NormalId, SpecialChoice } from "./fighter";
import type { Motion } from "./engine/input";
import type { AttackData, FighterState } from "./engine/types";

/**
 * One attack as written here. Like AttackData, but a typo in `level` won't stop
 * the game from building: it becomes "mid" with a message in the console (F12).
 */
export type MoveData = Omit<AttackData, "level"> & { level: AttackData["level"] | (string & {}) };

// The shared timing for each strength. Every attack copies one of these.
// 🛠️ TRY THIS: make LIGHT's startup 2 and see how fast jabs come out.
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

// Every normal attack. Kicks reach 20% further than the matching punch.
// 🛠️ TRY THIS: give "st.HK" knockdown: true for a big standing kick that knocks them over.
export const NORMALS: Record<NormalId, MoveData> = {
  // Standing punches: straight out at chest height.
  "st.LP": { ...LIGHT, id: "st.LP", hitbox: { x: 10, y: -210, w: 110, h: 70 }, cancellable: true },
  "st.MP": { ...MEDIUM, id: "st.MP", hitbox: { x: 10, y: -215, w: 130, h: 75 } },
  "st.HP": { ...HEAVY, id: "st.HP", hitbox: { x: 10, y: -220, w: 160, h: 80 } },

  // Standing kicks.
  "st.LK": { ...LIGHT, id: "st.LK", hitbox: { x: 10, y: -150, w: 134, h: 50 } },
  "st.MK": { ...MEDIUM, id: "st.MK", hitbox: { x: 10, y: -170, w: 158, h: 60 } },
  "st.HK": { ...HEAVY, id: "st.HK", hitbox: { x: 10, y: -220, w: 194, h: 70 } },

  // Crouching punches. Crouching Heavy Punch swings upward to stop jumpers.
  "cr.LP": { ...LIGHT, id: "cr.LP", hitbox: { x: 10, y: -140, w: 100, h: 40 }, cancellable: true },
  "cr.MP": { ...MEDIUM, id: "cr.MP", hitbox: { x: 10, y: -145, w: 120, h: 45 } },
  "cr.HP": { ...HEAVY, id: "cr.HP", hitbox: { x: 10, y: -260, w: 140, h: 130 } },

  // Crouching kicks hit LOW: block them crouching. The heavy one is a sweep.
  "cr.LK": { ...LIGHT, id: "cr.LK", hitbox: { x: 10, y: -40, w: 122, h: 40 }, level: "low", cancellable: true },
  "cr.MK": { ...MEDIUM, id: "cr.MK", hitbox: { x: 10, y: -45, w: 146, h: 45 }, level: "low", cancellable: true },
  "cr.HK": { ...HEAVY, id: "cr.HK", hitbox: { x: 10, y: -40, w: 170, h: 40 }, level: "low", knockdown: true },

  // Jumping attacks hit HIGH: block them standing. Their hitbox is measured
  // from the jumper's feet in the air, angled down at the other fighter.
  "j.LP": { ...LIGHT, id: "j.LP", hitbox: { x: 10, y: -120, w: 90, h: 60 }, level: "high" },
  "j.MP": { ...MEDIUM, id: "j.MP", hitbox: { x: 10, y: -110, w: 100, h: 70 }, level: "high" },
  "j.HP": { ...HEAVY, id: "j.HP", hitbox: { x: 10, y: -100, w: 110, h: 80 }, level: "high" },
  "j.LK": { ...LIGHT, id: "j.LK", hitbox: { x: 10, y: -80, w: 110, h: 70 }, level: "high" },
  "j.MK": { ...MEDIUM, id: "j.MK", hitbox: { x: 10, y: -70, w: 122, h: 80 }, level: "high" },
  "j.HK": { ...HEAVY, id: "j.HK", hitbox: { x: 10, y: -60, w: 134, h: 90 }, level: "high" },

  // Close punches: used instead of standing MP/HP when you're right next to them.
  "cl.MP": { ...MEDIUM, id: "cl.MP", hitbox: { x: 10, y: -220, w: 80, h: 80 }, cancellable: true },
  "cl.HP": { ...HEAVY, id: "cl.HP", hitbox: { x: 10, y: -240, w: 90, h: 110 }, cancellable: true },
};

// ⭐ SPECIAL MOVES
//
// Every move type is one block below. A fighter picks a type in their
// character file, like { type: "fireball", name: "DONUT BLAST" }.
//
// Each block has:
//   motion   the joystick move you draw before pressing the button:
//              "qcf"      down, down-forward, forward  (↓↘→)
//              "qcb"      down, down-back, back        (↓↙←)
//              "dp"       forward, down, down-forward  (→↓↘)
//              "chargeBF" hold back for 45 frames, then forward
//              "chargeDU" hold down for 45 frames, then up
//              "mash"     tap punch 5 times fast
//              "360"      spin the stick all the way around
//   button   "P" (any punch) or "K" (any kick). Light / Medium / Heavy is the
//            move's STRENGTH: 0, 1 or 2. Use it to make heavy versions stronger.
//   attack   the attack numbers, just like the normals at the top of this file.
//            `choice` is what the fighter's file says (damageBonus, speed, color).
//   onFrame  (optional) a little code that runs every frame of the move, for
//            behavior the numbers can't describe. `frame` counts up from 0.
//
// Extra numbers special moves can use:
//   projectile  { speed } throws a fireball instead of hitting with the body.
//   invulnFrames  can't be hit while the move's frame is below this.
//   move        { vx, vy } moves the fighter during the active frames: vx is
//               forward speed, vy (negative = up) makes them jump up.
//   rehitEvery  hits again every this many frames (a multi-hit move).
//   grab        { range } a throw: works when the gap between the two bodies
//               is at most range. Can't be blocked!
// A blocked special move still takes a little health (chipDamageFraction in
// settings.ts). Special moves fill the dizzy meter by 12 per hit.
//
// ➕ ADD YOUR OWN MOVE TYPE:
//   1. Copy a block below (say "charge-dash") and give it a new name, like "rocket".
//   2. Pick a motion and a button.
//   3. Change the attack numbers. Keep id the same as the new name.
//   4. Optional: add onFrame code for something new (see "spin-kick").
//   5. Add the name to MOVE_TYPE_NAMES in src/fighter.ts too (the tests check
//      they match), then use it in a character file: { type: "rocket", name: "ZOOM" }.

/** One special move type. */
export interface MoveTypeDef {
  type: string;
  // A typo here won't stop the game from building: you'll get a message in the console (F12).
  motion: Motion | (string & {});
  button: "P" | "K" | (string & {});
  /** The attack numbers for strength 0 (light), 1 (medium) or 2 (heavy). */
  attack: (strength: 0 | 1 | 2, choice: SpecialChoice) => MoveData;
  /** Optional: runs every frame of the move (frame counts up from 0). */
  onFrame?: (f: FighterState, frame: number) => void;
}

// The shared numbers every special starts from.
const SPECIAL = {
  chip: 0, hitstun: 20, blockstun: 14, hitstop: 10, dizzy: 12, pushback: 20,
  level: "mid", knockdown: false, cancellable: false,
} as const;

/** Extra damage from the fighter's file (0 to 5). */
const bonus = (choice: SpecialChoice) => choice.damageBonus ?? 0;

export const MOVE_TYPES: Record<string, MoveTypeDef> = {
  // 🔥 FIREBALL: ↓↘→ + P. Light is slow, heavy is fast. Only one on screen at a time.
  // It flies at chest height, so jump over it! Crouching doesn't dodge it.
  fireball: {
    type: "fireball", motion: "qcf", button: "P",
    attack: (strength, choice) => ({
      ...SPECIAL, id: "fireball",
      startup: 12, active: 1, recovery: 30,
      damage: 10 + bonus(choice), hitstun: 20, blockstun: 16, hitstop: 8, pushback: 30,
      hitbox: { x: 0, y: 0, w: 0, h: 0 }, // the fireball hits, not the hand
      // 🛠️ TRY THIS: change [4, 6, 8] to [2, 3, 4] for super slow fireballs.
      projectile: { speed: [4, 6, 8][strength] * (choice.speed ?? 1), color: choice.color },
    }),
  },

  // 🚀 UPPERCUT: →↓↘ + P. Rises into the air and can't be hit at the start,
  // so it beats jump-ins. But miss it and you're stuck for a long time!
  uppercut: {
    type: "uppercut", motion: "dp", button: "P",
    attack: (strength, choice) => ({
      ...SPECIAL, id: "uppercut",
      startup: 3, active: 12, recovery: 28, // recovery starts when you land
      damage: 12 + 2 * strength + bonus(choice), hitstop: 12, knockdown: true,
      invulnFrames: 5 + strength, // frames 0 to 4 + strength
      // 🛠️ TRY THIS: make vy -24 for a sky-high uppercut.
      move: { vx: 2, vy: -16 - 2 * strength },
      hitbox: { x: 0, y: -280, w: 80, h: 200 },
    }),
  },

  // 🌀 SPIN-KICK: ↓↙← + K. Floats forward spinning, and hits up to 3 times.
  "spin-kick": {
    type: "spin-kick", motion: "qcb", button: "K",
    attack: (strength, choice) => ({
      ...SPECIAL, id: "spin-kick",
      startup: 6, active: 30, recovery: 10,
      damage: 5 + bonus(choice), hitstun: 14, hitstop: 6, pushback: 4,
      rehitEvery: 10, // 30 active frames ÷ 10 = up to 3 hits
      move: { vx: 5 + strength, vy: -5 },
      hitbox: { x: -60, y: -200, w: 180, h: 90 }, // the legs swing all the way round
    }),
    // Rises to 50 above the floor, then hovers there while it spins.
    onFrame: (f, frame) => {
      if (frame >= 6 && frame < 36) f.vy = f.y > -50 ? -5 : 0;
    },
  },

  // 💨 CHARGE-DASH: hold ← for 45 frames, then → + P. A fast lunge forward.
  "charge-dash": {
    type: "charge-dash", motion: "chargeBF", button: "P",
    attack: (strength, choice) => ({
      ...SPECIAL, id: "charge-dash",
      startup: 4, active: 14, recovery: 16,
      damage: 11 + bonus(choice), pushback: 30,
      move: { vx: 9 + strength }, // 🛠️ TRY THIS: 20 for a rocket dash!
      hitbox: { x: 10, y: -210, w: 90, h: 110 },
    }),
  },

  // 🤸 FLIP-KICK: hold ↓ for 45 frames, then ↑ + K. A rising arc that hits
  // HIGH (block it standing) and knocks down.
  "flip-kick": {
    type: "flip-kick", motion: "chargeDU", button: "K",
    attack: (_strength, choice) => ({ // same at every strength
      ...SPECIAL, id: "flip-kick",
      startup: 4, active: 16, recovery: 18, // recovery starts when you land
      damage: 13 + bonus(choice), hitstop: 12, level: "high", knockdown: true,
      move: { vx: 3, vy: -15 },
      hitbox: { x: 0, y: -170, w: 110, h: 170 },
    }),
  },

  // 👊 RAPID-HITS: tap punch 5 times fast. A flurry that hits every 6 frames.
  "rapid-hits": {
    type: "rapid-hits", motion: "mash", button: "P",
    attack: (_strength, choice) => ({ // same at every strength
      ...SPECIAL, id: "rapid-hits",
      startup: 4, active: 24, recovery: 14,
      damage: 3 + bonus(choice), hitstun: 12, blockstun: 10, hitstop: 4, pushback: 2,
      rehitEvery: 6, // 🛠️ TRY THIS: 3 for twice as many hits
      hitbox: { x: 10, y: -230, w: 120, h: 100 },
    }),
  },

  // 🐻 COMMAND-THROW: spin the stick (360°) + P, right next to them.
  // A big throw that can't be blocked.
  "command-throw": {
    type: "command-throw", motion: "360", button: "P",
    attack: (_strength, choice) => ({ // same at every strength
      ...SPECIAL, id: "command-throw",
      startup: 0, active: 1, recovery: 0,
      damage: 22 + bonus(choice), dizzy: 12,
      grab: { range: 30 }, // the gap between the bodies; normal throws use 16
      hitbox: { x: 0, y: 0, w: 0, h: 0 },
    }),
  },
};

/** The move type names character files may use. */
export const KNOWN_MOVE_TYPES = Object.keys(MOVE_TYPES);
