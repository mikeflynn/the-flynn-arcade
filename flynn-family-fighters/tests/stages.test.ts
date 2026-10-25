import { describe, expect, it } from "vitest";
import { normalizeStage, STAGES } from "../src/stages";

describe("STAGES", () => {
  it("has the four starter stages, with the track first", () => {
    expect(STAGES.map((s) => s.id)).toEqual(["track", "schoolyard", "ballfield", "backyard"]);
  });

  it("are all already tidy (normalizing changes nothing and warns about nothing)", () => {
    for (const stage of STAGES) {
      const warnings: string[] = [];
      expect(normalizeStage(stage, (m) => warnings.push(m))).toEqual(stage);
      expect(warnings).toEqual([]);
    }
  });
});

describe("normalizeStage", () => {
  it("fixes a broken sky with a warning, keeps the id and fills in the rest", () => {
    const warnings: string[] = [];
    const stage = normalizeStage({ id: "moon", sky: ["nope"] }, (m) => warnings.push(m));
    expect(stage.id).toBe("moon");
    expect(stage.name).toBe("MOON");
    expect(stage.sky).toEqual(STAGES[0]!.sky);
    expect(stage.mountains).toEqual(STAGES[0]!.mountains);
    expect(stage.floor).toBe(STAGES[0]!.floor);
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
    expect(normalizeStage(42, (m) => warnings.push(m))).toEqual(STAGES[0]);
    expect(warnings).toHaveLength(1);
  });

  it("drops mountain colors that aren't colors", () => {
    const stage = normalizeStage({ id: "hills", mountains: ["#112233", "blue-ish", "#445566"] }, () => {});
    expect(stage.mountains).toEqual(["#112233", "#445566"]);
  });
});
