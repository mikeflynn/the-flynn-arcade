import { describe, expect, it } from "vitest";
import { InputManager, type Bindings } from "@web-games/input";
import { inputFrameFrom, player1Controls, player2Controls } from "../src/controls";
import { B } from "../src/engine/input";

// controls.ts is a kid file: kids swap keys around. These tests only check
// rules that any good set of keys follows (see the note in controls.ts).

const SHARED = ["start", "mute"];
const keysOf = (bindings: Bindings, skip: string[] = []) =>
  Object.entries(bindings.keys)
    .filter(([action]) => !skip.includes(action))
    .flatMap(([, codes]) => codes);

describe("controls", () => {
  it("player 1 and player 2 never share a key (except start and mute)", () => {
    const p1 = new Set(keysOf(player1Controls, SHARED));
    const overlap = keysOf(player2Controls, SHARED).filter((code) => p1.has(code));
    expect(overlap).toEqual([]);
  });

  it("every button and direction has at least one key for each player", () => {
    for (const action of Object.keys(B)) {
      expect(player1Controls.keys[action]?.length ?? 0, `P1 ${action}`).toBeGreaterThan(0);
      expect(player2Controls.keys[action]?.length ?? 0, `P2 ${action}`).toBeGreaterThan(0);
    }
  });
});

describe("inputFrameFrom", () => {
  it("turns held keys into the engine's button bits", () => {
    const bindings: Bindings = { keys: { RIGHT: ["KeyD"], LP: ["KeyR"], HK: ["KeyH"], LK: ["KeyF"] } };
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, bindings);
    const press = (code: string) => target.dispatchEvent(Object.assign(new Event("keydown"), { code }));
    press("KeyD");
    press("KeyR");
    press("KeyH");
    input.update();
    expect(inputFrameFrom(input, 1)).toBe(B.RIGHT | B.LP | B.HK);
    expect(inputFrameFrom(input, 2)).toBe(0);
  });
});
