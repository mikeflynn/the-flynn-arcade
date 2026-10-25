import { describe, expect, it } from "vitest";
import { stepsToRun } from "../src/render/loop";

describe("stepsToRun", () => {
  it("runs one step for one 60th of a second", () => {
    const r = stepsToRun(0, 16.7, 1);
    expect(r.steps).toBe(1);
    expect(r.accMs).toBeCloseTo(16.7 - 1000 / 60, 6);
  });

  it("keeps leftover time for the next frame", () => {
    const r = stepsToRun(0, 10, 1);
    expect(r.steps).toBe(0);
    expect(r.accMs).toBe(10);
    expect(stepsToRun(r.accMs, 10, 1).steps).toBe(1);
  });

  it("never runs more than 5 steps, and drops the time past the cap", () => {
    const r = stepsToRun(0, 5000, 1);
    expect(r.steps).toBe(5);
    expect(r.accMs).toBeGreaterThanOrEqual(0);
    expect(r.accMs).toBeLessThan(1000 / 60);
  });

  it("speed 4 makes each step 1000/90 ms long", () => {
    const step = 1000 / 90;
    expect(stepsToRun(0, step * 3 + 0.001, 4).steps).toBe(3);
    expect(stepsToRun(0, step - 0.001, 4).steps).toBe(0);
    expect(stepsToRun(0, step * 2 + 1, 4).accMs).toBeCloseTo(1, 6);
  });

  it("treats a strange speed as the nearest real one", () => {
    expect(stepsToRun(0, 1000 / 60, Number.NaN).steps).toBe(1);
    expect(stepsToRun(0, 1000 / 90 + 0.001, 99).steps).toBe(1);
  });
});
