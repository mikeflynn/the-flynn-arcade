import { describe, expect, it } from "vitest";
import { clipHalfPlane, ellipse, pts, type Pt } from "../src/geometry";
import { darken, hex, outlineOf, INK } from "../src/color";

const area = (p: Pt[]) =>
  Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]!; return s + a.x * b.y - b.x * a.y; }, 0)) / 2;
const square = pts([[-10, -10], [10, -10], [10, 10], [-10, 10]]);

describe("geometry", () => {
  it("clips a square to its left half", () => {
    const out = clipHalfPlane(square, 1, 0, 0);
    expect(out.every((q) => q.x <= 0)).toBe(true);
    expect(area(out)).toBeCloseTo(200);
  });
  it("returns [] when everything is clipped away", () => {
    expect(clipHalfPlane(square, 1, 0, -100)).toEqual([]);
  });
  it("makes a 22-point ellipse inside its box", () => {
    const e = ellipse(0, 0, 20, 10);
    expect(e.length).toBe(22);
    expect(e.every((q) => Math.abs(q.x) <= 10 && Math.abs(q.y) <= 5)).toBe(true);
  });
});

describe("color", () => {
  it("parses hex with a fallback", () => {
    expect(hex("#ff0000", 0)).toBe(0xff0000);
    expect(hex("banana", 7)).toBe(7);
  });
  it("shadows lean purple", () => {
    const c = darken(0xffffff, 0.5);
    expect(c & 255).toBeGreaterThan((c >> 16) & 255);
  });
  it("outlines are a dark version of the color, not pure ink", () => {
    const s = 0xf1c08f, o = outlineOf(s);
    for (const sh of [16, 8, 0]) expect((o >> sh) & 255).toBeLessThan((s >> sh) & 255);
    expect(o).not.toBe(INK);
  });
});
