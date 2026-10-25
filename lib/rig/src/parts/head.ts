import type { BodyDims } from "../body";
import { INK, darken, hex, mix, outlineOf } from "../color";
import { ellipse, pts, type Pt } from "../geometry";
import type { Look } from "../look";
import type { Layer, Line, PartShape } from "../paint";
import { HAIR_FRONT, hairBack, hairStyleOf } from "./hair";
import { blob, poly, scaleShape, shapeOf } from "./shape";

type Corners = [number, number][];

/** A thin stroke along a path as a filled shape, so it keeps its place in the drawing order (a Line is always drawn last, on top of the hair). */
function strip(path: Corners, w: number, c: number): Layer {
  const left: Pt[] = [], right: Pt[] = [];
  path.forEach(([x, y], i) => {
    const [ax, ay] = path[Math.max(0, i - 1)]!, [bx, by] = path[Math.min(path.length - 1, i + 1)]!;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (-(by - ay) / len) * (w / 2), ny = ((bx - ax) / len) * (w / 2);
    left.push({ x: x + nx, y: y + ny });
    right.unshift({ x: x - nx, y: y - ny });
  });
  return { p: [...left, ...right], c, outline: false };
}

/** A closed loop as an open line (the last point repeats the first). */
const loop = (p: Pt[]): Corners => [...p, p[0]!].map((q) => [q.x, q.y] as [number, number]);

const JAW: Record<string, () => Layer["p"]> = {
  square: () => pts([[-16,-54],[24,-58],[29,-46],[25,-33],[12,-26],[-2,-28],[-14,-40]]),
  round: () => ellipse(7, -42, 40, 34),
  soft: () => pts([[-16,-54],[24,-58],[28,-46],[23,-35],[12,-29],[0,-30],[-14,-40]]),
  pointed: () => pts([[-16,-54],[24,-58],[28,-46],[26,-36],[20,-22],[10,-22],[-2,-28],[-14,-40]]),
};

const NOSE: Record<string, () => Layer["p"]> = {
  straight: () => pts([[20,-63],[33,-51],[31,-46],[21,-46]]),
  button: () => ellipse(27, -51, 11, 11, 14),
  wide: () => pts([[19,-61],[33,-53],[35,-47],[31,-44],[19,-45]]),
};

/** The head: jaw, face, eyes, hair and anything worn on it. Joint at the neck (0,0); +x is the way the fighter faces. */
export function headPart(look: Look, d: BodyDims, variant: "normal" | "hit"): PartShape {
  const hit = variant === "hit";
  const skin = hex(look.skin, 0xf1c08f), hair = hex(look.hair.color, 0xf7d35c), acc = hex(look.accent, 0xe8e8e8);
  const eyes = hex(look.eyes, 0x3b6fb6);
  const ex = look.extras;
  const style = hairStyleOf(look.hair.style);
  const f = look.face;
  const grin = f.expression === "grin";
  const lip = d.feminine ? mix(darken(skin, 0.25), 0xc0506a, 0.3) : INK;

  // Things that sit on top of the face need `ink` so their outline shows over what is already drawn.
  const over = { ink: true };

  const back: Layer[] = [];
  if (ex.includes("headband")) {
    back.push(poly([[-24,-66],[-50,-64],[-66,-52],[-48,-56],[-24,-58]], acc, { shade: -60 }));
    back.push(poly([[-24,-62],[-44,-52],[-56,-34],[-40,-46],[-22,-56]], acc, { shade: -60 }));
  }
  back.push(...hairBack(style, hair));

  const face: Layer[] = [
    blob(ellipse(2, -60, 52, 56), skin, { shade: -6, deep: 10 }),
    blob((NOSE[f.nose] ?? NOSE.straight!)(), skin, { shade: 40 }), // the nose shares the face outline
    blob((JAW[f.jaw] ?? JAW.square!)(), skin, { shade: -4 }),
    blob(ellipse(-9, -55, 11, 16), darken(skin, 0.18), { outline: false }), // the ear is just a darker patch
  ];
  if (f.freckles) {
    for (const [x, y] of [[6,-49],[11,-47],[16,-49],[9,-52],[14,-52]] as Corners) {
      face.push(blob(ellipse(x, y, 3.2, 3.2, 8), darken(skin, 0.4), { outline: false }));
    }
  }

  const lines: Line[] = [{ p: [[-11,-59],[-8,-52]], w: 2, c: darken(skin, 0.45) }];
  const features: Layer[] = [];
  if (hit) {
    // squeezed-shut eyes and an open mouth
    features.push(strip([[8,-64],[18,-60],[8,-56]], 4, INK), strip([[30,-63],[24,-60],[30,-57]], 3, INK));
    features.push(blob(ellipse(19, -37, 12, 10), 0x6a1020));
  } else {
    // no box around the eyes: the brow above doubles as the upper lid
    const round = f.eyeShape === "round";
    features.push(
      poly(round ? [[9,-67],[22,-68],[21,-55],[10,-55]] : [[9,-64],[22,-65],[20,-57],[11,-57]], 0xffffff, { outline: false }),
      poly(round ? [[25,-66],[30,-66],[29,-56],[25,-56]] : [[25,-64],[30,-64],[29,-58],[25,-58]], 0xffffff, { outline: false }),
    );
    const eyeY = round ? -61 : -60.5, r = round ? 3.8 : 3.2;
    features.push(
      blob(ellipse(17.5, eyeY, r * 2, r * 2, 12), eyes, { outline: false }),
      blob(ellipse(28, eyeY, 4.4, 4.4, 12), eyes, { outline: false }),
      blob(ellipse(18.5, eyeY, 2.8, 2.8, 10), INK, { outline: false }),
    );
    if (f.brows === "thin") features.push(strip([[3,-68],[16,-69],[30,-65]], 2, INK));
    else if (f.brows === "arched") features.push(strip([[3,-66],[12,-71],[21,-71],[30,-64]], 3, INK));
    else features.push(poly([[1,-70],[28,-69],[30,-63],[22,-64],[3,-64]], INK, { outline: false }));
    if (f.lashes) {
      // three little flicks at the back corner of the near eye
      features.push(strip([[10,-63],[5,-67]], 2, INK), strip([[10,-60],[4,-61]], 2, INK), strip([[11,-57],[6,-54]], 2, INK));
    }
    if (grin) features.push(poly([[12,-41],[27,-43],[25,-35],[15,-34]], 0xf4f4f4, { outline: false, ink: true }));
    else lines.push({ p: [[13,-39],[26,-41]], w: 3, c: lip });
  }

  const top: Layer[] = [poly(HAIR_FRONT[style]!, hair, { shade: -6, deep: 12, hi: 22, ...over })];
  if (!ex.includes("cap")) {
    lines.push({ p: [[-6,-88],[6,-80]], w: 2, c: outlineOf(hair) }, { p: [[12,-90],[20,-80]], w: 2, c: outlineOf(hair) });
  }
  if (ex.includes("headband")) top.push(poly([[-27,-70],[30,-74],[31,-66],[-26,-61]], acc, { shade: -10, hi: 22, ...over }));
  if (ex.includes("cap")) {
    top.push(
      poly([[-26,-62],[-24,-84],[-4,-96],[20,-92],[32,-76],[30,-66]], acc, { shade: -6, hi: 18, ...over }),
      poly([[-22,-66],[-52,-60],[-50,-53],[-22,-58]], darken(acc, 0.2), over),
    );
  }
  if (ex.includes("bow")) {
    top.push(
      poly([[6,-93],[-8,-102],[-9,-86]], acc, { shade: -4, ...over }),
      poly([[6,-93],[20,-102],[21,-86]], acc, { shade: 6, ...over }),
      blob(ellipse(6, -93, 8, 9, 12), darken(acc, 0.2), over),
    );
  }
  if (ex.includes("earrings")) top.push(blob(ellipse(-9, -46, 6, 6, 10), 0xf0c030, over));
  if (ex.includes("sunglasses")) {
    top.push(
      blob(ellipse(15.5, -61, 19, 15), 0x22222c, { outline: false, ink: true, hi: 18 }),
      blob(ellipse(29, -61, 11, 13), 0x22222c, { outline: false, ink: true }),
    );
    lines.push({ p: [[6,-62],[-14,-63]], w: 3 }, { p: [[24,-62],[25,-62]], w: 3 });
  }
  if (ex.includes("glasses")) {
    lines.push(
      { p: loop(ellipse(15.5, -61, 19, 16, 16)), w: 3 },
      { p: loop(ellipse(29, -61, 11, 14, 14)), w: 3 },
      { p: [[6,-62],[-14,-63]], w: 3 },
    );
  }

  return scaleShape(shapeOf([...back, ...face, ...features, ...top], lines), d.headScale);
}
