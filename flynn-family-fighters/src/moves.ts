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

import type { NormalId } from "./fighter";
import type { AttackData } from "./engine/types";

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
