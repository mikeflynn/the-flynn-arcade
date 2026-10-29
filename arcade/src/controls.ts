// 🛠️ ARCADE CONTROLS
//
// Keys use their "code" names ("ArrowLeft", "KeyA", "Space", "Enter", ...).
// Gamepad buttons: 0 = A, 8 = Select/Back, 9 = Start, 12-15 = D-pad up/down/left/right.
// Any keyboard side and any gamepad can drive the arcade.

import type { Bindings } from "@web-games/input";

const pad = (index: number): Bindings["pad"] => ({
  index,
  buttons: { up: [12], down: [13], left: [14], right: [15], start: [0, 9], mute: [8] },
  axes: {
    left: [{ axis: 0, direction: -1 }],
    right: [{ axis: 0, direction: 1 }],
    up: [{ axis: 1, direction: -1 }],
    down: [{ axis: 1, direction: 1 }],
  },
});

export const arcadeControls: Bindings = {
  keys: {
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    up: ["ArrowUp", "KeyW"],
    down: ["ArrowDown", "KeyS"],
    start: ["Enter", "Space", "KeyE"],
    mute: ["KeyM"],
  },
  pad: pad(0),
};

/** A second gamepad can drive the arcade too. */
export const secondPadControls: Bindings = { keys: {}, pad: pad(1) };
