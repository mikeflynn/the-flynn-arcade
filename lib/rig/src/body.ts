import type { Look } from "./look";

/** Every number that sizes a fighter's body, in art units. Built from the Look. */
export interface BodyDims {
  k: number; // height
  b: number; // build
  m: number; // muscle
  w: number; // build x muscle
  chestH: number;
  S: number; // shoulder spread
  Lt: number; // chest width
  Wb: number; // waist width
  waistH: number;
  hipsHalf: number;
  uaL: number;
  faL: number;
  thighL: number;
  thighW: number;
  shinL: number;
  fist: number;
  footScale: number;
  neckHalf: number;
  headScale: number;
  feminine: boolean;
}

export type PartName =
  | "neck" | "chest" | "waist" | "hips" | "knot" | "ua" | "fa" | "thigh" | "shin" | "foot" | "hand" | "head";

const BUILD_FACTOR: Record<string, number> = { lean: 0.92, medium: 1, big: 1.18 };

const clamp = (v: number, lo: number, hi: number, fallback: number) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

export function bodyDims(look: Look): BodyDims {
  const k = clamp(look.height, 0.85, 1.15, 1);
  const m = clamp(look.muscle, 0.8, 1.4, 1);
  const b = BUILD_FACTOR[look.build] ?? 1;
  const w = b * m;
  if (look.body === "feminine") {
    return {
      k, b, m, w, chestH: 68 * k, S: 50 * w, Lt: 33 * w, Wb: 18 * b, waistH: 38 * k, hipsHalf: 34 * b,
      uaL: 57 * k, faL: 51 * k, thighL: 84 * k, thighW: 1.08, shinL: 80 * k, fist: 1.27 * Math.sqrt(w),
      footScale: 1.15, neckHalf: 11, headScale: 1.2, feminine: true,
    };
  }
  return {
    k, b, m, w, chestH: 72 * k, S: 62 * w, Lt: 40 * w, Wb: 22 * b, waistH: 36 * k, hipsHalf: 30 * b,
    uaL: 60 * k, faL: 54 * k, thighL: 80 * k, thighW: 1, shinL: 78 * k, fist: 1.5 * Math.sqrt(w),
    footScale: 1.28, neckHalf: 15, headScale: 1.24, feminine: false,
  };
}
