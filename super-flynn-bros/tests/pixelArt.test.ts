import { describe, expect, it } from "vitest";
import { parseFrames, stripFrameCount, UNKNOWN_COLOR } from "../src/engine/pixelArt";

const colors = { R: "#ff0000", B: "#0000ff" };

describe("parseFrames", () => {
  it("turns characters into colors and dots into see-through pixels", () => {
    const sheet = parseFrames([["R.", " B"]], colors, "test");
    expect(sheet.width).toBe(2);
    expect(sheet.height).toBe(2);
    expect(sheet.frames[0].pixels).toEqual(["#ff0000", null, null, "#0000ff"]);
    expect(sheet.warnings).toEqual([]);
  });

  it("shows pink for characters with no color, and says which ones", () => {
    const sheet = parseFrames([["RZ"]], colors, "dog");
    expect(sheet.frames[0].pixels).toEqual(["#ff0000", UNKNOWN_COLOR]);
    expect(sheet.warnings).toHaveLength(1);
    expect(sheet.warnings[0]).toContain('dog: there\'s no color for "Z"');
  });

  it("fills short rows with see-through pixels and warns", () => {
    const sheet = parseFrames([["RRR", "R"]], colors, "wall");
    expect(sheet.frames[0].pixels).toEqual(["#ff0000", "#ff0000", "#ff0000", "#ff0000", null, null]);
    expect(sheet.warnings[0]).toContain("row 2 is 1 pixels wide");
  });

  it("gives every frame the same size, padding short frames at the top", () => {
    const sheet = parseFrames([["R", "R"], ["B"]], colors, "hero");
    expect(sheet.height).toBe(2);
    expect(sheet.frames[1].pixels).toEqual([null, "#0000ff"]);
  });
});

describe("stripFrameCount", () => {
  it("spots a strip of frames", () => {
    expect(stripFrameCount(64, 32, 16, 32, 4)).toBe(4);
  });

  it("spots a single picture", () => {
    expect(stripFrameCount(100, 200, 16, 32, 4)).toBe(1);
  });

  it("is always 1 for single-frame art", () => {
    expect(stripFrameCount(64, 16, 16, 16, 1)).toBe(1);
  });
});
