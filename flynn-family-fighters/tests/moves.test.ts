import { describe, expect, it } from "vitest";
import { normalizeAttack } from "../src/engine/combat";
import { NORMAL_IDS } from "../src/fighter";
import { NORMALS } from "../src/moves";

// moves.ts is a kid file: every number in it is there to be changed. These
// tests only check what stays true after any reasonable edit. How the engine
// uses the numbers is tested with frozen copies (tests/fixtures/moves.ts).

describe("moves.ts", () => {
  it("has every normal attack, and each one turns into engine data", () => {
    for (const id of NORMAL_IDS) {
      expect(NORMALS[id], id).toBeDefined();
      expect(() => normalizeAttack(NORMALS[id], () => {}), id).not.toThrow();
    }
  });
});
