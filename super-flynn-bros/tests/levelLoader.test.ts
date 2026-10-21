import { describe, expect, it } from "vitest";
import { buildCharLookup, findRespawn, findSafeSpawn, loadLevel, tileVariant, UNKNOWN_TILE_KEY, type LevelCatalog } from "../src/engine/levelLoader";
import type { HazardDef, ItemDef, TileDef } from "../src/engine/types";

const tile = (key: string, mapChar: string, solid = true): TileDef => ({ key, name: key, mapChar, solid, colors: {}, art: [] });
const hazard = (key: string, mapChar: string): HazardDef => ({
  key, name: key, mapChar, colors: {}, frames: [], frameMs: 100, behavior: "patrol",
});
const item = (key: string, mapChar: string): ItemDef => ({
  key, name: key, mapChar, colors: {}, frames: [], score: 10, hearts: 0, sound: "donut",
});

const catalog: LevelCatalog = {
  tiles: [tile("ground", "#"), tile("bush", "~", false)],
  hazards: [hazard("dog", "D")],
  items: [item("donut", "o")],
};

describe("loadLevel", () => {
  it("reads tiles, hazards, items, starts and the goal", () => {
    const level = loadLevel(["    o   ", " 12 D  G", "########"], catalog);
    expect(level.cols).toBe(8);
    expect(level.rows).toBe(3);
    expect(level.tiles[2].every((t) => t === "ground")).toBe(true);
    expect(level.solid[2][0]).toBe(true);
    expect(level.hazards).toEqual([{ key: "dog", col: 4, row: 1 }]);
    expect(level.items).toEqual([{ key: "donut", col: 4, row: 0 }]);
    expect(level.starts).toEqual({ 1: { col: 1, row: 1 }, 2: { col: 2, row: 1 } });
    expect(level.goal).toEqual({ col: 7, row: 1 });
    expect(level.warnings).toEqual([]);
  });

  it("is fine with rows of different lengths (trailing spaces don't matter)", () => {
    const level = loadLevel(["", " 1  G", "######"], catalog);
    expect(level.cols).toBe(6);
    expect(level.tiles[0]).toEqual([null, null, null, null, null, null]);
    expect(level.warnings).toEqual([]);
  });

  it("knows non-solid tiles", () => {
    const level = loadLevel(["1~ G", "####"], catalog);
    expect(level.tiles[0][1]).toBe("bush");
    expect(level.solid[0][1]).toBe(false);
  });

  it("shows a solid ? block for unknown letters and says where", () => {
    const level = loadLevel(["1 Z G", "#####"], catalog, "Test Level");
    expect(level.tiles[0][2]).toBe(UNKNOWN_TILE_KEY);
    expect(level.solid[0][2]).toBe(true);
    expect(level.warnings).toEqual([
      'Test Level: I don\'t know what "Z" means (first seen at row 1, column 3). Showing a ? block.',
    ]);
  });

  it("adds a start and a goal when the map forgets them", () => {
    const level = loadLevel(["      ", "      ", "##  ##"], catalog, "Oops");
    expect(level.starts[1]).toEqual({ col: 0, row: 1 });
    expect(level.starts[2]).toEqual({ col: 4, row: 1 });
    expect(level.goal).toEqual({ col: 5, row: 1 });
    expect(level.warnings).toHaveLength(2);
  });

  it("keeps the first of a doubled marker", () => {
    const level = loadLevel(["1 1 G", "#####"], catalog);
    expect(level.starts[1]).toEqual({ col: 0, row: 0 });
    expect(level.warnings[0]).toContain('more than one "1"');
  });

  it("warns when a map isn't the expected height", () => {
    const level = loadLevel(["1  G", "####"], catalog, "Short", { expectedRows: 11 });
    expect(level.warnings).toEqual(["Short: levels should be 11 rows tall, but this one is 2. Some of it may be off the screen."]);
  });

  it("doesn't warn about height unless asked to", () => {
    expect(loadLevel(["1  G", "####"], catalog).warnings).toEqual([]);
  });

  it("never throws on an empty map", () => {
    expect(() => loadLevel([], catalog)).not.toThrow();
  });
});

describe("buildCharLookup", () => {
  it("warns when two things share a letter or use a special letter", () => {
    const { warnings } = buildCharLookup({
      tiles: [tile("ground", "#")],
      hazards: [hazard("dog", "#"), hazard("cat", "G")],
      items: [],
    });
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('dog and ground both use "#"');
    expect(warnings[1]).toContain('"G" is a special map letter');
  });
});

describe("findSafeSpawn", () => {
  const level = loadLevel(["      ", "      ", "      ", "##  ##"], catalog);

  it("skips pits and finds the next ground", () => {
    expect(findSafeSpawn(level, 2)).toEqual({ col: 4, row: 2 });
  });

  it("looks backward when there's no ground ahead", () => {
    const edge = loadLevel(["    ", "    ", "    ", "##  "], catalog);
    expect(findSafeSpawn(edge, 3)).toEqual({ col: 1, row: 2 });
  });

  it("needs room for a hero above the ground", () => {
    const low = loadLevel(["##", "##"], catalog);
    expect(findSafeSpawn(low, 0)).toBeNull();
  });
});

describe("findRespawn", () => {
  //                            0123456789
  const level = loadLevel(["          ", "          ", "          ", "####  ####"], catalog);

  it("puts you back a couple of tiles before the pit, not right at its edge", () => {
    expect(findRespawn(level, 3, 0)).toEqual({ col: 1, row: 2 });
  });

  it("never goes back past the left edge of the screen", () => {
    expect(findRespawn(level, 3, 2)).toEqual({ col: 2, row: 2 });
  });
});

describe("tileVariant", () => {
  const grid = [
    [null, "car", "car", "car", null],
    [null, null, "ground", null, null],
    [null, null, "ground", null, null],
  ];

  it("uses left and right ends for rows of the same tile", () => {
    expect(tileVariant(grid, 1, 0)).toBe("left");
    expect(tileVariant(grid, 2, 0)).toBe("art");
    expect(tileVariant(grid, 3, 0)).toBe("right");
  });

  it("uses the under drawing when the same tile is on top", () => {
    expect(tileVariant(grid, 2, 1)).toBe("art");
    expect(tileVariant(grid, 2, 2)).toBe("under");
  });
});
