import { describe, expect, it, vi } from "vitest";
import { clampSettings } from "@web-games/settings";
import { settingLimits } from "../src/engine/limits";
import { mySettings } from "../src/settings";

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
