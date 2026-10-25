// 🎬 HOW THE FIGHTERS MOVE
//
// An animation is a short list of poses ("keys"). The game blends from one
// pose to the next. Each pose gives an angle (in degrees) for every joint.
// Joint names: torso, chest, head, and for the front (f) and back (b) side:
// UA = upper arm, FA = forearm, H = hand, Th = thigh, Sh = shin, Ft = foot.
//
// `frames` is how long the key lasts, counted in 60ths of a second.
// `ease` is how it blends: "sine" (smooth), "out" (fast then slow),
// "linear" (steady) or "snap" (instant).
// `plant` says which feet stay on the floor: "fb" both (the default),
// "f" front, "b" back, or "" for none (in the air).

import { flatFeet, STANCE, type Animation, type Pose } from "@web-games/rig";

/** A pose: the fighting stance with a few joints changed. */
const pose = (changes: Pose = {}): Pose => flatFeet({ ...STANCE, ...changes });

export const animations: Record<string, Animation> = {
  // Just standing in the fighting stance.
  stance: { loop: true, keys: [{ pose: pose(), frames: 30, ease: "linear" }] },

  // Breathing while waiting. 🛠️ TRY THIS: make `frames` smaller for a jumpier fighter!
  idle: {
    loop: true,
    keys: [
      { pose: pose(), frames: 18, ease: "sine" },
      { pose: pose({ fTh: -38, fSh: 48, bTh: 34, bSh: 30, chest: 9, fUA: -54, bUA: -18, head: -6 }), frames: 18, ease: "sine" },
    ],
  },

  // Walking: each step lifts one foot (`plant` says which foot stays down).
  walk: {
    loop: true,
    keys: [
      { pose: pose({ fTh: -42, fSh: 26, bTh: 34, bSh: 28 }), frames: 8, ease: "sine" },
      { pose: pose({ fTh: -10, fSh: 18, bTh: 2, bSh: 62, chest: 9, plant: "f" }), frames: 8, ease: "sine" },
      { pose: pose({ fTh: 22, fSh: 30, bTh: -36, bSh: 26 }), frames: 8, ease: "sine" },
      { pose: pose({ fTh: -2, fSh: 62, bTh: -8, bSh: 16, chest: 9, plant: "b" }), frames: 8, ease: "sine" },
    ],
  },
};
