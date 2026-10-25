import { describe, expect, it } from "vitest";
import { CpuBrain } from "../../src/engine/cpu";
import { B, type InputFrame } from "../../src/engine/input";
import { createMatch, stepMatch } from "../../src/engine/match";
import { Rng } from "../../src/engine/rng";
import type { MatchState } from "../../src/engine/types";
import { MOVE_TYPE_NAMES, normalizeFighter, type Fighter } from "../../src/fighter";
import { mySettings } from "../../src/settings";

const ALL_BITS = Object.values(B).reduce((a, b) => a | b, 0);

function fighter(specials: unknown[]): Fighter {
  return normalizeFighter({ name: "T", look: {}, specials }, "t", [...MOVE_TYPE_NAMES], () => {})!;
}
const WITH_FIREBALL = fighter([{ type: "fireball", name: "BLAST" }, { type: "uppercut", name: "RISER" }]);
const PLAIN = fighter([]);

function fightMatch(p1: Fighter, p2: Fighter, seed = 1): MatchState {
  const s = createMatch({ p1, p2, settings: mySettings, seed });
  for (let i = 0; i < 90; i++) stepMatch(s, [0, 0]);
  return s;
}

describe("CpuBrain", () => {
  it("plays the same inputs for the same seed", () => {
    const play = () => {
      const s = fightMatch(WITH_FIREBALL, WITH_FIREBALL);
      const brain = new CpuBrain(1, 5, new Rng(42));
      const out: InputFrame[] = [];
      for (let i = 0; i < 200; i++) {
        const input = brain.next(s);
        out.push(input);
        stepMatch(s, [0, input]);
      }
      return out;
    };
    const first = play();
    expect(first).toEqual(play());
    expect(first.some((f) => f !== 0)).toBe(true);
  });

  it("throws a fireball from across the stage", () => {
    const s = fightMatch(PLAIN, WITH_FIREBALL);
    s.fighters[0].x = 200;
    s.fighters[1].x = 700;
    const brain = new CpuBrain(1, 8, new Rng(3));
    let fired = false;
    for (let i = 0; i < 300 && !fired; i++) {
      const events = stepMatch(s, [0, brain.next(s)]);
      fired = events.some((e) => e.type === "projectile" && e.player === 1);
    }
    expect(fired).toBe(true);
  });

  /**
   * P1 waits until the CPU is standing around, then throws one st.HP at it (10 times,
   * each in a fresh match). Counts how often the CPU blocked it or got hit.
   */
  function heavyPunchTrials(difficulty: number): { blocked: number; hit: number } {
    const standing = ["idle", "walkF", "walkB", "crouch", "guard"];
    let blocked = 0;
    let hit = 0;
    for (let trial = 0; trial < 10; trial++) {
      const s = fightMatch(PLAIN, PLAIN, trial + 1);
      s.fighters[0].x = 400;
      s.fighters[1].x = 520;
      const brain = new CpuBrain(1, difficulty, new Rng(trial + 100));
      let swung = -1;
      for (let i = 0; i < 400 && (swung < 0 || i < swung + 40); i++) {
        const ready = swung < 0 && i >= trial * 3 && s.fighters[0].state === "idle" && standing.includes(s.fighters[1].state);
        if (ready) swung = i;
        for (const e of stepMatch(s, [ready ? B.HP : 0, brain.next(s)])) {
          if (swung < 0 || e.player !== 0) continue;
          if (e.type === "block") blocked++;
          if (e.type === "hit") hit++;
        }
      }
    }
    return { blocked, hit };
  }

  it("blocks heavy punches at difficulty 8", () => {
    expect(heavyPunchTrials(8).blocked).toBeGreaterThanOrEqual(1);
  });

  it("gets hit by most heavy punches at difficulty 1", () => {
    expect(heavyPunchTrials(1).hit).toBeGreaterThanOrEqual(7);
  });

  it("only returns real buttons, and a CPU-vs-CPU match runs 2000 frames", () => {
    const s = fightMatch(WITH_FIREBALL, WITH_FIREBALL, 7);
    const a = new CpuBrain(0, 4, new Rng(1));
    const b = new CpuBrain(1, 6, new Rng(2));
    for (let i = 0; i < 2000; i++) {
      const [ia, ib] = [a.next(s), b.next(s)];
      expect(ia & ~ALL_BITS).toBe(0);
      expect(ib & ~ALL_BITS).toBe(0);
      stepMatch(s, [ia, ib]);
    }
    expect(["fight", "ko", "roundOver", "intro", "matchOver"]).toContain(s.phase);
    expect(s.fighters[0].health + s.fighters[1].health).toBeLessThan(s.fighters[0].maxHealth * 2);
  });
});
