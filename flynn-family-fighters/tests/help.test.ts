import { describe, expect, it } from "vitest";
import type { Bindings } from "@web-games/input";
import { controlRows, keyName, padButtonName } from "../src/help";
import { player1Controls, player2Controls } from "../src/controls";

// A frozen set of controls, so these tests don't change when kids edit controls.ts.
const p1: Bindings = {
  keys: {
    UP: ["KeyW"], DOWN: ["KeyS"], LEFT: ["KeyA"], RIGHT: ["KeyD"],
    LP: ["KeyR"], MP: ["KeyT"], HP: ["KeyY"], LK: ["KeyF"], MK: ["KeyG"], HK: ["KeyH"],
    start: ["Digit1"], mute: ["KeyM"],
  },
  pad: { index: 0, buttons: { UP: [12], DOWN: [13], LEFT: [14], RIGHT: [15], LP: [2], MP: [3], HP: [5], LK: [0], MK: [1], HK: [7], start: [9] } },
};
const p2: Bindings = {
  keys: {
    UP: ["ArrowUp"], DOWN: ["ArrowDown"], LEFT: ["ArrowLeft"], RIGHT: ["ArrowRight"],
    LP: ["KeyI", "Numpad4"], MP: ["KeyO"], HP: ["KeyP"], LK: ["KeyK"], MK: ["KeyL"], HK: ["Semicolon"],
    start: ["Enter", "NumpadEnter"], mute: ["KeyM"],
  },
};

describe("keyName", () => {
  it("turns key codes into the letters printed on the key", () => {
    expect(keyName("KeyW")).toBe("W");
    expect(keyName("Digit1")).toBe("1");
    expect(keyName("ArrowLeft")).toBe("←");
    expect(keyName("Numpad4")).toBe("NUM4");
    expect(keyName("Semicolon")).toBe(";");
    expect(keyName("Enter")).toBe("ENTER");
    expect(keyName("Space")).toBe("SPACE");
  });

  it("shows any other code as it is, in capitals", () => {
    expect(keyName("ShiftLeft")).toBe("SHIFTLEFT");
  });
});

describe("padButtonName", () => {
  it("names standard gamepad buttons", () => {
    expect(padButtonName(0)).toBe("A");
    expect(padButtonName(5)).toBe("RB");
    expect(padButtonName(7)).toBe("RT");
    expect(padButtonName(9)).toBe("START");
    expect(padButtonName(14)).toBe("←");
  });

  it("shows an unknown button by its number", () => {
    expect(padButtonName(20)).toBe("20");
  });
});

describe("controlRows", () => {
  const rows = controlRows(p1, p2);
  const row = (label: string) => rows.find((r) => r.label === label);

  it("puts the four directions on one MOVE row", () => {
    expect(row("MOVE")).toEqual({ label: "MOVE", p1: "W A S D", p2: "↑ ← ↓ →", pad: "D-PAD" });
  });

  it("lists each button with each player's keys and the gamepad button", () => {
    expect(row("LIGHT PUNCH")).toEqual({ label: "LIGHT PUNCH", p1: "R", p2: "I / NUM4", pad: "X" });
    expect(row("HEAVY KICK")).toEqual({ label: "HEAVY KICK", p1: "H", p2: ";", pad: "RT" });
    expect(row("PAUSE")).toEqual({ label: "PAUSE", p1: "1", p2: "ENTER / NUMENTER", pad: "START" });
  });

  it("shows a dash when there's no key or no gamepad", () => {
    expect(row("MUTE")?.pad).toBe("-");
    expect(controlRows({ keys: {} }, { keys: {} })[1]).toMatchObject({ p1: "-", p2: "-", pad: "-" });
  });

  it("has a row for every button, in order", () => {
    expect(rows.map((r) => r.label)).toEqual([
      "MOVE", "LIGHT PUNCH", "MEDIUM PUNCH", "HEAVY PUNCH", "LIGHT KICK", "MEDIUM KICK", "HEAVY KICK", "PAUSE", "MUTE",
    ]);
  });
});

describe("the real controls.ts", () => {
  // controls.ts is a kid file: only check that whatever is in it shows up.
  it("gives every row something to show", () => {
    for (const r of controlRows(player1Controls, player2Controls)) {
      expect(r.p1.length, r.label).toBeGreaterThan(0);
      expect(r.p2.length, r.label).toBeGreaterThan(0);
    }
  });
});
