import { describe, expect, it } from "vitest";
import { loadLevel, type LoadedLevel } from "../src/engine/levelLoader";
import { catalog } from "../src/engine/catalog";
import { levels } from "../src/levels";
import { themes } from "../src/levels/themes";
import { heroes } from "../src/heroes";
import { mySettings } from "../src/settings";

const GROUND_ROW = 9;

/** How many solid tiles are stacked on top of the ground in a column. */
function stackHeight(level: LoadedLevel, col: number): number {
  let height = 0;
  for (let row = GROUND_ROW - 1; row >= 0 && level.solid[row][col]; row--) height++;
  return height;
}

describe.each(levels.map((def, i) => [i + 1, def] as const))("level %i", (_, def) => {
  const level = loadLevel(def.map, catalog, def.name);

  it("loads without warnings", () => {
    expect(level.warnings).toEqual([]);
  });

  it("is 11 rows tall (one screen)", () => {
    expect(level.rows).toBe(11);
  });

  it("uses a real theme", () => {
    expect(Object.keys(themes)).toContain(def.theme);
  });

  it("starts both heroes and the goal on solid ground", () => {
    for (const cell of [level.starts[1], level.starts[2], level.goal]) {
      expect(level.solid[cell.row + 1][cell.col]).toBe(true);
    }
  });

  it("has no pit wider than 3 tiles", () => {
    let run = 0;
    for (let col = 0; col < level.cols; col++) {
      run = level.solid[GROUND_ROW][col] ? 0 : run + 1;
      expect(run, `pit at column ${col + 1}`).toBeLessThanOrEqual(3);
    }
  });

  it("never needs a step up of more than 2 tiles", () => {
    for (let col = 0; col < level.cols - 1; col++) {
      if (!level.solid[GROUND_ROW][col] || !level.solid[GROUND_ROW][col + 1]) continue;
      expect(stackHeight(level, col + 1) - stackHeight(level, col), `step at column ${col + 2}`).toBeLessThanOrEqual(2);
    }
  });

  it("has hazards and donuts", () => {
    expect(level.hazards.length).toBeGreaterThan(3);
    expect(level.items.filter((i) => i.key === "donut").length).toBeGreaterThan(10);
  });
});

describe("jumping", () => {
  it("both heroes can jump at least 2.5 tiles high with the default settings", () => {
    for (const hero of Object.values(heroes)) {
      const height = hero.jumpPower ** 2 / (2 * mySettings.gravity);
      expect(height, hero.name).toBeGreaterThanOrEqual(40);
    }
  });
});
