import { describe, expect, it, vi } from "vitest";
import { clampSettings } from "../src/engine/validate";
import { settingLimits } from "../src/engine/limits";
import { mySettings } from "../src/settings";

const limits = { speed: { min: 1, max: 10 }, volume: { min: 0, max: 1 } };

describe("clampSettings", () => {
  it("keeps values that are in range", () => {
    const warn = vi.fn();
    expect(clampSettings({ speed: 5, volume: 0.5, name: "x" }, limits, warn)).toEqual({ speed: 5, volume: 0.5, name: "x" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("fixes values that are too big or too small, and says why", () => {
    const warn = vi.fn();
    expect(clampSettings({ speed: 50, volume: -1 }, limits, warn)).toEqual({ speed: 10, volume: 0 });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain("speed = 50 is too big");
  });

  it("replaces things that aren't numbers", () => {
    const warn = vi.fn();
    const result = clampSettings({ speed: Number.NaN, volume: "loud" as unknown as number }, limits, warn);
    expect(result).toEqual({ speed: 1, volume: 0 });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("settings.ts", () => {
  it("ships with every value inside its safe range", () => {
    const warn = vi.fn();
    clampSettings(mySettings, settingLimits, warn);
    expect(warn).not.toHaveBeenCalled();
  });

  it("has a limit for every setting and a setting for every limit", () => {
    expect(Object.keys(settingLimits).sort()).toEqual(Object.keys(mySettings).sort());
  });
});
