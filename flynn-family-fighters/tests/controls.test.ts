import { describe, expect, it } from "vitest";
import { InputManager } from "@web-games/input";
import { inputFrameFrom, player1Controls, player2Controls } from "../src/controls";
import { B } from "../src/engine/input";

const SHARED = ["start", "mute"];
const keysOf = (bindings: typeof player1Controls, skip: string[] = []) =>
  Object.entries(bindings.keys)
    .filter(([action]) => !skip.includes(action))
    .flatMap(([, codes]) => codes);

describe("controls", () => {
  it("player 1 and player 2 never share a key (except start and mute)", () => {
    const p1 = new Set(keysOf(player1Controls, SHARED));
    const overlap = keysOf(player2Controls, SHARED).filter((code) => p1.has(code));
    expect(overlap).toEqual([]);
  });

  it("start keys don't clash with the other player's fighting keys", () => {
    const p1Fight = new Set(keysOf(player1Controls, SHARED));
    const p2Fight = new Set(keysOf(player2Controls, SHARED));
    expect((player2Controls.keys.start ?? []).filter((c) => p1Fight.has(c))).toEqual([]);
    expect((player1Controls.keys.start ?? []).filter((c) => p2Fight.has(c))).toEqual([]);
  });

  it("every button and direction has at least one key for each player", () => {
    for (const action of Object.keys(B)) {
      expect(player1Controls.keys[action]?.length ?? 0, `P1 ${action}`).toBeGreaterThan(0);
      expect(player2Controls.keys[action]?.length ?? 0, `P2 ${action}`).toBeGreaterThan(0);
    }
  });

  it("uses the spec's keys", () => {
    expect(player1Controls.keys.LP).toEqual(["KeyR"]);
    expect(player1Controls.keys.HK).toEqual(["KeyH"]);
    expect(player1Controls.keys.start).toEqual(["Digit1"]);
    expect(player2Controls.keys.MP).toEqual(["KeyO", "Numpad5"]);
    expect(player2Controls.keys.HK).toEqual(["Semicolon", "Numpad3"]);
    expect(player2Controls.keys.start).toEqual(["Enter", "NumpadEnter"]);
  });

  it("gives each player their own gamepad with the SF2 button layout", () => {
    expect(player1Controls.pad?.index).toBe(0);
    expect(player2Controls.pad?.index).toBe(1);
    const buttons = player1Controls.pad!.buttons;
    expect([buttons.LP, buttons.MP, buttons.HP]).toEqual([[2], [3], [5]]);
    expect([buttons.LK, buttons.MK, buttons.HK]).toEqual([[0], [1], [7]]);
    expect(buttons.start).toEqual([9]);
    expect([buttons.UP, buttons.DOWN, buttons.LEFT, buttons.RIGHT]).toEqual([[12], [13], [14], [15]]);
  });
});

describe("inputFrameFrom", () => {
  it("turns held keys into the engine's button bits", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, player1Controls);
    const press = (code: string) => target.dispatchEvent(Object.assign(new Event("keydown"), { code }));
    press("KeyD");
    press("KeyR");
    press("KeyH");
    input.update();
    expect(inputFrameFrom(input, 1)).toBe(B.RIGHT | B.LP | B.HK);
    expect(inputFrameFrom(input, 2)).toBe(0);
  });
});
