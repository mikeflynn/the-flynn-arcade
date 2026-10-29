import { describe, expect, it } from "vitest";
import { normalizeFighter } from "../src/fighter";

const known = ["fireball"];

describe("normalizeFighter", () => {
  it("keeps known specials and warns about unknown ones", () => {
    const warnings: string[] = [];
    const f = normalizeFighter(
      { name: "ZED", look: {}, specials: [{ type: "laser", name: "PEW" }, { type: "fireball", name: "BOOM" }] },
      "zed", known, (m) => warnings.push(m),
    )!;
    expect(f.specials.map((s) => s.name)).toEqual(["BOOM"]);
    expect(warnings.some((w) => w.includes("laser"))).toBe(true);
  });

  it("uses the upper-cased file id when the name is missing", () => {
    expect(normalizeFighter({ look: {} }, "zed", known, () => {})!.name).toBe("ZED");
  });

  it("clamps stats", () => {
    const f = normalizeFighter({ stats: { speed: 99, health: 5 } }, "z", known, () => {})!;
    expect(f.stats.speed).toBe(10);
    expect(f.stats.health).toBe(50);
    expect(f.stats.power).toBe(5);
  });

  it("keeps only the first 4 specials", () => {
    const specials = Array.from({ length: 5 }, (_, i) => ({ type: "fireball", name: `S${i}` }));
    const f = normalizeFighter({ specials }, "z", known, () => {})!;
    expect(f.specials.map((s) => s.name)).toEqual(["S0", "S1", "S2", "S3"]);
  });

  it("clamps normals and special tweaks", () => {
    const f = normalizeFighter(
      { normals: { "st.HK": { damage: 99 }, "zz.XX": { damage: 3 } }, specials: [{ type: "fireball", name: "B", speed: 9, damageBonus: -1 }] },
      "z", known, () => {},
    )!;
    expect(f.normals["st.HK"]!.damage).toBe(30);
    expect(Object.keys(f.normals)).toEqual(["st.HK"]);
    expect(f.specials[0]).toMatchObject({ speed: 2, damageBonus: 0 });
  });

  it("ignores wrong-typed numbers with a warning", () => {
    const w1: string[] = [];
    const f = normalizeFighter({ normals: { "st.HK": { damage: "20" } } }, "z", known, (m) => w1.push(m))!;
    expect(f.normals["st.HK"]).toEqual({});
    expect(w1).toHaveLength(1);

    const w2: string[] = [];
    const g = normalizeFighter(
      { specials: [{ type: "fireball", name: "B", speed: "fast", damageBonus: "lots" }] }, "z", known, (m) => w2.push(m),
    )!;
    expect(g.specials[0]).not.toHaveProperty("speed");
    expect(g.specials[0]).not.toHaveProperty("damageBonus");
    expect(w2).toHaveLength(2);
  });

  it("returns null with a warning for non-objects", () => {
    const warnings: string[] = [];
    expect(normalizeFighter(42, "x", known, (m) => warnings.push(m))).toBeNull();
    expect(warnings).toHaveLength(1);
  });

  it("warns about a word where a stat number goes, and uses the default", () => {
    const warnings: string[] = [];
    const f = normalizeFighter({ stats: { speed: "fast" } }, "z", known, (m) => warnings.push(m))!;
    expect(f.stats.speed).toBe(5);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/speed.*"fast"/);
  });
});

// The character files are kid files: kids add, delete and change them. This
// only checks what must stay true after any edit: each one becomes a fighter.
// (Warnings are fine: they're how the game explains a typo.)
const characterFiles = import.meta.glob<{ fighter?: unknown }>("../src/characters/*.ts", { eager: true });

describe("the character files", () => {
  it.each(Object.entries(characterFiles))("%s becomes a fighter", (path, mod) => {
    const id = path.split("/").pop()!.replace(/\.ts$/, "");
    expect(normalizeFighter(mod.fighter, id, undefined, () => {})).not.toBeNull();
  });
});
