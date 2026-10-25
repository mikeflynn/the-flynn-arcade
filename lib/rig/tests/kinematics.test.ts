import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK } from "../src/look";
import { bodyDims } from "../src/body";
import { skeleton } from "../src/skeleton";
import { groundOffset, plantFeet, solvePose, type Pose } from "../src/kinematics";

const d = bodyDims(DEFAULT_LOOK);
const bones = skeleton(d);
const base = { torso: 4, chest: 6, head: -8, fUA: -58, fFA: -100, bUA: -22, bFA: -118, fTh: -32, fSh: 38, bTh: 30, bSh: 22 };
const STANCE: Pose = { ...base, fFt: -(base.fTh + base.fSh), bFt: -(base.bTh + base.bSh) };

describe("solvePose", () => {
  it("hangs the shin straight below the thigh at rest", () => {
    const w = solvePose(bones, {});
    expect(w.fSh.x).toBeCloseTo(w.fTh.x);
    expect(w.fSh.y).toBeGreaterThan(w.fTh.y);
  });

  it("turns the whole body with the hips", () => {
    // Positive angles lean toward +x (the way the fighter faces), so a negative hips angle tips the head back.
    const back = solvePose(bones, { hips: -90 });
    expect(back.head.x).toBeLessThan(back.hips.x);
    const forward = solvePose(bones, { hips: 90 });
    expect(forward.head.x).toBeGreaterThan(forward.hips.x);
  });

  it("carries the forearm with the upper arm", () => {
    const w = solvePose(bones, { fUA: -90 });
    expect(w.fFA.x).toBeGreaterThan(w.fUA.x);
    expect(Math.abs(w.fFA.y - w.fUA.y)).toBeLessThan(1);
  });

  it("ignores non-number pose values", () => {
    const w = solvePose(bones, { fUA: "oops", plant: "fb" });
    expect(w.fFA.r).toBeCloseTo(0);
  });
});

describe("plantFeet", () => {
  it("puts both ankles on the same floor", () => {
    const raw = solvePose(bones, STANCE);
    expect(raw.bFt.y).toBeLessThan(raw.fFt.y);
    const w = solvePose(bones, plantFeet(bones, STANCE, d));
    expect(Math.abs(w.bFt.y - w.fFt.y)).toBeLessThan(0.5);
    expect(Math.abs(w.fFt.x - raw.fFt.x)).toBeLessThan(0.5);
  });

  it("does not slide a foot that can reach the floor where it is", () => {
    // The full stance asks the back leg to stretch farther than it can, so it slides in.
    // With a flatter back leg, nothing has to move sideways.
    const pose: Pose = { ...STANCE, bTh: 10, bSh: 14, bFt: -24 };
    const raw = solvePose(bones, pose);
    const w = solvePose(bones, plantFeet(bones, pose, d));
    expect(Math.abs(w.bFt.y - w.fFt.y)).toBeLessThan(0.5);
    expect(Math.abs(w.bFt.x - raw.bFt.x)).toBeLessThan(0.5);
  });

  it("leaves the unplanted leg alone, and everything when airborne", () => {
    const out = plantFeet(bones, { ...STANCE, plant: "f" }, d);
    expect(out.bTh).toBe(STANCE.bTh);
    expect(out.bSh).toBe(STANCE.bSh);
    expect(out.bFt).toBe(STANCE.bFt);
    const air = { ...STANCE, plant: "" };
    expect(plantFeet(bones, air, d)).toEqual(air);
  });

  it("bends knees toward the opponent", () => {
    const w = solvePose(bones, plantFeet(bones, STANCE, d));
    for (const [th, sh, ft] of [["fTh", "fSh", "fFt"], ["bTh", "bSh", "bFt"]] as const) {
      const t = (w[sh].y - w[th].y) / (w[ft].y - w[th].y);
      const lineX = w[th].x + t * (w[ft].x - w[th].x);
      expect(w[sh].x).toBeGreaterThan(lineX);
    }
  });

  it("straightens an unreachable leg without NaN", () => {
    const out = plantFeet(bones, { ...STANCE, bTh: -80, bSh: 0, bFt: 80 }, d);
    const w = solvePose(bones, out);
    for (const v of Object.values(w)) expect(Number.isFinite(v.x + v.y + v.r)).toBe(true);
    for (const k of ["fTh", "fSh", "fFt", "bTh", "bSh", "bFt"]) expect(Number.isFinite(out[k] as number)).toBe(true);
  });

  it("keeps planted feet flat", () => {
    const w = solvePose(bones, plantFeet(bones, STANCE, d));
    expect(Math.abs((w.fFt.r * 180) / Math.PI)).toBeLessThan(0.5);
    expect(Math.abs((w.bFt.r * 180) / Math.PI)).toBeLessThan(0.5);
  });
});

describe("groundOffset", () => {
  it("is the lowest ankle plus 26", () => {
    const w = solvePose(bones, plantFeet(bones, STANCE, d));
    expect(groundOffset(w)).toBeCloseTo(Math.max(w.fFt.y, w.bFt.y) + 26);
  });
});
