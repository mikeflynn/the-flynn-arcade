import type Phaser from "phaser";
import { STANCE } from "../bake/plan";
import { bodyDims } from "../body";
import { bakeFighter } from "../canvas/bakeFighter";
import type { Look } from "../look";
import { buildParts } from "../parts/index";
import type { Pose } from "../pose";

/** The stance, looking straight ahead. */
export const PORTRAIT_POSE: Pose = { ...STANCE, head: 0, chest: 0 };

const PORTRAIT_SCALE = 0.8;
let portraitCount = 0;

/**
 * A size × size close-up of a fighter's head and shoulders, baked at twice the fight
 * scale. Returns the new texture key (remove it with `scene.textures.remove` when done).
 */
export function renderPortrait(scene: Phaser.Scene, look: Look, size: number): string {
  const still = { portrait: { loop: true, keys: [{ pose: PORTRAIT_POSE, frames: 1, ease: "linear" as const }] } };
  const baked = bakeFighter(look, still, { scale: PORTRAIT_SCALE });
  const f = baked.frames[0]!, page = baked.pages[f.page]!;

  // A square around the head with room for the shoulders, in art units from the feet.
  const head = buildParts(look, bodyDims(look)).head.bbox;
  const side = (head.y1 - head.y0) * 1.7;
  const left = f.joints.head.x + (head.x0 + head.x1) / 2 - side / 2;
  const top = f.joints.head.y + head.y0 - side * 0.08;

  // The same square in page pixels, clipped to this frame's cell.
  const px = PORTRAIT_SCALE, sx = f.x + f.footX + left * px, sy = f.y + f.footY + top * px, sSide = side * px;
  const cx0 = Math.max(sx, f.x), cy0 = Math.max(sy, f.y);
  const cx1 = Math.min(sx + sSide, f.x + f.w), cy1 = Math.min(sy + sSide, f.y + f.h);

  const out = document.createElement("canvas");
  out.width = out.height = Math.max(1, Math.round(size));
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  if (cx1 > cx0 && cy1 > cy0) {
    const k = out.width / sSide;
    ctx.drawImage(page, cx0, cy0, cx1 - cx0, cy1 - cy0, (cx0 - sx) * k, (cy0 - sy) * k, (cx1 - cx0) * k, (cy1 - cy0) * k);
  }
  const key = `rig-portrait-${portraitCount++}`;
  scene.textures.addCanvas(key, out);
  return key;
}
