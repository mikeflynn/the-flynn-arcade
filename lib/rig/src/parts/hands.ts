import type { BodyDims } from "../body";
import { hex } from "../color";
import { ellipse } from "../geometry";
import type { Look } from "../look";
import type { PartShape } from "../paint";
import { wrapColor } from "./body";
import { blob, poly, shapeOf, shiftShape } from "./shape";
import { weaponShape } from "./weapons";

/** Closed fist, open palm, and a fist holding the look's weapon. Joint at the wrist, fingers toward +y. */
export function handParts(look: Look, d: BodyDims): { fist: PartShape; palm: PartShape; fistArmed: PartShape } {
  const f = d.fist;
  const martial = look.archetype !== "brawler";
  const skin = hex(look.skin, 0xf1c08f);
  const glove = martial ? skin : 0x2b2b33, wrap = wrapColor(look);

  const fist = shapeOf([
    poly([[-15 * f, -2], [15 * f, -2], [17 * f, 20 * f], [12 * f, 29 * f], [-13 * f, 29 * f], [-16 * f, 18 * f]], glove, { shade: -6 * f, hi: 8 * f }),
    poly([[-13 * f, 18 * f], [16 * f, 18 * f], [12 * f, 30 * f], [-12 * f, 30 * f]], martial ? wrap : skin, { shade: -5 * f }),
    blob(ellipse(13 * f, 9 * f, 12 * f, 17 * f), martial ? skin : glove, { shade: 10 * f }),
  ], [{ p: [[-6 * f, 22 * f], [-6 * f, 29 * f]], w: 2 }, { p: [[2 * f, 22 * f], [2 * f, 29 * f]], w: 2 }]);

  const palm = shapeOf([
    poly([[-13 * f, -2], [13 * f, -2], [14 * f, 24 * f], [-13 * f, 24 * f]], glove, { shade: -5 * f }),
    poly([[-13 * f, 20 * f], [13 * f, 20 * f], [12 * f, 44 * f], [6 * f, 47 * f], [-12 * f, 44 * f]], skin, { shade: -5 * f, hi: 7 * f }),
    blob(ellipse(16 * f, 14 * f, 10 * f, 20 * f), skin, { shade: 14 * f }),
  ], [{ p: [[-5 * f, 30 * f], [-5 * f, 44 * f]], w: 2 }, { p: [[3 * f, 30 * f], [3 * f, 45 * f]], w: 2 }]);

  // the weapon is drawn first so the fist closes around its handle
  const weapon = weaponShape(look.weapon, look);
  const held = weapon && shiftShape(weapon, 0, 14 * f);
  const fistArmed = held ? shapeOf([...held.layers, ...fist.layers], [...held.lines, ...fist.lines]) : fist;
  return { fist, palm, fistArmed };
}
