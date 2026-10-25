import { describe, expect, it } from "vitest";
import { bodyDims } from "../src/body";
import { hex } from "../src/color";
import { ARCHETYPES, BODY_FRAMES, BUILDS, DEFAULT_LOOK, WEAPONS, type Look } from "../src/look";
import type { PartShape } from "../src/paint";
import { paintCommands } from "../src/paint";
import { bodyParts, handParts, weaponShape } from "../src";

const look = (o: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...o });

function check(name: string, s: PartShape) {
  expect(s.layers.length, name).toBeGreaterThanOrEqual(1);
  const { x0, y0, x1, y1 } = s.bbox;
  expect(x1, name).toBeGreaterThan(x0);
  expect(y1, name).toBeGreaterThan(y0);
  const inside = (x: number, y: number) => {
    expect(Number.isFinite(x) && Number.isFinite(y), name).toBe(true);
    expect(x, name).toBeGreaterThanOrEqual(x0 - 3);
    expect(x, name).toBeLessThanOrEqual(x1 + 3);
    expect(y, name).toBeGreaterThanOrEqual(y0 - 3);
    expect(y, name).toBeLessThanOrEqual(y1 + 3);
  };
  for (const L of s.layers) for (const p of L.p) inside(p.x, p.y);
  for (const l of s.lines) for (const [x, y] of l.p) inside(x, y);
}

describe("parts", () => {
  for (const body of BODY_FRAMES) for (const archetype of ARCHETYPES) for (const build of BUILDS) for (const muscle of [0.8, 1.4]) {
    it(`${body} ${archetype} ${build} ${muscle}: every part is well formed`, () => {
      for (const weapon of WEAPONS) {
        const l = look({ body, archetype, build, muscle, weapon });
        const d = bodyDims(l);
        for (const [n, s] of Object.entries(bodyParts(l, d))) check(n, s);
        const h = handParts(l, d);
        for (const [n, s] of Object.entries(h)) check(n, s);
        if (weapon === "none") expect(h.fistArmed).toBe(h.fist);
        else {
          expect(h.fistArmed.layers.length).toBeGreaterThan(h.fist.layers.length);
          check(weapon, weaponShape(weapon, l)!);
        }
      }
    });
  }

  it("has no weapon for none or unknown names", () => {
    expect(weaponShape("none", DEFAULT_LOOK)).toBeNull();
    expect(weaponShape("banana", DEFAULT_LOOK)).toBeNull();
  });

  const width = (l: Look) => {
    const b = bodyParts(l, bodyDims(l)).chest.bbox;
    return b.x1 - b.x0;
  };
  it("feminine chest is narrower than masculine", () => {
    expect(width(look({ body: "feminine" }))).toBeLessThan(width(look({ body: "masculine" })));
  });
  it("big and muscular is wider than lean and light", () => {
    expect(width(look({ build: "big", muscle: 1.4 }))).toBeGreaterThan(width(look({ build: "lean", muscle: 0.8 })));
  });

  const hasTop = (l: Look) => bodyParts(l, bodyDims(l)).ua.layers.some((L) => L.c === hex(l.top, 0));
  it("only the masculine martial arm has a torn sleeve", () => {
    expect(hasTop(look({ archetype: "martial", body: "masculine" }))).toBe(true);
    expect(hasTop(look({ archetype: "brawler", body: "masculine" }))).toBe(false);
    expect(hasTop(look({ archetype: "martial", body: "feminine" }))).toBe(false);
  });

  it("the neck's jaw shadow only shows in the fill pass", () => {
    const neck = bodyParts(DEFAULT_LOOK, bodyDims(DEFAULT_LOOK)).neck;
    const fills = (m: "outline" | "fill") => paintCommands(neck, m).filter((c) => c.kind === "fill").length;
    expect(fills("fill")).toBeGreaterThan(fills("outline"));
  });
});
