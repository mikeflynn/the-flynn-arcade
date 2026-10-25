import { ellipse } from "../geometry";
import type { Layer } from "../paint";
import { blob, poly } from "./shape";

type Corners = [number, number][];

const SHORT: Corners = [[-20,-40],[-28,-50],[-32,-66],[-24,-84],[-4,-92],[16,-90],[30,-82],[36,-68],[28,-71],[26,-64],[20,-72],[12,-67],[6,-74],[-2,-67],[-8,-72],[-12,-58],[-16,-44]];

/**
 * The front of the hair (the part that sits on top of the face) for each style.
 * The ponytail, buns and braids styles share the short front and add pieces behind the head.
 * 🛠️ TRY THIS: copy a list, nudge a few numbers, and give it a new name!
 */
export const HAIR_FRONT: Record<string, Corners> = {
  swoop: [[-18,-40],[-28,-46],[-46,-54],[-32,-64],[-50,-78],[-30,-82],[-22,-96],[0,-98],[24,-94],[40,-84],[52,-74],[32,-74],[26,-66],[18,-74],[8,-70],[-2,-76],[-8,-64],[-14,-58],[-16,-44]],
  short: SHORT,
  spiky: [[-20,-40],[-34,-48],[-30,-60],[-50,-70],[-30,-76],[-38,-98],[-14,-88],[-4,-112],[10,-90],[28,-104],[28,-84],[48,-82],[34,-70],[26,-64],[14,-70],[0,-68],[-10,-62],[-16,-44]],
  long: SHORT,
  buzz: [[-22,-44],[-28,-62],[-20,-80],[0,-88],[22,-84],[30,-72],[28,-66],[10,-71],[-8,-68],[-16,-58],[-19,-46]],
  ponytail: SHORT,
  buns: SHORT,
  braids: SHORT,
};

/** Hair we don't know falls back to plain short hair. */
export const hairStyleOf = (style: string): string => (style in HAIR_FRONT ? style : "short");

/** A braid: a chain of little hair-colored lumps hanging from (x, y) down and slightly back. */
function braid(x: number, y: number, color: number): Layer[] {
  return [0, 1, 2, 3, 4].map((i) =>
    blob(ellipse(x - i * 3.5, y + i * 13, 15 - i, 17), color, { shade: x - i * 3.5 - 2 }),
  );
}

/** The hair pieces that hang or poke out behind the head, drawn under the face. */
export function hairBack(style: string, color: number): Layer[] {
  switch (style) {
    case "long":
      return [poly([[-20,-80],[-40,-70],[-48,-30],[-36,-6],[-30,-36],[-14,-60]], color, { shade: -36 })];
    case "ponytail":
      return [poly([[-22,-78],[-44,-76],[-62,-60],[-60,-34],[-50,-44],[-52,-62],[-34,-64],[-20,-64]], color, { shade: -44 })];
    case "buns":
      return [
        blob(ellipse(-22, -96, 22, 22), color, { shade: -26, hi: -14 }),
        blob(ellipse(-40, -80, 20, 20), color, { shade: -44, hi: -30 }),
      ];
    case "braids":
      return [...braid(-30, -66, color), ...braid(-22, -64, color)];
    default:
      return [];
  }
}
