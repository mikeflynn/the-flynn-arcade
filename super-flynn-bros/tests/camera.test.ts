import { describe, expect, it } from "vitest";
import { nextScrollX } from "../src/engine/camera";

describe("nextScrollX", () => {
  it("stays put until the leader passes the lead line", () => {
    expect(nextScrollX(0, 100, 320, 3200)).toBe(0);
  });

  it("follows the leader forward", () => {
    expect(nextScrollX(0, 400, 320, 3200)).toBe(272);
  });

  it("never scrolls backward", () => {
    expect(nextScrollX(500, 400, 320, 3200)).toBe(500);
  });

  it("stops at the end of the level", () => {
    expect(nextScrollX(0, 5000, 320, 3200)).toBe(2880);
  });

  it("handles a level narrower than the screen", () => {
    expect(nextScrollX(0, 200, 320, 200)).toBe(0);
  });
});
