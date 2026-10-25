import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK } from "../src/look";
import { bodyDims } from "../src/body";
import { LIMB_GROUPS, skeleton } from "../src/skeleton";

const NAMES = [
  "bUA", "bFA", "bH", "bFt", "bTh", "bSh", "hips", "fFt", "fTh", "fSh",
  "waist", "knot", "chest", "neck", "head", "fUA", "fFA", "fH",
];

describe("skeleton", () => {
  const bones = skeleton(bodyDims(DEFAULT_LOOK));

  it("has the 18 bones", () => {
    expect(bones.length).toBe(18);
    expect(bones.map((b) => b.name).sort()).toEqual([...NAMES].sort());
  });

  it("only names parents that exist", () => {
    const names = new Set(bones.map((b) => b.name));
    for (const b of bones) if (b.parent !== null) expect(names.has(b.parent)).toBe(true);
  });

  it("hangs the waist under the hips and turns the neck with the head", () => {
    const waist = bones.find((b) => b.name === "waist")!;
    expect(waist.parent).toBe("hips");
    expect(waist.at).toEqual({ x: 0, y: 0 });
    expect(waist.angleKey).toBe("torso");
    expect(bones.find((b) => b.name === "neck")!.angleKey).toBe("head");
  });

  it("draws every bone exactly once", () => {
    expect([...LIMB_GROUPS.flat()].sort()).toEqual([...NAMES].sort());
  });
});

describe("bodyDims", () => {
  it("gives the feminine frame a narrower chest, wider hips and longer thighs", () => {
    const m = bodyDims({ ...DEFAULT_LOOK, body: "masculine" });
    const f = bodyDims({ ...DEFAULT_LOOK, body: "feminine" });
    expect(f.feminine).toBe(true);
    expect(m.feminine).toBe(false);
    expect(f.S).toBeLessThan(m.S);
    expect(f.hipsHalf).toBeGreaterThan(m.hipsHalf);
    expect(f.thighL).toBeGreaterThan(m.thighL);
  });

  it("makes taller looks have longer thighs", () => {
    const short = bodyDims({ ...DEFAULT_LOOK, height: 0.9 });
    const tall = bodyDims({ ...DEFAULT_LOOK, height: 1.1 });
    expect(tall.thighL).toBeGreaterThan(short.thighL);
  });
});
