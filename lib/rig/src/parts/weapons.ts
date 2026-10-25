import { hex } from "../color";
import { ellipse } from "../geometry";
import type { Look } from "../look";
import type { PartShape } from "../paint";
import { blob, poly, shapeOf } from "./shape";

const WOOD = 0xc8924e, METAL = 0xaab4c4, STEEL = 0x3a3a46, NET = 0xf4f0e0;

/**
 * Simple weapon silhouettes, held upright with the grip at (0,0): +y is toward the butt end,
 * -y toward the business end. Returns null for "none" (or a name we don't know).
 */
export function weaponShape(weapon: string, look: Look): PartShape | null {
  const grip = hex(look.accent, 0xe8e8e8);
  switch (weapon) {
    case "baseball-bat":
      return shapeOf([
        poly([[-5, 34], [5, 34], [6, 22], [-6, 22]], grip, { shade: -2 }),
        poly([[-5, 24], [5, 24], [6, -10], [12, -60], [12, -100], [-12, -100], [-12, -60], [-6, -10]], WOOD, { shade: -3, hi: 6 }),
      ]);
    case "tennis-racket":
      return shapeOf([
        poly([[-4, 34], [4, 34], [4, 6], [-4, 6]], grip, { shade: -1 }),
        poly([[-3, 8], [3, 8], [3, -20], [-3, -20]], METAL),
        blob(ellipse(0, -52, 46, 62), METAL),
        blob(ellipse(0, -52, 34, 50), NET, { outline: false, ink: true }),
      ], [{ p: [[0, -76], [0, -28]], w: 1, c: METAL }, { p: [[-14, -52], [14, -52]], w: 1, c: METAL }]);
    case "hockey-stick":
      return shapeOf([
        poly([[-4, 34], [4, 34], [4, 22], [-4, 22]], grip),
        poly([[-3, 24], [4, 24], [4, -96], [-3, -96]], WOOD, { shade: -1 }),
        poly([[-3, -90], [4, -90], [4, -102], [36, -102], [36, -92], [8, -92], [8, -80], [-3, -80]], WOOD, { shade: 2 }),
      ]);
    case "lacrosse-stick":
      return shapeOf([
        poly([[-3, 34], [3, 34], [3, 22], [-3, 22]], grip),
        poly([[-3, 24], [3, 24], [3, -60], [-3, -60]], METAL),
        blob(ellipse(0, -80, 26, 40), METAL),
        blob(ellipse(0, -80, 16, 30), NET, { outline: false, ink: true }),
      ], [{ p: [[0, -94], [0, -66]], w: 1, c: METAL }]);
    case "frying-pan":
      return shapeOf([
        poly([[-4, 34], [4, 34], [4, -10], [-4, -10]], WOOD, { shade: -1 }),
        blob(ellipse(0, -36, 52, 52), STEEL, { shade: -6, hi: 14 }),
        blob(ellipse(0, -36, 38, 38), 0x555566, { outline: false, ink: true }),
      ]);
    default:
      return null;
  }
}
