// 🎮 CONTROLS
//
// Keys use their "code" names: "KeyA", "ArrowLeft", "Digit1", "Enter", ...
// (Search "KeyboardEvent code" to find the name of any key.)
//
// The six buttons, like an arcade machine:
//   LP / MP / HP = light, medium and heavy punch
//   LK / MK / HK = light, medium and heavy kick
//
// Gamepad buttons use the standard layout:
//   0 = A   1 = B   2 = X   3 = Y   5 = RB   7 = RT   9 = Start
//   12 = D-pad up   13 = D-pad down   14 = D-pad left   15 = D-pad right
// The first gamepad plugged in is player 1, the second is player 2.
//
// Playing 2 players on one keyboard? Some keyboards can't feel lots of keys at
// once ("key ghosting"). Gamepads work best for 2 players.
//
// 🛠️ TRY THIS: swap your punches and kicks around until they feel right!
// (Keep player 1's and player 2's keys different: only "start" and "mute" may
// share a key, and every button needs at least one key for each player. Break
// either rule and `npm test` will tell you, because the game wouldn't work right.)

import type { Bindings, InputManager, PadBindings } from "@web-games/input";
import { B, type InputFrame } from "./engine/input";

const padButtons: PadBindings["buttons"] = {
  UP: [12],
  DOWN: [13],
  LEFT: [14],
  RIGHT: [15],
  LP: [2], // X
  MP: [3], // Y
  HP: [5], // RB
  LK: [0], // A
  MK: [1], // B
  HK: [7], // RT
  start: [9],
};

// The left stick moves too.
const padStick: PadBindings["axes"] = {
  LEFT: [{ axis: 0, direction: -1 }],
  RIGHT: [{ axis: 0, direction: 1 }],
  UP: [{ axis: 1, direction: -1 }],
  DOWN: [{ axis: 1, direction: 1 }],
};

export const player1Controls: Bindings = {
  keys: {
    UP: ["KeyW"],
    DOWN: ["KeyS"],
    LEFT: ["KeyA"],
    RIGHT: ["KeyD"],
    LP: ["KeyR"],
    MP: ["KeyT"],
    HP: ["KeyY"],
    LK: ["KeyF"],
    MK: ["KeyG"],
    HK: ["KeyH"],
    start: ["Digit1"],
    mute: ["KeyM"],
  },
  pad: { index: 0, buttons: padButtons, axes: padStick },
};

export const player2Controls: Bindings = {
  keys: {
    UP: ["ArrowUp"],
    DOWN: ["ArrowDown"],
    LEFT: ["ArrowLeft"],
    RIGHT: ["ArrowRight"],
    // The number pad works too, if your keyboard has one.
    LP: ["KeyI", "Numpad4"],
    MP: ["KeyO", "Numpad5"],
    HP: ["KeyP", "Numpad6"],
    LK: ["KeyK", "Numpad1"],
    MK: ["KeyL", "Numpad2"],
    HK: ["Semicolon", "Numpad3"],
    start: ["Enter", "NumpadEnter"],
    mute: ["KeyM"],
  },
  pad: { index: 1, buttons: padButtons, axes: padStick },
};

// ─── You don't need to change anything below here. ──────────────────────────

/** What one player is holding right now, as the fight engine's button bits. */
export function inputFrameFrom(input: InputManager, player: number): InputFrame {
  let frame = 0;
  for (const [action, bit] of Object.entries(B)) if (input.isDown(player, action)) frame |= bit;
  return frame;
}
