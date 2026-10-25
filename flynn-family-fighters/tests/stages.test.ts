import { describe, expect, it } from "vitest";
import { DEFAULT_STAGE, normalizeStage, STAGES } from "../src/stages";

// stages.ts is a kid file: kids add stages and recolor them. These tests only
// check things that stay true after those edits.

describe("STAGES", () => {
  it("still has the four starter stages (kids can add more)", () => {
    const ids = STAGES.map((s) => s.id);
    for (const id of ["track", "schoolyard", "ballfield", "backyard"]) expect(ids).toContain(id);
  });
});

describe("normalizeStage", () => {
  it("leaves the default stage exactly as it is, with no warnings", () => {
    const warnings: string[] = [];
    expect(normalizeStage(DEFAULT_STAGE, (m) => warnings.push(m))).toEqual(DEFAULT_STAGE);
    expect(warnings).toEqual([]);
  });

  it("fixes a broken sky with a warning, keeps the id and fills in the rest", () => {
    const warnings: string[] = [];
    const stage = normalizeStage({ id: "moon", sky: ["nope"] }, (m) => warnings.push(m));
    expect(stage.id).toBe("moon");
    expect(stage.name).toBe("MOON");
    expect(stage.sky).toEqual(DEFAULT_STAGE.sky);
    expect(stage.mountains).toEqual(DEFAULT_STAGE.mountains);
    expect(stage.floor).toBe(DEFAULT_STAGE.floor);
    expect(warnings.some((w) => w.includes("sky"))).toBe(true);
  });

  it("leaves out props it doesn't know, with a warning", () => {
    const warnings: string[] = [];
    const stage = normalizeStage({ id: "park", props: ["palms", "dragon", "swings", 7] }, (m) => warnings.push(m));
    expect(stage.props).toEqual(["palms", "swings"]);
    expect(warnings.some((w) => w.includes("dragon"))).toBe(true);
  });

  it("turns something that isn't a stage at all into the default stage", () => {
    const warnings: string[] = [];
    expect(normalizeStage(42, (m) => warnings.push(m))).toEqual(DEFAULT_STAGE);
    expect(warnings).toHaveLength(1);
  });

  it("drops mountain colors that aren't colors", () => {
    const stage = normalizeStage({ id: "hills", mountains: ["#112233", "blue-ish", "#445566"] }, () => {});
    expect(stage.mountains).toEqual(["#112233", "#445566"]);
  });
});
