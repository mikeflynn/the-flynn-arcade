import { INK, darken, lighten, outlineOf } from "./color";
import { clipHalfPlane, pts, type Pt } from "./geometry";

/** Outline thickness in art units (the baker keeps it about 2.5 real pixels). */
export const OUTLINE_WIDTH = 5;

export interface Layer {
  p: Pt[];
  c: number;
  outline?: boolean;
  ink?: boolean;
  shade?: number;
  tilt?: number;
  deep?: number;
  hi?: number;
}
export interface Line { p: [number, number][]; w?: number; c?: number }
export interface PartShape {
  layers: Layer[];
  lines: Line[];
  bbox: { x0: number; y0: number; x1: number; y1: number };
}
export type DrawCmd =
  | { kind: "fill"; pts: Pt[]; color: number }
  | { kind: "stroke"; pts: Pt[]; color: number; width: number; closed: boolean };
export type PaintMode = "both" | "outline" | "fill";

/** Turn a part's layers into flat cel-shaded draw commands (no drawing happens here). */
export function paintCommands(shape: PartShape, mode: PaintMode = "both"): DrawCmd[] {
  const out: DrawCmd[] = [];
  const fill = (p: Pt[], color: number) => { if (p.length >= 3) out.push({ kind: "fill", pts: p, color }); };

  if (mode !== "fill") {
    for (const L of shape.layers) {
      if (L.outline === false) continue;
      const o = outlineOf(L.c);
      fill(L.p, o);
      out.push({ kind: "stroke", pts: L.p, color: o, width: OUTLINE_WIDTH, closed: true });
    }
  }
  if (mode === "outline") return out;

  for (const L of shape.layers) {
    fill(L.p, L.c);
    if (L.shade !== undefined) {
      fill(clipHalfPlane(L.p, 1, L.tilt ?? 0, L.shade), darken(L.c, 0.3));
      fill(clipHalfPlane(L.p, 1, L.tilt ?? 0, L.shade - (L.deep ?? 9)), darken(L.c, 0.5));
    }
    if (L.hi !== undefined) fill(clipHalfPlane(L.p, -1, 0, -L.hi), lighten(L.c, 0.38));
    if (L.ink) out.push({ kind: "stroke", pts: L.p, color: outlineOf(L.c), width: 3, closed: true });
  }
  for (const l of shape.lines) {
    out.push({ kind: "stroke", pts: pts(l.p), color: l.c ?? INK, width: l.w ?? 3, closed: false });
  }
  return out;
}
