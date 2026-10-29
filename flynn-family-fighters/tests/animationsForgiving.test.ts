import { describe, expect, it, vi } from "vitest";
import { animLength } from "@web-games/rig";
import type { MoveTypeDef } from "../src/moves";

// A kid's move type whose attack code throws (or isn't code at all) must not
// stop the game from loading. animations.ts runs every move type's attack while
// it loads, so here moves.ts is swapped for the frozen copy plus two broken
// move types, before animations.ts is imported.
vi.mock("../src/moves", async () => {
  const real = await import("./fixtures/moves");
  const boom: MoveTypeDef = {
    type: "boom", motion: "qcf", button: "P",
    attack: () => {
      throw new Error("oops");
    },
  };
  const notCode = { type: "not-code", motion: "qcf", button: "P", attack: 42 } as unknown as MoveTypeDef;
  const MOVE_TYPES = { ...real.MOVE_TYPES, boom, "not-code": notCode };
  return { ...real, MOVE_TYPES, KNOWN_MOVE_TYPES: Object.keys(MOVE_TYPES) };
});

describe("a broken move type", () => {
  it("still gets an animation, with the fallback timing and a message", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { ANIMS, FALLBACK_TIMING } = await import("../src/animations");
    const fallback = FALLBACK_TIMING.startup + FALLBACK_TIMING.active + FALLBACK_TIMING.recovery;
    for (const type of ["boom", "not-code"]) {
      expect(ANIMS[type], type).toBeDefined();
      expect(animLength(ANIMS[type]!)).toBe(fallback);
    }
    expect(warn.mock.calls.filter(([m]) => String(m).includes("boom"))).toHaveLength(1);
    expect(warn.mock.calls.filter(([m]) => String(m).includes("not-code"))).toHaveLength(1);
    expect(ANIMS.fireball).toBeDefined(); // the good ones still load
    warn.mockRestore();
  });

  it("specialTiming falls back for a throwing attack, with one message", async () => {
    const { specialTiming, FALLBACK_TIMING } = await import("../src/animations");
    const warn = vi.fn();
    const def: MoveTypeDef = { type: "x", motion: "qcf", button: "P", attack: () => { throw new Error("nope"); } };
    expect(specialTiming("x", def, warn)).toEqual(FALLBACK_TIMING);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(/x.*nope/);
  });
});
