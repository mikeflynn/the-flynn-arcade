import type { BodyDims } from "../body";
import { darken, hex, lighten, outlineOf } from "../color";
import { ellipse } from "../geometry";
import type { Look } from "../look";
import type { PartShape } from "../paint";
import { blob, poly, scaleShape, shapeOf } from "./shape";

export type BodyPartName = "neck" | "chest" | "waist" | "hips" | "knot" | "ua" | "fa" | "thigh" | "shin" | "foot";

/** The wraps on a martial artist's forearms and fists (also used by the hands). */
export const wrapColor = (look: Look): number => (look.archetype === "brawler" ? 0x2b2b33 : 0xece4cf);

/** Torso, limbs, neck and feet for one fighter. Joint at (0,0), limbs hang toward +y, +x faces the opponent. */
export function bodyParts(look: Look, d: BodyDims): Record<BodyPartName, PartShape> {
  const w = d.w, B = d.b;
  const skin = hex(look.skin, 0xf1c08f), top = hex(look.top, 0x2f6fd6), bot = hex(look.bottom, 0x2f6fd6);
  const martial = look.archetype !== "brawler";
  const fem = d.feminine;
  const wrap = wrapColor(look), shoe = hex(look.shoes, 0xffffff), belt = hex(look.belt, 0x1d1d1d), sk = outlineOf(skin);
  const e = ellipse;

  const ua = () => {
    const lay = [
      blob(e(0, 8, 44 * w, 40), skin, { shade: -6 * w, hi: 10 * w }),
      blob(e(3 * w, d.uaL * 0.46, 34 * w, d.uaL * 0.68), skin, { shade: -4 * w, hi: 9 * w }),
      blob(e(0, d.uaL - 8, 22 * w, 20), skin, { shade: -3 }),
    ];
    // the torn sleeve belongs to the masculine martial gi; the feminine tunic is sleeveless
    if (martial && !fem) {
      lay.push(poly([[-23 * w, -6], [23 * w, -6], [24 * w, 16], [8, 22], [0, 16], [-10, 23], [-24 * w, 14]], top, { shade: -5 * w, hi: 10 * w }));
    }
    return shapeOf(lay, [
      { p: [[-7 * w, d.uaL * 0.6], [2 * w, d.uaL * 0.7], [11 * w, d.uaL * 0.6]], w: 2, c: sk },
      { p: [[-12 * w, 18], [-4 * w, 30]], w: 2, c: darken(skin, 0.5) },
    ]);
  };

  const fa = () => shapeOf([
    blob(e(0, d.faL * 0.3, 36 * w, d.faL * 0.64), skin, { shade: -5 * w, hi: 8 * w }),
    poly([[-15 * w, d.faL * 0.3], [15 * w, d.faL * 0.3], [11 * w, d.faL - 4], [-11 * w, d.faL - 4]], skin, { shade: -4 * w, hi: 6 * w }),
    poly([[-12 * w, d.faL - 20], [12 * w, d.faL - 20], [12 * w, d.faL], [-12 * w, d.faL]], wrap, { shade: -4 * w }),
    ...(look.extras.includes("wristbands")
      ? [poly([[-13 * w, d.faL - 34], [13 * w, d.faL - 34], [13 * w, d.faL - 22], [-13 * w, d.faL - 22]], hex(look.accent, 0xe8e8e8), { shade: -4 * w, hi: 6 * w })]
      : []),
  ], [{ p: [[-4 * w, 10], [4 * w, d.faL * 0.5]], w: 2, c: darken(skin, 0.5) }]);

  const thigh = () => {
    // leggings (feminine) and brawler shorts are slimmer than the martial gi trousers
    const tw = (martial && !fem ? 52 : 42) * d.thighW;
    return shapeOf([blob(e(0, d.thighL * 0.46, tw * B, d.thighL * 1.1), bot, { shade: -7 * B, hi: 12 * B })], [
      { p: [[-8, d.thighL * 0.3], [4, d.thighL * 0.45]], w: 2, c: outlineOf(bot) },
      { p: [[-12, d.thighL * 0.6], [0, d.thighL * 0.72]], w: 2, c: outlineOf(bot) },
    ]);
  };

  const shin = () => {
    const Ls = d.shinL;
    const flared = martial && !fem; // gi trousers flare; leggings and shorts run straight
    const lay = flared
      ? [blob(e(0, 0, 36 * B, 28), bot, { shade: -6 }), poly([[-16 * B, -6], [16 * B, -6], [28 * B, Ls], [-26 * B, Ls]], bot, { shade: -7 * B, hi: 12 * B })]
      : [blob(e(0, 0, 30 * B, 24), bot, { shade: -6 }), poly([[-15 * B, -6], [15 * B, -6], [17 * B, Ls - 8], [-17 * B, Ls - 8]], bot, { shade: -6 * B, hi: 9 * B })];
    return shapeOf(lay, [{ p: [[-6, Ls * 0.4], [6, Ls * 0.55]], w: 2, c: outlineOf(bot) }]);
  };

  const foot = () => {
    const s = martial
      ? shapeOf([poly([[-14, -6], [8, -8], [22, 2], [46, 6], [52, 14], [48, 21], [-12, 21], [-17, 10]], skin, { shade: 2, tilt: 0 })],
          [{ p: [[40, 12], [42, 20]], w: 2, c: sk }, { p: [[33, 12], [35, 20]], w: 2, c: sk }])
      : shapeOf([
          poly([[-18, -10], [16, -10], [30, 0], [50, 6], [54, 18], [50, 24], [-18, 24]], shoe, { shade: 4, hi: 30 }),
          poly([[-18, 16], [54, 16], [52, 25], [-18, 25]], 0xf2f2f2),
        ], [{ p: [[14, -4], [24, 4]], w: 2, c: 0x160c22 }, { p: [[22, -2], [30, 6]], w: 2, c: 0x160c22 }]);
    return scaleShape(s, d.footScale);
  };

  const hips = () => {
    const h = d.hipsHalf, h2 = h * (34 / 30);
    return shapeOf([
      poly([[-h, -4], [h, -4], [h2, 26], [-h2, 26]], bot, { shade: -10 * B }),
      poly([[-h - B, -8], [h + B, -8], [h + 2 * B, 5], [-h - 2 * B, 5]], belt, { shade: -10 * B, hi: 18 * B }),
    ]);
  };

  const knot = () => martial
    ? shapeOf([
        poly([[0, 0], [8, 0], [14, 34], [6, 36]], belt, { shade: 3 }),
        poly([[-4, 2], [3, 2], [-2, 30], [-9, 28]], belt, { shade: -4 }),
        poly([[-6, -8], [10, -8], [10, 5], [-6, 5]], belt, { hi: 4 }),
      ])
    : shapeOf([poly([[-8, -8], [8, -8], [8, 6], [-8, 6]], 0xe0b040, { shade: -2, hi: 3 })]);

  const waist = () => shapeOf(
    [poly([[-30 * B, 4], [30 * B, 4], [d.Wb + 1, -d.waistH - 2], [-d.Wb - 1, -d.waistH - 2]], top, { shade: -9 * B, hi: 14 * B })],
    martial ? [{ p: [[-18 * B, -d.waistH], [16 * B, 0]], w: 3, c: outlineOf(top) }] : [{ p: [[-6, -d.waistH * 0.5], [6, -d.waistH * 0.4]], w: 2, c: outlineOf(top) }],
  );

  const chest = () => {
    const H = d.chestH, S = d.S, Lt = d.Lt, Wb = d.Wb;
    const sil = [[-Wb, 0], [Wb, 0], [Lt, -H * 0.45], [S, -H * 0.76], [S * 0.8, -H], [12, -H - 6], [-12, -H - 6], [-S * 0.8, -H], [-S, -H * 0.76], [-Lt, -H * 0.45]] as [number, number][];
    const traps = poly([[-S * 0.75, -H + 2], [-12, -H - 6], [-9, -H - 16], [9, -H - 16], [12, -H - 6], [S * 0.75, -H + 2]], skin, { shade: -4 });
    if (martial) {
      // gi top with a skin-colored V; the masculine one also gets pec lines
      const vTop = fem ? -H * 0.4 : -H * 0.2;
      const v = poly([[-19, -H - 6], [19, -H - 6], [6, vTop], [-6, vTop]], skin, { outline: false, ink: true, shade: -4, hi: 8 });
      const lines = [
        { p: [[-19, -H - 6], [-6, vTop]] as [number, number][], w: 5, c: lighten(top, 0.35) },
        { p: [[19, -H - 6], [6, vTop]] as [number, number][], w: 5, c: lighten(top, 0.35) },
      ];
      if (!fem) {
        lines.unshift(
          { p: [[-15, -H * 0.62], [-4, -H * 0.54], [0, -H * 0.6]], w: 2, c: sk },
          { p: [[0, -H * 0.6], [6, -H * 0.54], [15, -H * 0.62]], w: 2, c: sk },
          { p: [[0, -H * 0.5], [0, -H * 0.24]], w: 2, c: darken(skin, 0.5) },
        );
      }
      return shapeOf([traps, poly(sil, top, { shade: -S * 0.25, deep: S * 0.3, hi: S * 0.45 }), v], lines);
    }
    // brawler: bare shoulders with a tank top over them
    const tank = poly([[-Wb + 1, 0], [Wb - 1, 0], [Lt - 5, -H * 0.45], [S * 0.5, -H * 0.82], [S * 0.38, -H - 2], [12, -H * 0.66], [-12, -H * 0.66], [-S * 0.38, -H - 2], [-S * 0.5, -H * 0.82], [-Lt + 5, -H * 0.45]], top, { outline: false, ink: true, shade: -S * 0.22, hi: S * 0.3 });
    return shapeOf([traps, poly(sil, skin, { shade: -S * 0.25, deep: S * 0.3, hi: S * 0.45 }), tank], [
      { p: [[-S * 0.62, -H * 0.62], [-S * 0.5, -H * 0.4]], w: 2, c: sk },
      { p: [[S * 0.62, -H * 0.62], [S * 0.5, -H * 0.4]], w: 2, c: sk },
      { p: [[-10, -H * 0.72], [0, -H * 0.68], [10, -H * 0.72]], w: 2, c: sk },
      { p: [[-14, -H * 0.3], [-4, -H * 0.36]], w: 2, c: outlineOf(top) },
      { p: [[6, -H * 0.34], [14, -H * 0.28]], w: 2, c: outlineOf(top) },
    ]);
  };

  const neck = () => {
    const nx = d.neckHalf / 15; // slimmer neck for the feminine frame
    const wide = (a: [number, number][]) => a.map(([x, y]) => [x * nx, y] as [number, number]);
    const s = shapeOf([
      poly(wide([[-15, 14], [15, 14], [13, -38], [-13, -38]]), skin, { shade: -2 * nx }),
      // the shadow under the jaw is fill-only, so it has no outline
      poly(wide([[-13, -38], [13, -38], [13, -24], [-13, -18]]), darken(skin, 0.45), { outline: false }),
    ]);
    return scaleShape(s, d.headScale);
  };

  return {
    neck: neck(), chest: chest(), waist: waist(), hips: hips(), knot: knot(),
    ua: ua(), fa: fa(), thigh: thigh(), shin: shin(), foot: foot(),
  };
}
