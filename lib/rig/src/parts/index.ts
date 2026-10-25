import type { BodyDims } from "../body";
import type { Look } from "../look";
import type { PartShape } from "../paint";
import { bodyParts, type BodyPartName } from "./body";
import { handParts } from "./hands";
import { headPart } from "./head";

export type ShapeName = BodyPartName | "fist" | "palm" | "fistArmed" | "head" | "headHit";

/** Every shape one fighter is baked from. */
export function buildParts(look: Look, d: BodyDims): Record<ShapeName, PartShape> {
  return { ...bodyParts(look, d), ...handParts(look, d), head: headPart(look, d, "normal"), headHit: headPart(look, d, "hit") };
}
