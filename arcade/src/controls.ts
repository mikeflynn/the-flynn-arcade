// 🛠️ ARCADE CONTROLS
//
// Keys use their "code" names ("ArrowLeft", "KeyA", "Space", "Enter", ...).
// Gamepad buttons: 0 = A, 8 = Select/Back, 9 = Start, 14/15 = D-pad left/right.
// Any keyboard side and any gamepad can drive the arcade.

import type { Bindings } from "@web-games/input";

const pad = (index: number): Bindings["pad"] => ({
  index,
  buttons: { left: [14], right: [15], start: [0, 9], mute: [8] },
  axes: { left: [{ axis: 0, direction: -1 }], right: [{ axis: 0, direction: 1 }] },
});

export const arcadeControls: Bindings = {
  keys: {
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    start: ["Enter", "Space", "KeyE"],
    mute: ["KeyM"],
  },
  pad: pad(0),
};

/** A second gamepad can drive the arcade too. */
export const secondPadControls: Bindings = { keys: {}, pad: pad(1) };
