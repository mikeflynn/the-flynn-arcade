import { describe, expect, it } from "vitest";
import { afterMatch, gridLayout, type FlowState } from "../src/flow";
import { MOVE_TYPE_NAMES, normalizeFighter, type Fighter } from "../src/fighter";

const make = (id: string): Fighter =>
  normalizeFighter({ name: id.toUpperCase(), look: {}, specials: [] }, id, [...MOVE_TYPE_NAMES], () => {})!;

const arcade = (ladderIndex: number): FlowState => ({
  mode: "arcade",
  p1: make("me"),
  ladder: ["a", "b", "c"].map(make),
  ladderIndex,
});

describe("afterMatch", () => {
  it("arcade: a win moves up the ladder to the next versus screen", () => {
    const { next, flow } = afterMatch(arcade(0), 0);
    expect(next).toBe("versus");
    expect(flow.ladderIndex).toBe(1);
  });

  it("arcade: winning the last fight makes you the champ", () => {
    expect(afterMatch(arcade(2), 0).next).toBe("champ");
  });

  it("arcade: a loss or a draw goes to the continue menu and keeps your place", () => {
    for (const winner of [1, "draw"] as const) {
      const { next, flow } = afterMatch(arcade(1), winner);
      expect(next).toBe("menu");
      expect(flow.ladderIndex).toBe(1);
    }
  });

  it("versus: every result goes to the rematch menu", () => {
    const versus: FlowState = { mode: "versus", p1: make("a"), p2: make("b"), ladder: [], ladderIndex: 0 };
    for (const winner of [0, 1, "draw"] as const) expect(afterMatch(versus, winner).next).toBe("menu");
  });
});

describe("gridLayout", () => {
  const onScreen = (p: { x: number; y: number }, width = 960) =>
    p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= 540;

  it("lays out 2 fighters on screen", () => {
    const g = gridLayout(2);
    expect(g.positions).toHaveLength(2);
    for (const p of g.positions) expect(onScreen(p)).toBe(true);
  });

  it("keeps 13 fighters apart and on screen, whole cells included", () => {
    const g = gridLayout(13);
    expect(g.positions).toHaveLength(13);
    const half = g.cellSize / 2;
    for (const p of g.positions) {
      expect(onScreen({ x: p.x - half, y: p.y - half })).toBe(true);
      expect(onScreen({ x: p.x + half, y: p.y + half })).toBe(true);
    }
    g.positions.forEach((a, i) =>
      g.positions.slice(i + 1).forEach((b) => expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(g.cellSize)),
    );
  });

  it("fits a narrower area too, and a big roster still fits", () => {
    for (const count of [1, 5, 40]) {
      const g = gridLayout(count, 480);
      expect(g.cellSize).toBeGreaterThan(0);
      for (const p of g.positions) expect(onScreen({ x: p.x + g.cellSize / 2, y: p.y + g.cellSize / 2 }, 480)).toBe(true);
    }
  });

  it("has no cells for no fighters", () => {
    expect(gridLayout(0).positions).toEqual([]);
  });
});
