import { describe, expect, it } from "vitest";
import { arcadeLadder, ladderDifficulty } from "../../src/engine/ladder";
import { Rng } from "../../src/engine/rng";
import { normalizeFighter, type Fighter } from "../../src/fighter";

const make = (id: string): Fighter =>
  normalizeFighter({ name: id.toUpperCase(), look: {}, specials: [] }, id, [], () => {})!;

describe("arcadeLadder", () => {
  it("has every other fighter once, and never the player", () => {
    const roster = ["a", "b", "c", "d"].map(make);
    const ladder = arcadeLadder(roster, "b", new Rng(5));
    expect(ladder).toHaveLength(3);
    expect(ladder.map((f) => f.id)).not.toContain("b");
    expect(new Set(ladder.map((f) => f.id)).size).toBe(3);
  });

  it("shuffles with the seed: same seed same order, and the order changes with other seeds", () => {
    const roster = ["a", "b", "c", "d", "e", "f"].map(make);
    const order = (seed: number) => arcadeLadder(roster, "a", new Rng(seed)).map((f) => f.id).join("");
    expect(order(1)).toBe(order(1));
    expect(new Set([1, 2, 3, 4, 5, 6].map(order)).size).toBeGreaterThan(1);
  });

  it("is a mirror match when there is only one fighter", () => {
    const only = make("a");
    expect(arcadeLadder([only], "a", new Rng(1))).toEqual([only]);
  });
});

describe("ladderDifficulty", () => {
  it("goes up by one every two fights, up to 8", () => {
    expect(ladderDifficulty(3, 5)).toBe(5);
    expect(ladderDifficulty(7, 9)).toBe(8);
    expect(ladderDifficulty(3, 0)).toBe(3);
    expect(ladderDifficulty(3, 1)).toBe(3);
  });
});
