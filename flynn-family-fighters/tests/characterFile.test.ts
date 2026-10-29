import { describe, expect, it } from "vitest";
import { normalizeFighter, type FighterFile } from "../src/fighter";
import { STAGES, normalizeStage, type StageFile } from "../src/stages";

// The real test here is `npm run typecheck`: every object below must compile.
// Kid files (character files, stages.ts) are typed loosely on purpose, because
// a typo that failed typecheck would block CI and image publishing for the
// whole arcade. The game fixes these at runtime instead (with a warning).

/** The example character file from the design spec, exactly as written there. */
const specExample: FighterFile = {
  name: "COLIN",
  look: {
    body: "masculine",        // masculine | feminine (the body's frame)
    archetype: "martial",     // martial | brawler (fighting style + outfit)
    height: 1.08,             // 0.85 (short) to 1.15 (tall)
    build: "lean",            // lean | medium | big
    muscle: 1.15,             // 0.8 (wiry) to 1.4 (HUGE)
    skin: "#f1c08f",
    eyes: "#3b6fb6",
    face: { expression: "determined", jaw: "square", brows: "heavy" },
    hair: { style: "swoop", color: "#f7d35c" },
    top: "#2f6fd6",           // gi jacket / tank top color
    bottom: "#2f6fd6",        // gi pants / jeans / leggings color
    belt: "#1d1d1d",
    shoes: "#ffffff",         // bare feet for martial artists
    extras: ["headband"],     // headband, cap, bow, earrings, glasses, wristbands…
    accent: "#e8e8e8",        // color for extras
    weapon: "none",           // or "baseball-bat", …
  },
  stats: { speed: 7, power: 5, health: 100, jump: 6 },   // 1–10 (health 50–150)
  specials: [
    { type: "fireball", name: "DONUT BLAST", color: "#ff7ad9" },
    { type: "uppercut", name: "HOME RUN SWING" },
  ],
  winQuote: "Race you home!",
  stage: "track",             // home stage in versus (optional)
};

/** Odd but understandable edits a kid might make. */
const oddEdits: FighterFile[] = [
  { name: "ZED", look: { height: "tall", hair: { style: "spikey" } } },
  { look: { muscle: "HUGE", extras: "cap", weapon: "light-saber", face: { nose: "pointy" } } },
  { stats: { speed: "fast", health: 999 }, specials: [{ type: "laser" }, { type: "fireball", speed: "zoom" }] },
  { normals: { "st.HK": { damage: 20, reach: 1.2 }, "st.XX": { damage: "lots" } } },
  { id: "someone-else", stage: "the-moon" },
  {},
];

const oddStages: StageFile[] = [
  { id: "moon", name: "THE MOON", sky: ["#000000", "#222244", "#444466"], mountains: [], props: ["craters"] },
  { id: "park" },
  { name: "NO ID", floor: "green" },
];

describe("character files", () => {
  it("the spec's example becomes a fighter with no warnings", () => {
    const warnings: string[] = [];
    expect(normalizeFighter(specExample, "colin", undefined, (m) => warnings.push(m))).not.toBeNull();
    expect(warnings).toEqual([]);
  });

  it.each(oddEdits.map((f, i) => [i, f] as const))("odd edit %i still becomes a fighter", (_i, file) => {
    expect(normalizeFighter(file, "zed", undefined, () => {})).not.toBeNull();
  });

  it("the id always comes from the file's name", () => {
    expect(normalizeFighter({ id: "someone-else" }, "zed", undefined, () => {})!.id).toBe("zed");
  });
});

describe("stages", () => {
  it.each([...oddStages, ...STAGES].map((s, i) => [i, s] as const))("stage %i becomes a complete stage", (_i, stage) => {
    const s = normalizeStage(stage, () => {});
    expect(s.sky).toHaveLength(2);
    expect(s.mountains.length).toBeGreaterThan(0);
  });
});
