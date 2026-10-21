// 🛠️ CONTROLS
//
// Keys use their "code" names: "ArrowLeft", "KeyA", "Space", "Enter", ...
// (Look up "KeyboardEvent code" to find the name of any key.)
//
// Gamepad buttons use the standard layout:
//   0 = A   1 = B   2 = X   3 = Y   8 = Select/Back   9 = Start
//   12 = D-pad up   13 = D-pad down   14 = D-pad left   15 = D-pad right
//
// In 1-player games, player 1 can use either side of the keyboard.

import type { Bindings, PadBindings } from "@web-games/input";

const padButtons: PadBindings["buttons"] = {
  left: [14],
  right: [15],
  up: [12],
  down: [13],
  jump: [0],
  confirm: [0, 9],
  pause: [9],
  mute: [8],
};

const padSticks: PadBindings["axes"] = {
  left: [{ axis: 0, direction: -1 }],
  right: [{ axis: 0, direction: 1 }],
  up: [{ axis: 1, direction: -1 }],
  down: [{ axis: 1, direction: 1 }],
};

export const player1Controls: Bindings = {
  keys: {
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    jump: ["ArrowUp", "Space"],
    confirm: ["Enter", "Space"],
    pause: ["Escape", "KeyP"],
    mute: ["KeyM"],
  },
  pad: { index: 0, buttons: padButtons, axes: padSticks },
};

export const player2Controls: Bindings = {
  keys: {
    left: ["KeyA"],
    right: ["KeyD"],
    up: ["KeyW"],
    down: ["KeyS"],
    jump: ["KeyW"],
    confirm: ["KeyE"],
    pause: ["Escape"],
    mute: ["KeyM"],
  },
  pad: { index: 1, buttons: padButtons, axes: padSticks },
};
