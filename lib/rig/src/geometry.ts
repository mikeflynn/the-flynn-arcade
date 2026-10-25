export type Pt = { x: number; y: number };

export const pts = (a: [number, number][]): Pt[] => a.map(([x, y]) => ({ x, y }));

export function ellipse(x: number, y: number, w: number, h: number, n = 22): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: x + (Math.cos(a) * w) / 2, y: y + (Math.sin(a) * h) / 2 };
  });
}

/** Keep the part of the polygon where nx*x + ny*y <= d. */
export function clipHalfPlane(poly: Pt[], nx: number, ny: number, d: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i]!;
    const B = poly[(i + 1) % poly.length]!;
    const da = nx * A.x + ny * A.y - d;
    const db = nx * B.x + ny * B.y - d;
    if (da <= 0) out.push(A);
    if (da <= 0 !== db <= 0) {
      const t = da / (da - db);
      out.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
    }
  }
  return out;
}
