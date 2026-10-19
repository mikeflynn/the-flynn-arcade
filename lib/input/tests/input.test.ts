import { describe, expect, it } from "vitest";
import { InputManager, mergeBindings, resolveActions, type Bindings, type PadState } from "../src/index";

const bindings: Bindings = {
  keys: { left: ["ArrowLeft"], jump: ["Space", "ArrowUp"] },
  pad: { index: 0, buttons: { jump: [0] }, axes: { left: [{ axis: 0, direction: -1 }] } },
};

const pad = (pressed: number[] = [], axes: number[] = [0, 0]): PadState => ({
  buttons: Array.from({ length: 16 }, (_, i) => pressed.includes(i)),
  axes,
});

function keyEvent(type: "keydown" | "keyup", code: string): Event {
  return Object.assign(new Event(type, { cancelable: true }), { code });
}

function fakeGamepad(pressed: number[], axes = [0, 0]): Gamepad {
  return {
    buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })),
    axes,
  } as unknown as Gamepad;
}

describe("resolveActions", () => {
  it("turns pressed keys into actions", () => {
    expect(resolveActions(bindings, new Set(["ArrowUp"]), null)).toEqual(new Set(["jump"]));
  });

  it("reads gamepad buttons", () => {
    expect(resolveActions(bindings, new Set(), pad([0]))).toEqual(new Set(["jump"]));
  });

  it("only counts a stick once it's past the deadzone", () => {
    expect(resolveActions(bindings, new Set(), pad([], [-0.2, 0])).has("left")).toBe(false);
    expect(resolveActions(bindings, new Set(), pad([], [-0.9, 0])).has("left")).toBe(true);
  });

  it("ignores the gamepad when there are no gamepad bindings", () => {
    expect(resolveActions({ keys: {} }, new Set(), pad([0])).size).toBe(0);
  });
});

describe("mergeBindings", () => {
  it("adds keys together and keeps the first gamepad", () => {
    const merged = mergeBindings(bindings, { keys: { jump: ["KeyW"], left: ["KeyA"] } });
    expect(merged.keys.jump).toEqual(["Space", "ArrowUp", "KeyW"]);
    expect(merged.keys.left).toEqual(["ArrowLeft", "KeyA"]);
    expect(merged.pad?.index).toBe(0);
  });
});

describe("InputManager", () => {
  it("tracks held keys and fresh presses", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, bindings);

    target.dispatchEvent(keyEvent("keydown", "Space"));
    input.update();
    expect(input.isDown(1, "jump")).toBe(true);
    expect(input.justPressed(1, "jump")).toBe(true);

    input.update();
    expect(input.isDown(1, "jump")).toBe(true);
    expect(input.justPressed(1, "jump")).toBe(false);

    target.dispatchEvent(keyEvent("keyup", "Space"));
    input.update();
    expect(input.isDown(1, "jump")).toBe(false);
  });

  it("catches a tap that's pressed and released between two frames", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, bindings);
    input.update();

    target.dispatchEvent(keyEvent("keydown", "Space"));
    target.dispatchEvent(keyEvent("keyup", "Space"));
    input.update();
    expect(input.justPressed(1, "jump")).toBe(true);

    input.update();
    expect(input.isDown(1, "jump")).toBe(false);
  });

  it("only blocks the browser's default for keys the game uses", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, bindings);
    const space = keyEvent("keydown", "Space");
    const z = keyEvent("keydown", "KeyZ");
    target.dispatchEvent(space);
    target.dispatchEvent(z);
    expect(space.defaultPrevented).toBe(true);
    expect(z.defaultPrevented).toBe(false);
  });

  it("lets go of every key when the window loses focus", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, bindings);
    target.dispatchEvent(keyEvent("keydown", "ArrowLeft"));
    target.dispatchEvent(new Event("blur"));
    input.update();
    expect(input.isDown(1, "left")).toBe(false);
  });

  it("reads the right gamepad and survives it being unplugged", () => {
    let pads: (Gamepad | null)[] = [fakeGamepad([0])];
    const input = new InputManager(new EventTarget(), () => pads);
    input.setBindings(1, bindings);
    input.update();
    expect(input.isDown(1, "jump")).toBe(true);
    pads = [null];
    input.update();
    expect(input.isDown(1, "jump")).toBe(false);
    pads = [];
    expect(() => input.update()).not.toThrow();
  });

  it("survives a browser that throws when reading gamepads", () => {
    const input = new InputManager(new EventTarget(), () => {
      throw new Error("blocked");
    });
    input.setBindings(1, bindings);
    expect(() => input.update()).not.toThrow();
  });

  it("anyJustPressed checks every player", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, { keys: { jump: ["Space"] } });
    input.setBindings(2, { keys: { jump: ["KeyW"] } });
    target.dispatchEvent(keyEvent("keydown", "KeyW"));
    input.update();
    expect(input.anyJustPressed("jump")).toBe(true);
  });

  it("clearBindings removes a player", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(2, { keys: { jump: ["KeyW"] } });
    input.clearBindings(2);
    target.dispatchEvent(keyEvent("keydown", "KeyW"));
    input.update();
    expect(input.isDown(2, "jump")).toBe(false);
  });
});
