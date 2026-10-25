// 🎬 HOW THE FIGHTERS MOVE
//
// An animation is a short list of poses ("keys"). The game blends from one
// pose to the next. Each pose gives an angle (in degrees) for every joint.
// Joint names: hips (turns the whole body), torso (the waist), chest, head,
// and for the front (f) and back (b) side:
// UA = upper arm, FA = forearm, H = hand, Th = thigh, Sh = shin, Ft = foot.
//
// Angles: 0 means the limb hangs straight down. NEGATIVE swings it toward the
// other fighter (forward), positive swings it backward. -90 points straight
// forward, -180 points straight up.
//
// `frames` is how long the key lasts, counted in 60ths of a second.
// `ease` is how it blends: "sine" (smooth), "out" (fast then slow),
// "linear" (steady) or "snap" (instant).
// `plant` says which feet stay on the floor: "fb" both (the default),
// "f" front, "b" back, or "" for none (in the air).
// `hand: "palm"` opens both hands, and `face: "hit"` shows the ouch face.
//
// Every fighter shares these animations, so changing a punch here changes it
// for everyone. Open http://localhost:8002/?viewer and press N to see them all.

import { animLength, flatFeet, STANCE as RIG_STANCE, type Animation, type Keyframe, type Pose } from "@web-games/rig";
import type { FighterState } from "./engine/types";
import { MOVE_TYPES, NORMALS } from "./moves";

// ─── POSES ──────────────────────────────────────────────────────────────────

// The stance without its feet, so every pose gets feet that sit flat.
const { fFt: _fFt, bFt: _bFt, ...BASE } = RIG_STANCE;

/** A pose: the fighting stance with a few joints changed. */
const pose = (changes: Pose = {}): Pose => flatFeet({ ...BASE, ...changes });

/** The fighting stance every attack starts from and comes back to. */
export const STANCE: Pose = pose();

// Pieces of poses that many moves share. `...LUNGE` copies these numbers in.
/** A big step forward: front knee bent, back leg straight. */
const LUNGE: Pose = { fTh: -44, fSh: 30, bTh: 40, bSh: 6 };
/** Knees deeply bent, leaning in. The feet stay on the floor by themselves. */
const CROUCH: Pose = { fTh: -84, fSh: 112, bTh: -18, bSh: 124, torso: 14, chest: 10, head: -12, fUA: -50, fFA: -105 };
/** Fists up at the chin, forearms in front of the chest, head tucked. */
const GUARD: Pose = { fUA: -50, fFA: -128, bUA: -30, bFA: -140, head: 12, chest: -8, torso: -6 };
/** Bending down to spring into a jump. */
const SQUAT: Pose = { fTh: -62, fSh: 92, bTh: 6, bSh: 84, torso: 12, chest: 10, head: -4 };
/** Stretched out tall, just leaving the floor. */
const STRETCH: Pose = { fTh: -16, fSh: 10, bTh: 18, bSh: 14, torso: 2, fUA: -80, fFA: -60, bUA: -50, bFA: -80, plant: "" };
/** Knees tucked up in the air. */
const TUCK: Pose = {
  fTh: -100, fSh: 125, bTh: -55, bSh: 125, torso: -4, chest: 4, head: -6,
  fUA: -50, fFA: -115, bUA: -20, bFA: -120, plant: "",
};
/** Opening up to land. */
const OPEN: Pose = { fTh: -36, fSh: 40, bTh: 14, bSh: 46, plant: "" };
/** Floating in the air between jump attacks: knees up, fists ready. */
const AIR: Pose = { fTh: -70, fSh: 100, bTh: -30, bSh: 100, fUA: -50, fFA: -115, bUA: -20, bFA: -120, plant: "" };
/** Recoiling from a hit to the head: head snapped back, arms flung out. */
const OUCH_HIGH: Pose = {
  torso: -26, chest: -16, head: -30, fUA: 30, fFA: -50, bUA: 46, bFA: -40,
  fTh: -14, fSh: 22, bTh: 34, bSh: 34, face: "hit",
};
/** Doubled over from a hit to the legs or tummy. */
const OUCH_LOW: Pose = {
  torso: 26, chest: 22, head: 16, fUA: -10, fFA: -40, bUA: 0, bFA: -40,
  fTh: -50, fSh: 60, bTh: 20, bSh: 50, face: "hit",
};
/** Knocked off your feet, flying backward. */
const LAUNCHED: Pose = {
  hips: -30, torso: -10, chest: -10, head: -20, fUA: -150, fFA: -20, bUA: -170, bFA: -20,
  fTh: -30, fSh: 30, bTh: -10, bSh: 40, face: "hit", plant: "",
};
/** Halfway down. */
const FALLING: Pose = { ...LAUNCHED, hips: -60, fUA: -120, bUA: -140, fTh: -20, fSh: 20, bTh: 0, bSh: 20 };
/**
 * Flat on your back, legs out in front. Lying down keeps the feet on the
 * floor ("fb"), so the body rests on the floor instead of floating.
 */
const LYING: Pose = {
  hips: -85, torso: -4, chest: -4, head: 10, fUA: -150, fFA: -10, bUA: -170, bFA: -10,
  fTh: -4, fSh: 8, bTh: 0, bSh: 14, face: "hit", plant: "fb",
};

// ─── HOW ATTACKS ARE BUILT ──────────────────────────────────────────────────

/** An attack's three timing numbers from moves.ts. */
interface Timing { startup: number; active: number; recovery: number }

/** The same safe frame counts the fight engine uses: whole numbers, never negative (active is at least 1). */
function timing(a: Timing): Timing {
  const safe = (n: number, min: number) => (Number.isFinite(n) ? Math.max(min, Math.round(n)) : min);
  return { startup: safe(a.startup, 0), active: safe(a.active, 1), recovery: safe(a.recovery, 0) };
}

/** A key that lasts 0 frames: the pose the next key blends from. */
const from = (p: Pose): Keyframe => ({ pose: p, frames: 0, ease: "snap" });

/**
 * One attack, timed to match its numbers in moves.ts:
 *   1. wind up (during `startup` frames),
 *   2. strike (snaps out and stays for the `active` frames, when it can hit),
 *   3. come back to the rest pose (during `recovery` frames).
 * `rest` is where it starts and ends: STANCE, or CROUCH for crouching attacks.
 * `hold` keeps the strike out for that many of the recovery frames, so big hits read clearly.
 */
export function attackAnim(windup: Pose, strike: Pose, a: Timing, rest: Pose = STANCE, hold = 0): Animation {
  const t = timing(a);
  const kept = Math.min(Math.max(0, Math.round(hold)), t.recovery);
  const keys: Keyframe[] = [
    from(rest),
    { pose: windup, frames: t.startup, ease: "sine" },
    { pose: strike, frames: t.active, ease: "snap" },
  ];
  if (kept > 0) keys.push({ pose: strike, frames: kept, ease: "linear" });
  keys.push({ pose: rest, frames: t.recovery - kept, ease: "sine" });
  return { loop: false, keys };
}

/** Fills exactly `total` frames by stepping through `poses` every `every` frames (for flurries and spins). */
function cycle(poses: Pose[], total: number, every: number, ease: Keyframe["ease"]): Keyframe[] {
  const keys: Keyframe[] = [];
  for (let done = 0, i = 0; done < total; i++) {
    const frames = Math.min(every, total - done);
    keys.push({ pose: poses[i % poses.length]!, frames, ease });
    done += frames;
  }
  return keys;
}

// ─── NORMAL ATTACKS (one per button, matched to moves.ts) ───────────────────

const STANDING = STANCE;
const CROUCHING = pose(CROUCH);
const FLOATING = pose(AIR);

// Kicks keep only the back foot down, so the back leg holds the body up. In
// these "ready" poses the back leg is the longer one, so the standing foot
// stays on the floor and the kicking foot starts just above it.
/** The back leg kicks stand on: nearly straight. */
const KICK_LEG: Pose = { bTh: 24, bSh: 4 };
/** Standing, ready to kick. Standing kicks start and end here. */
const KICK_READY = pose({ ...KICK_LEG, fTh: -36, fSh: 52, plant: "b" });
/** The back leg crouching kicks stand on: a little less bent than the crouch. */
const CROUCH_KICK_LEG: Pose = { bTh: -18, bSh: 100 };
/** Crouching, ready to kick. Crouching kicks start and end here. */
const CROUCH_KICK_READY = pose({ ...CROUCH, ...CROUCH_KICK_LEG, fTh: -88, fSh: 100, plant: "b" });

/** A standing pose, a crouching pose and an air pose, each built on its base. */
const st = (p: Pose) => pose(p);
const cr = (p: Pose) => pose({ ...CROUCH, ...p });
const air = (p: Pose) => pose({ ...AIR, ...p });

const normal = (id: keyof typeof NORMALS, windup: Pose, strike: Pose, rest: Pose, hold = 0) =>
  attackAnim(windup, strike, NORMALS[id], rest, hold);

const NORMAL_ANIMS: Record<keyof typeof NORMALS, Animation> = {
  // Standing punches.
  "st.LP": normal("st.LP",
    st({ fUA: -50, fFA: -118, chest: 0 }),
    st({ fUA: -96, fFA: -4, torso: 10, chest: 12, head: -14, bUA: -14, bFA: -125 }), STANDING, 2),
  "st.MP": normal("st.MP",
    st({ fUA: -40, fFA: -120, chest: -2, torso: 0 }),
    st({ fUA: -98, fFA: -2, torso: 12, chest: 14, head: -16, bUA: -10, bFA: -125, ...LUNGE }), STANDING, 4),
  // The big one: fist cocked back at the hip, then a deep lunge with the whole body behind it.
  "st.HP": normal("st.HP",
    st({ fUA: 20, fFA: -120, torso: -8, chest: -10, head: -6, bUA: -40, bFA: -110 }),
    st({ fUA: -100, fFA: 0, torso: 20, chest: 20, head: -18, bUA: 30, bFA: -100, fTh: -54, fSh: 36, bTh: 50, bSh: 2 }), STANDING, 8),

  // Standing kicks: only the back foot stays down (plant "b").
  "st.LK": normal("st.LK",
    st({ ...KICK_LEG, fTh: -60, fSh: 90, plant: "b" }),
    st({ fTh: -72, fSh: 8, fFt: 10, torso: -8, bTh: 18, bSh: 10, plant: "b" }), KICK_READY, 2),
  "st.MK": normal("st.MK",
    st({ ...KICK_LEG, fTh: -90, fSh: 110, torso: -4, plant: "b" }),
    st({ fTh: -92, fSh: 4, fFt: 10, torso: -14, chest: -6, head: 6, bTh: 16, bSh: 6, fUA: -30, bUA: -60, bFA: -70, plant: "b" }), KICK_READY, 4),
  // 🛠️ TRY THIS: change fTh: -125 to -150 for a kick that goes way over their head!
  "st.HK": normal("st.HK",
    st({ ...KICK_LEG, fTh: -110, fSh: 120, torso: -8, chest: -4, fUA: -40, bUA: -10, plant: "b" }),
    st({ fTh: -125, fSh: 2, fFt: 10, torso: -28, chest: -12, head: 12, bTh: 14, bSh: 4, fUA: -10, fFA: -70, bUA: -70, bFA: -60, plant: "b" }), KICK_READY, 8),

  // Crouching punches. Crouching Heavy Punch swings up to stop jumpers.
  "cr.LP": normal("cr.LP",
    cr({ fUA: -40, fFA: -120 }),
    cr({ fUA: -92, fFA: -4, torso: 18, chest: 14, head: -14 }), CROUCHING, 2),
  "cr.MP": normal("cr.MP",
    cr({ fUA: -30, fFA: -125, torso: 8 }),
    cr({ fUA: -95, fFA: -2, torso: 22, chest: 16, head: -16, bUA: -10, bFA: -125 }), CROUCHING, 4),
  "cr.HP": normal("cr.HP",
    cr({ fUA: 10, fFA: -110, torso: 20, chest: 16 }),
    cr({ fUA: -165, fFA: -15, torso: 0, chest: -8, head: -20, fTh: -60, fSh: 80 }), CROUCHING, 8),

  // Crouching kicks hit low. The heavy one is a sweep along the floor.
  "cr.LK": normal("cr.LK",
    cr({ ...CROUCH_KICK_LEG, fTh: -90, fSh: 120, plant: "b" }),
    cr({ ...CROUCH_KICK_LEG, fTh: -80, fSh: 30, fFt: 10, torso: 20, plant: "b" }), CROUCH_KICK_READY, 2),
  "cr.MK": normal("cr.MK",
    cr({ ...CROUCH_KICK_LEG, fTh: -95, fSh: 110, plant: "b" }),
    cr({ ...CROUCH_KICK_LEG, torso: 26, chest: 14, head: -18, fTh: -84, fSh: 4, fFt: 14, plant: "b" }), CROUCH_KICK_READY, 4),
  "cr.HK": normal("cr.HK",
    cr({ ...CROUCH_KICK_LEG, fTh: -70, fSh: 130, torso: 24, plant: "b" }),
    cr({ ...CROUCH_KICK_LEG, torso: 34, chest: 16, head: -16, fTh: -86, fSh: 0, fFt: 10, fUA: -60, fFA: -90, bUA: 30, bFA: -20, plant: "b" }), CROUCH_KICK_READY, 8),

  // Jumping attacks: all in the air (plant ""), angled down at the other fighter.
  "j.LP": normal("j.LP",
    air({ fUA: -30, fFA: -120 }),
    air({ fUA: -70, fFA: -6, torso: 10, chest: 10, head: -10 }), FLOATING, 2),
  "j.MP": normal("j.MP",
    air({ fUA: -10, fFA: -120, torso: -4 }),
    air({ fUA: -80, fFA: -4, torso: 14, chest: 14, head: -14, bUA: -10 }), FLOATING, 4),
  // A two-fisted hammer from above.
  "j.HP": normal("j.HP",
    air({ fUA: -170, fFA: -30, bUA: -160, bFA: -30, torso: -10, chest: -10 }),
    air({ fUA: -55, fFA: -4, bUA: -50, bFA: -10, torso: 22, chest: 18, head: -10 }), FLOATING, 8),
  "j.LK": normal("j.LK",
    air({ fTh: -80, fSh: 120 }),
    air({ fTh: -100, fSh: 60, torso: -6 }), FLOATING, 2),
  "j.MK": normal("j.MK",
    air({ fTh: -100, fSh: 125, bTh: -55, bSh: 125 }),
    air({ fTh: -62, fSh: 2, fFt: 24, bTh: -40, bSh: 125, torso: -18, chest: -10, head: 6, fUA: -10, fFA: -80, bUA: -90, bFA: -50 }), FLOATING, 4),
  // The flying kick: one leg straight out, the other tucked.
  "j.HK": normal("j.HK",
    air({ fTh: -100, fSh: 125, bTh: -55, bSh: 125, torso: 6 }),
    air({ fTh: -80, fSh: 0, fFt: 20, bTh: 10, bSh: 110, torso: -26, chest: -12, head: 10, fUA: 10, fFA: -60, bUA: -100, bFA: -40 }), FLOATING, 8),

  // Close punches: an elbow, and a short uppercut.
  "cl.MP": normal("cl.MP",
    st({ fUA: -20, fFA: -130, torso: -2 }),
    st({ fUA: -75, fFA: -140, torso: 16, chest: 18, head: -14, ...LUNGE }), STANDING, 4),
  "cl.HP": normal("cl.HP",
    st({ fUA: 0, fFA: -115, torso: 18, chest: 14, fTh: -50, fSh: 70, bTh: 20, bSh: 50 }),
    st({ fUA: -160, fFA: -20, torso: 2, chest: -6, head: -22, bUA: -10, bFA: -130, fTh: -20, fSh: 20, bTh: 20, bSh: 10 }), STANDING, 8),
};

// ─── SPECIAL MOVES (one per move type in moves.ts) ──────────────────────────

/** A move type's timing. Strength doesn't change any move's timing, so medium (1) stands for all three. */
const special = (type: string): Timing => timing(MOVE_TYPES[type]!.attack(1, { type, name: type }));

/** Landing from a rising special: knees bent, snapping in at once. */
const LANDING = pose(SQUAT);
/** Rising special moves land and then take their recovery frames, starting with a crouch on landing. */
const landKeys = (recovery: number): Keyframe[] => [
  { pose: LANDING, frames: Math.min(1, recovery), ease: "snap" },
  { pose: STANCE, frames: Math.max(0, recovery - 1), ease: "sine" },
];

/** Both palms pulled back to the hip, charging up. */
const FIREBALL_CHARGE = st({ fUA: 30, fFA: -110, bUA: 44, bFA: -110, torso: -8, chest: -10, head: -4, ...LUNGE, hand: "palm" });
/** Both palms pushed forward. */
const FIREBALL_PUSH = st({ fUA: -92, fFA: -4, bUA: -86, bFA: -8, torso: 14, chest: 14, head: -12, ...LUNGE, fTh: -50, hand: "palm" });
/** Both hands reaching out to grab. */
const GRAB = st({ fUA: -95, fFA: -10, bUA: -85, bFA: -15, torso: 10, chest: 8, head: -10, ...LUNGE, hand: "palm" });

function uppercutAnim(): Animation {
  const t = special("uppercut");
  return {
    loop: false,
    keys: [
      from(STANCE),
      { pose: st({ ...SQUAT, fUA: 10, fFA: -110, torso: 22 }), frames: t.startup, ease: "sine" },
      // Rising: fist straight up, front knee high, feet off the floor.
      // 🛠️ TRY THIS: make the uppercut leap higher by changing fUA: -170 to -180 and fTh: -90 to -110.
      { pose: st({ fUA: -170, fFA: -10, bUA: 20, bFA: -60, torso: -4, chest: -10, head: -24, fTh: -90, fSh: 100, bTh: 10, bSh: 10, plant: "" }), frames: t.active, ease: "snap" },
      ...landKeys(t.recovery),
    ],
  };
}

function spinKickAnim(): Animation {
  const t = special("spin-kick");
  // Legs split wide and arms out, swapping front and back as the body spins.
  const spinA = st({ fTh: -95, fSh: 4, fFt: 10, bTh: 80, bSh: 4, torso: -6, fUA: -90, fFA: -10, bUA: 90, bFA: -10, plant: "" });
  const spinB = st({ fTh: 80, fSh: 4, bTh: -95, bSh: 4, bFt: 10, torso: 6, fUA: 90, fFA: -10, bUA: -90, bFA: -10, plant: "" });
  return {
    loop: false,
    keys: [
      from(STANCE),
      { pose: st({ ...SQUAT, fUA: 20, bUA: -60, torso: 4 }), frames: t.startup, ease: "sine" },
      ...cycle([spinA, spinB], t.active, 5, "linear"),
      ...landKeys(t.recovery),
    ],
  };
}

function flipKickAnim(): Animation {
  const t = special("flip-kick");
  // A backflip: hips going negative turns the whole body over backward.
  const kick = st({ hips: -60, fTh: -40, fSh: 0, fFt: 10, bTh: 10, bSh: 60, torso: -6, fUA: 40, bUA: 50, plant: "" });
  const over = pose({ ...TUCK, hips: -200 });
  const round = pose({ ...TUCK, hips: -360 });
  const kickFrames = Math.min(4, t.active);
  const overFrames = Math.min(6, t.active - kickFrames);
  return {
    loop: false,
    keys: [
      from(STANCE),
      { pose: st(SQUAT), frames: t.startup, ease: "sine" },
      { pose: kick, frames: kickFrames, ease: "out" },
      { pose: over, frames: overFrames, ease: "linear" },
      { pose: round, frames: t.active - kickFrames - overFrames, ease: "linear" },
      ...landKeys(t.recovery),
    ],
  };
}

function rapidHitsAnim(): Animation {
  const t = special("rapid-hits");
  const jabFront = st({ fUA: -95, fFA: -4, bUA: -40, bFA: -110, torso: 12, chest: 12, head: -12, ...LUNGE });
  const jabBack = st({ bUA: -95, bFA: -4, fUA: -45, fFA: -120, torso: 16, chest: 14, head: -12, ...LUNGE });
  const jabHigh = st({ fUA: -115, fFA: -4, bUA: -50, bFA: -110, torso: 10, chest: 10, head: -14, ...LUNGE });
  return {
    loop: false,
    keys: [
      from(STANCE),
      { pose: st({ fUA: -40, fFA: -120, torso: 6, ...LUNGE }), frames: t.startup, ease: "sine" },
      // 🛠️ TRY THIS: change the 3 to 2 for an even faster blur of fists.
      ...cycle([jabFront, jabBack, jabHigh], t.active, 3, "snap"),
      { pose: STANCE, frames: t.recovery, ease: "sine" },
    ],
  };
}

/** Special animations by move type. A new move type in moves.ts gets the palm push until it has its own here. */
const SPECIAL_ANIMS: Record<string, () => Animation> = {
  fireball: () => attackAnim(FIREBALL_CHARGE, FIREBALL_PUSH, special("fireball"), STANCE, 16),
  uppercut: uppercutAnim,
  "spin-kick": spinKickAnim,
  "charge-dash": () => attackAnim(
    st({ torso: -10, chest: -10, fUA: -30, bUA: 10, fTh: -50, fSh: 70, bTh: 20, bSh: 50 }),
    st({ torso: 30, chest: 20, head: -20, fUA: -100, fFA: -2, bUA: -90, bFA: -10, fTh: -55, fSh: 40, bTh: 50, bSh: 4 }),
    special("charge-dash"), STANCE, 6),
  "flip-kick": flipKickAnim,
  "rapid-hits": rapidHitsAnim,
  "command-throw": () => attackAnim(GRAB, GRAB, special("command-throw")),
};

const specialAnims = Object.fromEntries(
  Object.keys(MOVE_TYPES).map((type) => [
    type,
    SPECIAL_ANIMS[type]?.() ?? attackAnim(FIREBALL_CHARGE, FIREBALL_PUSH, special(type)),
  ]),
);

// ─── EVERY ANIMATION ────────────────────────────────────────────────────────

/** The walk: each step lifts one foot (`plant` says which foot stays down). */
const STEPS: Pose[] = [
  pose({ fTh: -42, fSh: 26, bTh: 34, bSh: 28 }),
  pose({ fTh: -10, fSh: 18, bTh: 2, bSh: 62, chest: 9, plant: "f" }),
  pose({ fTh: 22, fSh: 30, bTh: -36, bSh: 26 }),
  pose({ fTh: -2, fSh: 62, bTh: -8, bSh: 16, chest: 9, plant: "b" }),
];

/** A jump: squat, stretch, then tuck and open up. `flip` turns the body over in the air (360 = a whole somersault). */
function jumpAnim(flip: number): Animation {
  const turn = (p: Pose, part: number) => pose({ ...p, hips: flip * part });
  const keys: Keyframe[] = [from(pose(SQUAT)), { pose: pose(STRETCH), frames: 6, ease: "out" }];
  if (flip === 0) {
    keys.push({ pose: pose(TUCK), frames: 18, ease: "sine" });
  } else {
    for (const part of [1 / 3, 2 / 3, 1]) keys.push({ pose: turn(TUCK, part), frames: 6, ease: "linear" });
  }
  keys.push({ pose: turn(OPEN, 1), frames: 12, ease: "sine" });
  return { loop: false, keys };
}

/** Bracing behind the guard after blocking a hit. */
const blockAnim = (guard: Pose, braced: Pose): Animation => ({
  loop: false,
  keys: [
    { pose: guard, frames: 3, ease: "snap" },
    { pose: braced, frames: 13, ease: "linear" },
  ],
});

/** Getting hit: snap into the ouch pose, hold it, then recover. */
const hitAnim = (ouch: Pose): Animation => ({
  loop: false,
  keys: [
    { pose: ouch, frames: 2, ease: "snap" },
    { pose: ouch, frames: 10, ease: "linear" },
    { pose: STANCE, frames: 8, ease: "sine" },
  ],
});

export const ANIMS: Record<string, Animation> = {
  // Breathing while waiting. 🛠️ TRY THIS: make `frames` smaller for a jumpier fighter!
  idle: {
    loop: true,
    keys: [
      { pose: STANCE, frames: 18, ease: "sine" },
      { pose: pose({ fTh: -38, fSh: 48, bTh: 34, bSh: 30, chest: 9, fUA: -54, bUA: -18, head: -6 }), frames: 18, ease: "sine" },
    ],
  },
  walkF: { loop: true, keys: STEPS.map((p) => ({ pose: p, frames: 8, ease: "sine" })) },
  // Walking backward is the same steps in the other order, a little slower. The two
  // both-feet-down poses straighten the leg that stays planted for the next step.
  walkB: {
    loop: true,
    keys: [pose({ fTh: -42, fSh: 26, bTh: 28, bSh: 0 }), STEPS[3]!, pose({ fTh: 22, fSh: 0, bTh: -36, bSh: 26 }), STEPS[1]!]
      .map((p) => ({ pose: p, frames: 9, ease: "sine" })),
  },
  crouch: {
    loop: true,
    keys: [
      { pose: CROUCHING, frames: 30, ease: "sine" },
      { pose: cr({ chest: 13, fUA: -46 }), frames: 30, ease: "sine" },
    ],
  },
  jumpSquat: { loop: false, keys: [{ pose: pose(SQUAT), frames: 4, ease: "out" }] },
  jumpUp: jumpAnim(0),
  // 🛠️ TRY THIS: change 360 to 720 for a double somersault, or 0 for no flip.
  jumpFwd: jumpAnim(360),
  jumpBack: jumpAnim(-360),

  ...NORMAL_ANIMS,
  ...specialAnims,

  // The normal throw: grab, pull in, toss over your shoulder.
  throw: {
    loop: false,
    keys: [
      { pose: GRAB, frames: 4, ease: "snap" },
      { pose: st({ fUA: -60, fFA: -100, bUA: -50, bFA: -110, torso: -10, chest: -8, head: -6, hand: "palm" }), frames: 6, ease: "sine" },
      { pose: st({ fUA: -200, fFA: -20, bUA: -190, bFA: -20, torso: -20, chest: -14, head: -10, bTh: 30, bSh: 10 }), frames: 6, ease: "out" },
      { pose: STANCE, frames: 8, ease: "sine" },
    ],
  },
  // Grabbed: pulled forward, arms flailing.
  thrown: {
    loop: false,
    keys: [
      { pose: st({ torso: 16, chest: 14, head: 10, fUA: -120, fFA: -40, bUA: 30, bFA: -60, fTh: -20, fSh: 20, face: "hit" }), frames: 3, ease: "snap" },
      { pose: st({ torso: 20, chest: 16, head: 14, fUA: -100, fFA: -60, bUA: 50, bFA: -40, fTh: -10, fSh: 14, face: "hit" }), frames: 3, ease: "linear" },
    ],
  },

  guard: {
    loop: true,
    keys: [
      { pose: pose(GUARD), frames: 20, ease: "sine" },
      { pose: pose({ ...GUARD, chest: -10, fTh: -36, fSh: 44 }), frames: 20, ease: "sine" },
    ],
  },
  guardCrouch: {
    loop: true,
    keys: [
      { pose: cr({ ...GUARD, torso: 10, chest: 4 }), frames: 20, ease: "sine" },
      { pose: cr({ ...GUARD, torso: 8, chest: 2 }), frames: 20, ease: "sine" },
    ],
  },
  blockStand: blockAnim(pose(GUARD), pose({ ...GUARD, torso: -8, chest: -10 })),
  blockCrouch: blockAnim(cr({ ...GUARD, torso: 10, chest: 4 }), cr({ ...GUARD, torso: 6, chest: 0 })),
  hitHigh: hitAnim(pose(OUCH_HIGH)),
  hitLow: hitAnim(pose(OUCH_LOW)),

  // Knocked over: fly back, land flat, stay down for a moment.
  knockdown: {
    loop: false,
    keys: [
      { pose: pose(LAUNCHED), frames: 2, ease: "snap" },
      { pose: pose(FALLING), frames: 6, ease: "sine" },
      { pose: pose(LYING), frames: 4, ease: "out" },
      { pose: pose(LYING), frames: 28, ease: "linear" },
    ],
  },
  // Sit up, crouch, and back into the stance.
  getup: {
    loop: false,
    keys: [
      from(pose(LYING)),
      { pose: pose({ hips: -40, torso: 30, chest: 14, head: -10, fUA: -70, fFA: -60, bUA: 30, bFA: -20, fTh: -60, fSh: 120, bTh: -40, bSh: 120 }), frames: 6, ease: "sine" },
      { pose: CROUCHING, frames: 7, ease: "sine" },
      { pose: STANCE, frames: 7, ease: "sine" },
    ],
  },

  // Seeing stars: wobbling back and forth.
  dizzy: {
    loop: true,
    keys: [
      { pose: pose({ torso: -10, chest: -6, head: 20, fUA: 14, fFA: -10, bUA: 20, bFA: -10, fTh: -12, fSh: 32, bTh: 14, bSh: 32, face: "hit" }), frames: 34, ease: "sine" },
      { pose: pose({ torso: 12, chest: 6, head: -18, fUA: 6, fFA: -16, bUA: 10, bFA: -20, fTh: -18, fSh: 40, bTh: 10, bSh: 38, face: "hit" }), frames: 34, ease: "sine" },
    ],
  },
  // Knocked out: a big flop onto your back (no blood, just stars).
  ko: {
    loop: false,
    keys: [
      { pose: pose(LAUNCHED), frames: 2, ease: "snap" },
      { pose: pose(FALLING), frames: 8, ease: "sine" },
      { pose: pose({ ...LYING, head: 20, fUA: -175, bUA: -178 }), frames: 6, ease: "out" },
      { pose: pose({ ...LYING, head: 20, fUA: -175, bUA: -178 }), frames: 60, ease: "linear" },
    ],
  },
  // Fist in the air! 🛠️ TRY THIS: set bUA to -176 too for a two-fisted victory.
  win: {
    loop: true,
    keys: [
      { pose: pose({ torso: -4, chest: -8, head: -20, fUA: -176, fFA: -8, bUA: 28, bFA: -60, fTh: -14, fSh: 14, bTh: 14, bSh: 10 }), frames: 8, ease: "out" },
      { pose: pose({ torso: -6, chest: -10, head: -24, fUA: -178, fFA: -2, bUA: 30, bFA: -66, fTh: -20, fSh: 24, bTh: 18, bSh: 18 }), frames: 22, ease: "sine" },
      { pose: pose({ torso: -4, chest: -8, head: -20, fUA: -176, fFA: -8, bUA: 28, bFA: -60, fTh: -14, fSh: 14, bTh: 14, bSh: 10 }), frames: 22, ease: "sine" },
    ],
  },
  // Lost on time: shoulders slumped, head down.
  lose: {
    loop: true,
    keys: [
      { pose: pose({ torso: 18, chest: 14, head: 26, fUA: 6, fFA: -10, bUA: 10, bFA: -10, fTh: -14, fSh: 20, bTh: 10, bSh: 18 }), frames: 30, ease: "sine" },
      { pose: pose({ torso: 20, chest: 16, head: 30, fUA: 8, fFA: -8, bUA: 12, bFA: -8, fTh: -16, fSh: 24, bTh: 12, bSh: 22 }), frames: 30, ease: "sine" },
    ],
  },
  // Before the round: stand tall, bow to the other fighter, then get ready.
  intro: {
    loop: false,
    keys: [
      { pose: pose({ torso: 0, chest: 0, head: 0, fUA: -10, fFA: -10, bUA: 10, bFA: -10, fTh: -6, fSh: 6, bTh: 6, bSh: 6 }), frames: 20, ease: "snap" },
      { pose: pose({ torso: 36, chest: 10, head: 16, fUA: -60, fFA: -110, bUA: -60, bFA: -100, fTh: -6, fSh: 6, bTh: 6, bSh: 6, hand: "palm" }), frames: 14, ease: "sine" },
      { pose: pose({ torso: 36, chest: 10, head: 16, fUA: -60, fFA: -110, bUA: -60, bFA: -100, fTh: -6, fSh: 6, bTh: 6, bSh: 6, hand: "palm" }), frames: 16, ease: "linear" },
      { pose: STANCE, frames: 10, ease: "sine" },
    ],
  },
};

// ─── WHICH ANIMATION TO SHOW ────────────────────────────────────────────────

/** Keeps a frame inside its animation: looping ones wrap around, the others stop at their last frame. */
function inside(name: string, frame: number): { name: string; frame: number } {
  const a = ANIMS[name]!;
  const len = animLength(a);
  const f = Number.isFinite(frame) ? frame : 0;
  return { name, frame: a.loop ? ((f % len) + len) % len : Math.min(Math.max(f, 0), len) };
}

/** States that last a set time: their animation stretches to fit, however long the hit or block lasts. */
function stretched(name: string, f: FighterState): { name: string; frame: number } {
  const len = animLength(ANIMS[name]!);
  return { name, frame: f.stateLength > 0 ? (f.stateFrame / f.stateLength) * len : f.stateFrame };
}

/** Which animation, and which frame of it, shows what a fighter is doing right now. */
export function animFor(f: FighterState): { name: string; frame: number } {
  const { name, frame } = pick(f);
  return inside(name, frame);
}

/** The animation for the fighter's state, at a frame that may still be past its end. */
function pick(f: FighterState): { name: string; frame: number } {
  switch (f.state) {
    case "attack": {
      const atk = f.attack;
      if (!atk) return { name: f.crouching ? "crouch" : "idle", frame: f.stateFrame };
      const name = atk.special ? atk.special.type : atk.data.id;
      if (!ANIMS[name]) return { name: "idle", frame: f.stateFrame };
      // A rising special holds its strike pose in the air; its recovery plays after landing.
      const t = timing(atk.data);
      const frame = atk.inAir ? Math.min(atk.frame, t.startup + t.active - 1) : atk.frame;
      return { name, frame };
    }
    case "jump":
      return { name: f.jumpDir === 1 ? "jumpFwd" : f.jumpDir === -1 ? "jumpBack" : "jumpUp", frame: f.stateFrame };
    case "guard":
      return { name: f.crouching ? "guardCrouch" : "guard", frame: f.stateFrame };
    case "hitstun":
      return stretched(f.lastHitLevel === "low" ? "hitLow" : "hitHigh", f);
    case "blockstun":
      return stretched(f.crouching ? "blockCrouch" : "blockStand", f);
    case "throwing":
      return stretched("throw", f);
    case "thrown":
    case "knockdown":
    case "getup":
      return stretched(f.state, f);
    default:
      // idle, walkF, walkB, crouch, jumpSquat, dizzy, ko, win: same name as the state.
      return { name: ANIMS[f.state] ? f.state : "idle", frame: f.stateFrame };
  }
}
