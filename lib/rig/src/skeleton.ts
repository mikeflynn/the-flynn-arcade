import type { BodyDims, PartName } from "./body";

export interface Bone {
  name: string;
  parent: string | null;
  at: { x: number; y: number };
  part: PartName;
  back?: boolean;
  angleKey?: string;
}

/** The 18 bones. `hips` is the root, so the hips angle turns the whole body. */
export function skeleton(d: BodyDims): Bone[] {
  const shoulderY = -d.chestH * 0.8;
  const neckAt = { x: 8, y: -d.chestH + 22 };
  return [
    { name: "bUA", parent: "chest", at: { x: -d.S * 0.6, y: shoulderY }, part: "ua", back: true },
    { name: "bFA", parent: "bUA", at: { x: 0, y: d.uaL - 6 }, part: "fa", back: true },
    { name: "bH", parent: "bFA", at: { x: 0, y: d.faL - 4 }, part: "hand", back: true },
    { name: "bFt", parent: "bSh", at: { x: 0, y: d.shinL - 10 }, part: "foot", back: true },
    { name: "bTh", parent: "hips", at: { x: -12 * d.b, y: 16 }, part: "thigh", back: true },
    { name: "bSh", parent: "bTh", at: { x: 0, y: d.thighL - 8 }, part: "shin", back: true },
    { name: "hips", parent: null, at: { x: 0, y: 0 }, part: "hips" },
    { name: "fFt", parent: "fSh", at: { x: 0, y: d.shinL - 10 }, part: "foot" },
    { name: "fTh", parent: "hips", at: { x: 12 * d.b, y: 16 }, part: "thigh" },
    { name: "fSh", parent: "fTh", at: { x: 0, y: d.thighL - 8 }, part: "shin" },
    { name: "waist", parent: "hips", at: { x: 0, y: 0 }, part: "waist", angleKey: "torso" },
    { name: "knot", parent: "hips", at: { x: 6, y: 0 }, part: "knot" },
    { name: "chest", parent: "waist", at: { x: 0, y: -d.waistH }, part: "chest" },
    { name: "neck", parent: "chest", at: neckAt, part: "neck", angleKey: "head" },
    { name: "head", parent: "chest", at: neckAt, part: "head" },
    { name: "fUA", parent: "chest", at: { x: d.S * 0.55, y: shoulderY }, part: "ua" },
    { name: "fFA", parent: "fUA", at: { x: 0, y: d.uaL - 6 }, part: "fa" },
    { name: "fH", parent: "fFA", at: { x: 0, y: d.faL - 4 }, part: "hand" },
  ];
}

/** Draw order, back to front. Pieces in one group share a single outline. */
export const LIMB_GROUPS: string[][] = [
  ["bUA", "bFA", "bH"],
  ["bFt", "bTh", "bSh"],
  ["hips", "fFt", "fTh", "fSh"],
  ["neck", "waist", "chest"],
  ["knot"],
  ["head"],
  ["fUA", "fFA", "fH"],
];
