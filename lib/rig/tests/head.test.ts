import { describe, expect, it } from "vitest";
import { bodyDims } from "../src/body";
import { darken, hex, mix } from "../src/color";
import { BROWS, DEFAULT_LOOK, EYE_SHAPES, HAIR_STYLES, JAWS, NOSES, type Look } from "../src/look";
import type { PartShape } from "../src/paint";
import { buildParts, bodyParts, headPart, type ShapeName } from "../src";

const look = (o: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...o });
const withFace = (l: Look, f: Partial<Look["face"]>): Look => ({ ...l, face: { ...l.face, ...f } });

// One expect per shape (the matrix is big, so per-point expects would be slow).
function check(name: string, s: PartShape) {
  const { x0, y0, x1, y1 } = s.bbox;
  let bad = s.layers.length < 1 || !(x1 > x0) || !(y1 > y0);
  const inside = (x: number, y: number) => {
    if (!(Number.isFinite(x) && Number.isFinite(y) && x >= x0 - 3 && x <= x1 + 3 && y >= y0 - 3 && y <= y1 + 3)) bad = true;
  };
  for (const L of s.layers) for (const p of L.p) inside(p.x, p.y);
  for (const l of s.lines) for (const [x, y] of l.p) inside(x, y);
  if (bad) expect.fail(`${name} is malformed`);
}

const EXTRA_SETS = [[], ["headband", "glasses"], ["cap", "earrings", "bow"], ["sunglasses", "wristbands"]];

describe("head", () => {
  const d = bodyDims(DEFAULT_LOOK);

  it("is well formed for every hair, jaw, brow, eye, nose and extras combination", () => {
    for (const style of HAIR_STYLES) for (const jaw of JAWS) for (const brows of BROWS)
      for (const eyeShape of EYE_SHAPES) for (const nose of NOSES) for (const extras of EXTRA_SETS)
        for (const variant of ["normal", "hit"] as const) {
          const l = look({ hair: { style, color: "#6e4022" }, face: { ...DEFAULT_LOOK.face, jaw, brows, eyeShape, nose }, extras });
          check(`${style} ${jaw} ${brows} ${eyeShape} ${nose} ${extras} ${variant}`, headPart(l, d, variant));
        }
  });

  it("still draws something for an unknown hair style, jaw or nose", () => {
    const l = look({ hair: { style: "mohawk", color: "#000000" }, face: { ...DEFAULT_LOOK.face, jaw: "x", nose: "y", brows: "z", eyeShape: "w" } });
    check("typos", headPart(l, d, "normal"));
  });

  it("looks different when hit", () => {
    expect(headPart(DEFAULT_LOOK, d, "hit").layers).not.toEqual(headPart(DEFAULT_LOOK, d, "normal").layers);
  });

  it("follows the face rules for every face", () => {
    for (const jaw of JAWS) for (const eyeShape of EYE_SHAPES) for (const expression of ["determined", "grin"]) for (const body of ["masculine", "feminine"]) {
      const l = look({ body, face: { ...DEFAULT_LOOK.face, jaw, eyeShape, expression, freckles: true, lashes: true } });
      const h = headPart(l, bodyDims(l), "normal");
      const whites = h.layers.filter((L) => L.c === 0xffffff);
      expect(whites.length).toBe(2);
      for (const L of whites) {
        expect(L.ink).toBeFalsy();
        expect(L.outline).toBe(false);
      }
      const ear = h.layers.filter((L) => L.c === darken(hex(l.skin, 0), 0.18));
      expect(ear.length).toBe(1);
      expect(ear[0]!.outline).toBe(false);
    }
  });

  it("makes the nose a skin layer that shares the face outline", () => {
    for (const nose of NOSES) {
      const l = withFace(DEFAULT_LOOK, { nose });
      const skin = hex(l.skin, 0);
      const layers = headPart(l, d, "normal").layers.filter((L) => L.c === skin);
      expect(layers.length).toBe(3); // face, nose, jaw
      for (const L of layers) expect(L.outline).not.toBe(false);
    }
  });

  it("changes the head when only the jaw, nose, brows or eyes change", () => {
    const base = headPart(DEFAULT_LOOK, d, "normal").layers;
    for (const f of [{ jaw: "round" }, { jaw: "soft" }, { jaw: "pointed" }, { nose: "button" }, { nose: "wide" }, { brows: "thin" }, { brows: "arched" }, { eyeShape: "round" }]) {
      expect(headPart(withFace(DEFAULT_LOOK, f), d, "normal").layers, JSON.stringify(f)).not.toEqual(base);
    }
  });

  it("adds freckles and lashes only when asked", () => {
    const plain = headPart(DEFAULT_LOOK, d, "normal");
    expect(headPart(withFace(DEFAULT_LOOK, { freckles: true }), d, "normal").layers.length).toBe(plain.layers.length + 5);
    expect(headPart(withFace(DEFAULT_LOOK, { lashes: true }), d, "normal").layers.length).toBe(plain.layers.length + 3);
  });

  it("gives the feminine frame a lip color", () => {
    const l = look({ body: "feminine" });
    const lip = mix(darken(hex(l.skin, 0), 0.25), 0xc0506a, 0.3);
    expect(headPart(l, bodyDims(l), "normal").lines.some((x) => x.c === lip)).toBe(true);
    expect(headPart(DEFAULT_LOOK, d, "normal").lines.some((x) => x.c === lip)).toBe(false);
  });

  it("keeps hair outlines on top of the face with an ink stroke", () => {
    const hair = headPart(DEFAULT_LOOK, d, "normal").layers.find((L) => L.c === hex(DEFAULT_LOOK.hair.color, 0) && L.hi !== undefined);
    expect(hair?.ink).toBe(true);
  });

  it("scales with headScale", () => {
    const small = headPart(DEFAULT_LOOK, { ...d, headScale: 1 }, "normal").bbox;
    const big = headPart(DEFAULT_LOOK, { ...d, headScale: 1.2 }, "normal").bbox;
    expect(big.x1 - big.x0).toBeCloseTo((small.x1 - small.x0) * 1.2, 5);
  });

  it("adds extras", () => {
    const n = (extras: string[]) => headPart(look({ extras }), d, "normal").layers.length;
    for (const e of ["headband", "cap", "bow", "earrings", "sunglasses"]) expect(n([e]), e).toBeGreaterThan(n([]));
    expect(headPart(look({ extras: ["glasses"] }), d, "normal").lines.length).toBeGreaterThan(headPart(look({ extras: [] }), d, "normal").lines.length);
  });

  it("puts wristbands on the forearm in the accent color", () => {
    const l = look({ extras: ["wristbands"], accent: "#ff0000" });
    const fa = bodyParts(l, bodyDims(l)).fa;
    expect(fa.layers.some((L) => L.c === 0xff0000)).toBe(true);
    expect(bodyParts(DEFAULT_LOOK, d).fa.layers.some((L) => L.c === 0xff0000)).toBe(false);
  });
});

describe("buildParts", () => {
  const NAMES: ShapeName[] = ["neck", "chest", "waist", "hips", "knot", "ua", "fa", "thigh", "shin", "foot", "fist", "palm", "fistArmed", "head", "headHit"];
  it("has all 15 shapes", () => {
    const parts = buildParts(DEFAULT_LOOK, bodyDims(DEFAULT_LOOK));
    expect(Object.keys(parts).sort()).toEqual([...NAMES].sort());
    for (const n of NAMES) check(n, parts[n]);
  });
  it("gives different heads to looks that differ only in jaw", () => {
    const a = buildParts(withFace(DEFAULT_LOOK, { jaw: "square" }), d()).head.layers;
    const b = buildParts(withFace(DEFAULT_LOOK, { jaw: "round" }), d()).head.layers;
    expect(a).not.toEqual(b);
  });
  function d() { return bodyDims(DEFAULT_LOOK); }
});
