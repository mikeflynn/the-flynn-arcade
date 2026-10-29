import { describe, expect, it, vi } from "vitest";
import { alternateColors, DEFAULT_LOOK } from "@web-games/rig";
import { bakedFighter } from "../src/render/bakeCache";

// Baking draws on a real canvas, which tests don't have: count bakes instead.
const { bakeFighter } = vi.hoisted(() => ({
  bakeFighter: vi.fn(() => ({ pages: [], frames: [], index: {}, anims: {}, scale: 0.4, colors: 0, ms: 0 })),
}));
vi.mock("@web-games/rig/canvas", () => ({ bakeFighter }));

describe("bakedFighter", () => {
  it("bakes a fighter once and reuses it for the next fight", () => {
    bakeFighter.mockClear();
    const a = bakedFighter("a", DEFAULT_LOOK, 20);
    expect(bakedFighter("a", { ...DEFAULT_LOOK }, 20)).toBe(a);
    expect(bakeFighter).toHaveBeenCalledTimes(1);
  });

  it("bakes again for a different look, frame rate or fighter", () => {
    bakeFighter.mockClear();
    const a = bakedFighter("b", DEFAULT_LOOK, 20);
    expect(bakedFighter("b", alternateColors(DEFAULT_LOOK), 20)).not.toBe(a); // a mirror match's second outfit
    expect(bakedFighter("b", DEFAULT_LOOK, 30)).not.toBe(a);
    expect(bakedFighter("c", DEFAULT_LOOK, 20)).not.toBe(a);
    expect(bakeFighter).toHaveBeenCalledTimes(4);
  });

  it("keeps only the last 3, forgetting the one used longest ago", () => {
    const first = bakedFighter("p1", DEFAULT_LOOK, 20);
    bakedFighter("r1", DEFAULT_LOOK, 20);
    bakedFighter("p1", DEFAULT_LOOK, 20); // player 1 fights again: now the newest
    bakedFighter("r2", DEFAULT_LOOK, 20);
    bakedFighter("r3", DEFAULT_LOOK, 20);
    bakeFighter.mockClear();
    expect(bakedFighter("p1", DEFAULT_LOOK, 20)).toBe(first);
    expect(bakeFighter).not.toHaveBeenCalled();
    bakedFighter("r1", DEFAULT_LOOK, 20);
    expect(bakeFighter).toHaveBeenCalledTimes(1);
  });
});
