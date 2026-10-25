import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK } from "../src/look";
import { flatFeet, type Animation, type Pose } from "../src/pose";
import { packCells } from "../src/bake/pack";
import { planFrames, STANCE } from "../src/bake/plan";
import { snapToPalette } from "../src/bake/quantize";

describe("snapToPalette", () => {
  it("snaps opaque pixels to the nearest palette color and clears faint ones", () => {
    const px = new Uint8ClampedArray([250, 10, 10, 255, 10, 10, 240, 200, 0, 0, 0, 50]);
    snapToPalette(px, [0xff0000, 0x0000ff]);
    expect([...px.slice(0, 8)]).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);
    expect(px[11]).toBe(0);
  });

  it("leaves only palette colors behind", () => {
    const palette = [0x160c22, 0xf1c08f, 0x2f6fd6, 0xffffff];
    const px = new Uint8ClampedArray(4 * 500);
    for (let i = 0; i < px.length; i++) px[i] = (i * 97 + 13) % 256;
    snapToPalette(px, palette);
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      expect(px[i + 3]).toBe(255);
      expect(palette).toContain((px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!);
    }
  });
});

describe("packCells", () => {
  const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }, w: number, h: number) =>
    a.x < b.x + w && b.x < a.x + w && a.y < b.y + h && b.y < a.y + h;

  it("fits 300 cells of 100×120 on one 2048 page without overlaps", () => {
    const spots = packCells(Array.from({ length: 300 }, () => ({ w: 100, h: 120 })), 2048);
    expect(new Set(spots.map((s) => s.page))).toEqual(new Set([0]));
    for (const s of spots) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + 100).toBeLessThanOrEqual(2048);
      expect(s.y + 120).toBeLessThanOrEqual(2048);
    }
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) expect(overlaps(spots[i]!, spots[j]!, 100, 120)).toBe(false);
    }
  });

  it("spills onto a second page when the first is full", () => {
    const spots = packCells(Array.from({ length: 400 }, () => ({ w: 100, h: 120 })), 2048);
    expect(Math.max(...spots.map((s) => s.page))).toBe(1);
  });

  it("refuses a cell bigger than the page", () => {
    expect(() => packCells([{ w: 3000, h: 10 }], 2048)).toThrow(/bigger than/);
  });
});

describe("planFrames", () => {
  const P = (o: Pose = {}): Pose => flatFeet({ ...STANCE, ...o });
  const stance: Animation = { loop: true, keys: [{ pose: P(), frames: 1, ease: "linear" }] };
  const punch: Animation = {
    loop: false,
    keys: [
      { pose: P({ fUA: -80 }), frames: 4, ease: "snap" },
      { pose: P({ fUA: -90, fFA: -10, hand: "palm" }), frames: 2, ease: "snap" },
      { pose: P(), frames: 6, ease: "linear" },
    ],
  };

  it("bakes every held frame, plus the final pose of a non-looping animation", () => {
    const { index } = planFrames(DEFAULT_LOOK, { punch }, 20, STANCE);
    expect(index.punch!.map((e) => e.frame)).toEqual([0, 3, 4, 6, 9, 12]);
  });

  it("bakes a looping 4/2/6 animation at its held frames only", () => {
    const loop: Animation = { ...punch, loop: true };
    const { index } = planFrames(DEFAULT_LOOK, { loop }, 20, STANCE);
    expect(index.loop!.map((e) => e.frame)).toEqual([0, 3, 4, 6, 9]);
  });

  it("shares one job between identical poses", () => {
    const { jobs, index } = planFrames(DEFAULT_LOOK, { stance, punch }, 20, STANCE);
    // The punch ends in the stance pose (frame 12), so it reuses the stance's job.
    expect(index.punch!.at(-1)!.job).toBe(index.stance![0]!.job);
    expect(jobs.length).toBeLessThan(index.stance!.length + index.punch!.length);
  });

  it("draws limbs as one outline then one fill, and single parts in one go", () => {
    const { jobs } = planFrames(DEFAULT_LOOK, { stance, punch }, 20, STANCE);
    for (const job of jobs) {
      expect(job.steps.slice(0, 6).map((s) => [s.mode, s.back])).toEqual([
        ["outline", true], ["outline", true], ["outline", true],
        ["fill", true], ["fill", true], ["fill", true],
      ]);
      // bUA, bFA, bH: the back hand is a fist, or a palm when the pose opens it.
      expect(job.steps.slice(0, 2).map((s) => s.shape)).toEqual(["ua", "fa"]);
      expect(["fist", "palm"]).toContain(job.steps[2]!.shape);
      const knots = job.steps.filter((s) => s.shape === "knot");
      expect(knots.map((s) => s.mode)).toEqual(["both"]);
      const heads = job.steps.filter((s) => s.shape === "head" || s.shape === "headHit");
      expect(heads.map((s) => s.mode)).toEqual(["both"]);
    }
  });

  it("keeps an airborne pose on the standing pose's ground", () => {
    const jump: Animation = { loop: true, keys: [{ pose: P({ fTh: -80, fSh: 100, plant: "" }), frames: 1, ease: "linear" }] };
    const { jobs, index } = planFrames(DEFAULT_LOOK, { stance, jump }, 20, STANCE);
    expect(jobs[index.jump![0]!.job]!.ground).toBe(jobs[index.stance![0]!.job]!.ground);
  });

  it("swaps hands for palms and the head for the hit face", () => {
    const { jobs, index } = planFrames(DEFAULT_LOOK, { punch }, 20, STANCE);
    const palmJob = jobs[index.punch!.find((e) => e.frame === 4)!.job]!;
    expect(palmJob.steps.filter((s) => s.shape === "palm")).toHaveLength(4); // both hands, outline + fill
    expect(palmJob.steps.some((s) => s.shape === "fist" || s.shape === "fistArmed")).toBe(false);

    const normal = jobs[index.punch![0]!.job]!;
    expect(normal.steps.filter((s) => s.shape === "fistArmed" && !s.back)).toHaveLength(2);
    expect(normal.steps.filter((s) => s.shape === "fist" && s.back)).toHaveLength(2);

    const hit: Animation = { loop: true, keys: [{ pose: P({ face: "hit" }), frames: 1, ease: "linear" }] };
    const hj = planFrames(DEFAULT_LOOK, { hit }, 20, STANCE);
    expect(hj.jobs[0]!.steps.some((s) => s.shape === "headHit")).toBe(true);
    expect(hj.jobs[0]!.steps.some((s) => s.shape === "head")).toBe(false);
  });

  it("places steps relative to the feet point", () => {
    const { jobs } = planFrames(DEFAULT_LOOK, { stance }, 20, STANCE);
    const job = jobs[0]!;
    const hips = job.steps.find((s) => s.shape === "hips")!;
    expect(hips.x).toBe(0);
    expect(hips.y).toBeCloseTo(-job.ground);
    expect(job.world.hips).toBeDefined();
  });
});
