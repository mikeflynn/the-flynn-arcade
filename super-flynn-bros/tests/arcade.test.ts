import { describe, expect, it, vi } from "vitest";
import { validateGames } from "@web-games/arcade";
import { parseFrames } from "@web-games/pixel-art";
import { arcadeInfo } from "../arcade";

describe("arcade.ts", () => {
  it("is a valid arcade registration", () => {
    const warn = vi.fn();
    expect(validateGames([{ folder: "super-flynn-bros", info: arcadeInfo }], warn)).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("has a clean cabinet screen picture", () => {
    const { colors, art } = arcadeInfo.screenArt;
    expect(parseFrames([art], colors, "screen").warnings).toEqual([]);
  });
});
