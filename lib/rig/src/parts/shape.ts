import { pts, type Pt } from "../geometry";
import type { Layer, Line, PartShape } from "../paint";

type LayerOpts = Omit<Layer, "p" | "c">;

/** A layer from a list of [x, y] corner pairs. */
export const poly = (p: [number, number][], c: number, o: LayerOpts = {}): Layer => ({ p: pts(p), c, ...o });
/** A layer from points that already exist (e.g. an ellipse). */
export const blob = (p: Pt[], c: number, o: LayerOpts = {}): Layer => ({ p, c, ...o });

/** Bundle layers and lines into a PartShape, measuring the bbox from the real points. */
export function shapeOf(layers: Layer[], lines: Line[] = []): PartShape {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const see = (x: number, y: number) => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  for (const L of layers) for (const q of L.p) see(q.x, q.y);
  for (const l of lines) for (const [x, y] of l.p) see(x, y);
  return { layers, lines, bbox: { x0, y0, x1, y1 } };
}

/** Scale a whole part around its joint (x by sx, y by sy). Shade/highlight cut lines scale with it. */
export function scaleShape(s: PartShape, sx: number, sy = sx): PartShape {
  const layers = s.layers.map((L) => {
    const o: Layer = { ...L, p: L.p.map((q) => ({ x: q.x * sx, y: q.y * sy })) };
    if (L.shade !== undefined) o.shade = L.shade * sx;
    if (L.deep !== undefined) o.deep = L.deep * sx;
    if (L.hi !== undefined) o.hi = L.hi * sx;
    return o;
  });
  const lines = s.lines.map((l) => ({ ...l, p: l.p.map(([x, y]) => [x * sx, y * sy] as [number, number]) }));
  return shapeOf(layers, lines);
}

/** Move a whole part. Shade/highlight cuts are measured along x, so they move with dx. */
export function shiftShape(s: PartShape, dx: number, dy: number): PartShape {
  const layers = s.layers.map((L) => {
    const o: Layer = { ...L, p: L.p.map((q) => ({ x: q.x + dx, y: q.y + dy })) };
    if (L.shade !== undefined) o.shade = L.shade + dx + (L.tilt ?? 0) * dy;
    if (L.hi !== undefined) o.hi = L.hi + dx;
    return o;
  });
  const lines = s.lines.map((l) => ({ ...l, p: l.p.map(([x, y]) => [x + dx, y + dy] as [number, number]) }));
  return shapeOf(layers, lines);
}
