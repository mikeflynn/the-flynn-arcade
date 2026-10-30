// The help screen's words: turns the keys in controls.ts into a table people
// can read ("KeyW" becomes "W"). Plain logic with no Phaser, so it can be tested.

import type { Bindings } from "@web-games/input";

export interface ControlRow {
  label: string;
  p1: string;
  p2: string;
  pad: string;
}

const DIRECTIONS = ["UP", "LEFT", "DOWN", "RIGHT"] as const;
const BUTTONS = [
  ["LIGHT PUNCH", "LP"],
  ["MEDIUM PUNCH", "MP"],
  ["HEAVY PUNCH", "HP"],
  ["LIGHT KICK", "LK"],
  ["MEDIUM KICK", "MK"],
  ["HEAVY KICK", "HK"],
  ["PAUSE", "start"],
  ["MUTE", "mute"],
] as const;

const KEY_NAMES: Record<string, string> = {
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", Backslash: "\\",
  BracketLeft: "[", BracketRight: "]", Minus: "-", Equal: "=", Backquote: "`",
};

/** What's printed on the key: "KeyW" → "W", "Digit1" → "1", "ArrowLeft" → "←", "Numpad4" → "NUM4". */
export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  const match = /^(?:Key|Digit)(.)$/.exec(code);
  if (match) return match[1]!;
  return code.replace(/^Numpad/, "NUM").toUpperCase();
}

const PAD_NAMES = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "BACK", "START", "L3", "R3", "↑", "↓", "←", "→"];

/** A standard gamepad button's name: 0 → "A", 9 → "START", 14 → "←". */
export function padButtonName(button: number): string {
  return PAD_NAMES[button] ?? String(button);
}

const or = (names: string[]) => (names.length > 0 ? names.join(" / ") : "-");

/** One table row per button, plus MOVE for the four directions. */
export function controlRows(p1: Bindings, p2: Bindings): ControlRow[] {
  const keysFor = (b: Bindings, action: string) => or((b.keys[action] ?? []).map(keyName));
  const padFor = (action: string) => or((p1.pad?.buttons[action] ?? []).map(padButtonName));
  const move = (b: Bindings) => {
    const keys = DIRECTIONS.map((d) => b.keys[d]?.[0]);
    return keys.every((k) => k === undefined) ? "-" : keys.map((k) => (k ? keyName(k) : "-")).join(" ");
  };
  const padMove = DIRECTIONS.map((d) => p1.pad?.buttons[d]?.[0]);
  const dpad = padMove.join() === "12,14,13,15" ? "D-PAD" : padMove.every((b) => b === undefined) ? "-" : padMove.map((b) => (b === undefined ? "-" : padButtonName(b))).join(" ");

  return [
    { label: "MOVE", p1: move(p1), p2: move(p2), pad: dpad },
    ...BUTTONS.map(([label, action]) => ({ label, p1: keysFor(p1, action), p2: keysFor(p2, action), pad: padFor(action) })),
  ];
}
