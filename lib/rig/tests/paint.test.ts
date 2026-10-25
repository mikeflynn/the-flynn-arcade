import { describe, expect, it } from "vitest";
import { OUTLINE_WIDTH, paintCommands, type PartShape } from "../src/paint";
import { pts } from "../src/geometry";
import { outlineOf } from "../src/color";

const square = pts([[-10, -10], [10, -10], [10, 10], [-10, 10]]);
const shape = (layer: object): PartShape => ({
  layers: [{ p: square, c: 0x00ff00, ...layer }],
  lines: [],
  bbox: { x0: -10, y0: -10, x1: 10, y1: 10 },
});

describe("paintCommands", () => {
  const cmds = paintCommands(shape({ shade: 0, hi: 5 }));
  it("starts with an outline fill and stroke", () => {
    expect(cmds[0]).toMatchObject({ kind: "fill", color: outlineOf(0x00ff00) });
    expect(cmds[1]).toMatchObject({ kind: "stroke", color: outlineOf(0x00ff00), width: OUTLINE_WIDTH, closed: true });
  });
  it("then base, shadow, highlight", () => {
    expect(cmds[2]).toMatchObject({ kind: "fill", color: 0x00ff00 });
    const shadow = cmds[3]!;
    expect(shadow.kind).toBe("fill");
    if (shadow.kind === "fill") expect(shadow.pts.every((q) => q.x <= 0)).toBe(true);
    const hi = cmds[cmds.length - 1]!;
    expect(hi.kind).toBe("fill");
    if (hi.kind === "fill") expect(hi.pts.every((q) => q.x >= 5)).toBe(true);
  });
  it("skips the outline when outline is false", () => {
    const c = paintCommands(shape({ outline: false }));
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ kind: "fill", color: 0x00ff00 });
  });
  it("splits by mode", () => {
    const o = paintCommands(shape({ shade: 0, hi: 5 }), "outline");
    const f = paintCommands(shape({ shade: 0, hi: 5 }), "fill");
    expect(o).toHaveLength(2);
    expect(f).toHaveLength(cmds.length - 2);
    expect([...o, ...f]).toEqual(cmds);
  });
  it("draws ink strokes and lines", () => {
    const c = paintCommands({ ...shape({ ink: true }), lines: [{ p: [[0, 0], [5, 5]] }] });
    expect(c[c.length - 2]).toMatchObject({ kind: "stroke", width: 3, closed: true });
    expect(c[c.length - 1]).toMatchObject({ kind: "stroke", width: 3, color: 0x160c22, closed: false });
  });
});
