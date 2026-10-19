import { describe, expect, it } from "vitest";
import { fitBody } from "../src/engine/sprites";

describe("fitBody", () => {
  it("uses the hitbox as-is for text-drawn art, centered at the feet", () => {
    expect(fitBody({ width: 16, height: 32 }, { width: 16, height: 32 }, { width: 10, height: 30 })).toEqual({
      scale: 1,
      width: 10,
      height: 30,
      offsetX: 3,
      offsetY: 2,
    });
  });

  it("shrinks a big custom PNG to the art's size and scales the hitbox to match", () => {
    expect(fitBody({ width: 64, height: 128 }, { width: 16, height: 32 }, { width: 10, height: 30 })).toEqual({
      scale: 0.25,
      width: 40,
      height: 120,
      offsetX: 12,
      offsetY: 8,
    });
  });

  it("keeps an odd-shaped PNG inside the art's box and its hitbox inside the picture", () => {
    const fit = fitBody({ width: 100, height: 100 }, { width: 16, height: 32 }, { width: 10, height: 30 });
    expect(fit.scale).toBeCloseTo(0.16);
    expect(fit.width).toBeLessThanOrEqual(100);
    expect(fit.height).toBe(100);
    expect(fit.offsetY).toBe(0);
  });

  it("uses the whole picture as the hitbox when none is given", () => {
    expect(fitBody({ width: 10, height: 10 }, { width: 10, height: 10 })).toMatchObject({ width: 10, height: 10, offsetX: 0, offsetY: 0 });
  });
});
