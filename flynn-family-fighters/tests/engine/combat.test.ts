import { describe, expect, it, vi } from "vitest";
import { normalizeFighter, type Fighter } from "../../src/fighter";
import { B, type InputFrame } from "../../src/engine/input";
import { createMatch, stepMatch } from "../../src/engine/match";
import { attackFor, boxesOverlap, HURTBOXES, hurtbox, normalizeAttack } from "../../src/engine/combat";
import type { MatchEvent, MatchState } from "../../src/engine/types";
import { NORMALS } from "../../src/moves";
import { testSettings } from "../fixtures/settings";

// Engine tests use their own frozen copies of the kid files moves.ts and
// settings.ts (see tests/fixtures/), so a kid's edits there can't fail them.
vi.mock("../../src/moves", () => import("../fixtures/moves"));

type FighterOpts = { power?: number; height?: number; normals?: Record<string, unknown> };

function fighter(over: FighterOpts = {}): Fighter {
  return normalizeFighter(
    { name: "T", look: { height: over.height ?? 1 }, stats: { power: over.power ?? 5 }, normals: over.normals ?? {} },
    "t", [], () => {},
  )!;
}

/** A match past the intro, with P1 at x1 and P2 at x2 (P1 on the left, facing right). */
function newMatch(x1: number, x2: number, a: FighterOpts = {}, b: FighterOpts = {}): MatchState {
  const s = createMatch({ p1: fighter(a), p2: fighter(b), settings: testSettings, seed: 1 });
  for (let i = 0; i < 90; i++) stepMatch(s, [0, 0]);
  s.fighters[0].x = x1;
  s.fighters[1].x = x2;
  return s;
}

/** Runs n steps and returns every event, tagged with the step it happened on. */
function run(s: MatchState, n: number, p1: InputFrame = 0, p2: InputFrame = 0): (MatchEvent & { step: number })[] {
  const out: (MatchEvent & { step: number })[] = [];
  for (let i = 0; i < n; i++) for (const e of stepMatch(s, [p1, p2])) out.push({ ...e, step: i });
  return out;
}

const of = <E extends MatchEvent>(events: E[], type: MatchEvent["type"]): E[] => events.filter((e) => e.type === type);

// P2 stands on the right facing left, so "back" for P2 is RIGHT.
const P2_BACK = B.RIGHT;
const P2_DOWN_BACK = B.DOWN | B.RIGHT;

describe("forgiving moves table", () => {
  it("an unknown level becomes mid, with one friendly warning", () => {
    const warn = vi.fn();
    const a = normalizeAttack({ ...NORMALS["cr.LK"], level: "sideways" }, warn);
    expect(a.level).toBe("mid");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/cr\.LK/);
    expect(warn.mock.calls[0][0]).toMatch(/"high", "mid" or "low"/);
  });

  it("a level in the wrong case is fixed, with a warning", () => {
    const warn = vi.fn();
    expect(normalizeAttack({ ...NORMALS["cr.LK"], level: " Low" }, warn).level).toBe("low");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("good levels pass through quietly", () => {
    const warn = vi.fn();
    for (const m of Object.values(NORMALS)) expect(normalizeAttack(m, warn).level).toBe(m.level);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("boxes", () => {
  it("overlap flips with facing", () => {
    const hit = { x: 20, y: -100, w: 60, h: 20 };
    const body = { x: -40, y: -250, w: 80, h: 250 };
    expect(boxesOverlap(hit, 100, 0, 1, body, 200, 0, -1)).toBe(true);
    expect(boxesOverlap(hit, 100, 0, -1, body, 200, 0, -1)).toBe(false);
    expect(boxesOverlap(hit, 300, 0, -1, body, 200, 0, 1)).toBe(true);
    expect(boxesOverlap(hit, 100, 0, 1, body, 300, 0, -1)).toBe(false);
  });

  it("hurtboxes scale y and h with the look's height; the air box sits on the jumper's y", () => {
    const s = newMatch(300, 660, { height: 1.1 });
    const f = s.fighters[0];
    const near = (b: { x: number; y: number; w: number; h: number }, x: number, y: number, w: number, h: number) =>
      [b.x, b.y, b.w, b.h].forEach((v, i) => expect(v).toBeCloseTo([x, y, w, h][i], 5));
    near(hurtbox(f), -40, -275, 80, 275);
    f.crouching = true;
    near(hurtbox(f), -40, -176, 80, 176);
    f.airborne = true;
    expect(hurtbox(f).y).toBeCloseTo(HURTBOXES.air.y * 1.1, 5);
    expect(hurtbox(f).h).toBeCloseTo(HURTBOXES.air.h * 1.1, 5);
  });

  it("attackFor picks stand / crouch / jump / close versions and scales reach by height", () => {
    const s = newMatch(300, 500, { height: 1.15 });
    const [f, o] = s.fighters;
    expect(attackFor(f, B.MP, o).id).toBe("st.MP");
    o.x = 380;
    expect(attackFor(f, B.MP, o).id).toBe("cl.MP");
    expect(attackFor(f, B.HP, o).id).toBe("cl.HP");
    expect(attackFor(f, B.LP, o).id).toBe("st.LP");
    run(s, 1, B.DOWN);
    expect(attackFor(f, B.HK, o).id).toBe("cr.HK");
    f.airborne = true;
    expect(attackFor(f, B.LK, o).id).toBe("j.LK");
    const base = NORMALS["j.LK"].hitbox;
    const got = attackFor(f, B.LK, o).hitbox;
    expect(got.x + got.w).toBeCloseTo((base.x + base.w) * 1.15, 5);
    expect(got.h).toBeCloseTo(base.h * 1.15, 5);
  });
});

describe("hits", () => {
  it("a light punch hits on frame 4 for 4 damage, with hitstun and hitstop on both", () => {
    const s = newMatch(400, 520);
    const [p1, p2] = s.fighters;
    const before = run(s, 4, B.LP);
    expect(of(before, "hit")).toHaveLength(0);
    expect(p1.state).toBe("attack");
    const events = run(s, 1, B.LP); // still held: not a new press
    expect(of(events, "hit")).toEqual([expect.objectContaining({ type: "hit", player: 0, damage: 4 })]);
    expect(p2.health).toBe(p2.maxHealth - 4);
    expect(p2.state).toBe("hitstun");
    expect(p1.hitstop).toBe(8);
    expect(p2.hitstop).toBe(8);
  });

  it("hitstop freezes both fighters' frames", () => {
    const s = newMatch(400, 520);
    const [p1, p2] = s.fighters;
    run(s, 5, B.LP);
    const frame = p1.attack!.frame, stun = p2.stateFrame, x = p2.x;
    run(s, 8, 0, B.LEFT);
    expect(p1.attack!.frame).toBe(frame);
    expect(p2.stateFrame).toBe(stun);
    expect(p2.x).toBe(x);
    expect(p1.hitstop).toBe(0);
    run(s, 1);
    expect(p1.attack!.frame).toBe(frame + 1);
    expect(p2.stateFrame).toBe(stun + 1);
  });

  it("the attack ends after startup + active + recovery, and hitstun ends too", () => {
    const s = newMatch(400, 520);
    const [p1, p2] = s.fighters;
    run(s, 5, B.LP); // hit on step 4 (attack frame 4)
    run(s, 8); // hitstop
    run(s, 9); // attack frames 5..13
    expect(p1.state).toBe("attack");
    run(s, 1);
    expect(p1.state).toBe("idle");
    expect(p1.attack).toBeNull();
    expect(p2.state).toBe("hitstun"); // hitstun 16 counts from the hit: 10 steps so far
    run(s, 5);
    expect(p2.state).toBe("hitstun");
    run(s, 1);
    expect(p2.state).toBe("idle");
  });

  it("a whiffed attack emits whiff when it ends", () => {
    const s = newMatch(300, 660);
    const events = run(s, 15, B.LP); // in the attack for frames 0..13, free on step 14
    expect(of(events, "whiff")).toEqual([expect.objectContaining({ player: 0, step: 14 })]);
    expect(s.fighters[0].state).toBe("idle");
  });

  it("damage scales with power and damageScale", () => {
    const s = newMatch(400, 520, { power: 10 });
    s.settings = { ...s.settings, damageScale: 2 };
    run(s, 10, B.HP); // 120 px is too far for close HP, so st.HP hits on frame 9
    // st.HP 12 × (0.8 + 0.4) × 2 = 28.8 → 29
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 29);
  });

  it("a character's normals override replaces the base damage", () => {
    const s = newMatch(400, 520, { normals: { "st.HP": { damage: 20 } } });
    run(s, 10, B.HP);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 20);
  });

  it("an attack can start out of guard (counterattack)", () => {
    const s = newMatch(400, 600);
    run(s, 1, B.HP, P2_BACK);
    expect(s.fighters[1].state).toBe("guard");
    run(s, 1, B.HP, P2_BACK | B.LP);
    expect(s.fighters[1].state).toBe("attack");
  });
});

describe("blocking", () => {
  it("holding back blocks a standing LP: no damage, blockstun", () => {
    const s = newMatch(400, 520);
    const p2 = s.fighters[1];
    const events = run(s, 5, B.LP, P2_BACK);
    expect(of(events, "block")).toEqual([expect.objectContaining({ player: 0 })]);
    expect(of(events, "hit")).toHaveLength(0);
    expect(p2.health).toBe(p2.maxHealth);
    expect(p2.state).toBe("blockstun");
  });

  it("a low can't be blocked standing", () => {
    const s = newMatch(400, 530);
    const events = run(s, 7, B.DOWN | B.MK, P2_BACK);
    expect(of(events, "hit")).toHaveLength(1);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 8);
  });

  it("a low is blocked crouching", () => {
    const s = newMatch(400, 530);
    const events = run(s, 7, B.DOWN | B.MK, P2_DOWN_BACK);
    expect(of(events, "block")).toHaveLength(1);
  });

  it("a jump-in high can't be blocked crouching", () => {
    const s = newMatch(400, 500);
    const p1 = s.fighters[0];
    p1.airborne = true;
    p1.state = "jump";
    p1.y = -150;
    p1.vy = 0;
    const events = run(s, 10, B.HK, P2_DOWN_BACK);
    expect(s.fighters[1].crouching).toBe(true);
    expect(of(events, "hit")).toHaveLength(1);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 12);
  });
});

describe("guard (proximity guard)", () => {
  it("holding back with nothing coming walks back", () => {
    const s = newMatch(300, 550);
    run(s, 10, 0, P2_BACK);
    expect(s.fighters[1].state).toBe("walkB");
    expect(s.fighters[1].x).toBeGreaterThan(550);
  });

  it("holding back as st.HP starts raises the guard, stops, then blocks", () => {
    const s = newMatch(400, 600);
    const p2 = s.fighters[1];
    for (let i = 0; i < 9; i++) {
      const events = run(s, 1, B.HP, P2_BACK);
      expect(of(events, "block")).toHaveLength(0);
      expect(p2.state).toBe("guard");
      expect(p2.crouching).toBe(false);
      expect(p2.x).toBe(600);
    }
    const events = run(s, 1, B.HP, P2_BACK);
    expect(of(events, "block")).toHaveLength(1);
    expect(p2.health).toBe(p2.maxHealth);
  });

  it("down-back guards crouching", () => {
    const s = newMatch(400, 600);
    run(s, 3, B.HP, P2_DOWN_BACK);
    expect(s.fighters[1].state).toBe("guard");
    expect(s.fighters[1].crouching).toBe(true);
  });

  it("is not raised by an attack further than 300 px away", () => {
    const s = newMatch(300, 610);
    run(s, 3, B.HP, P2_BACK);
    expect(s.fighters[1].state).toBe("walkB");
  });

  it("goes back to walking once the attack is over and nothing else is coming", () => {
    const s = newMatch(400, 600);
    const p2 = s.fighters[1];
    run(s, 10, B.HP, P2_BACK); // blocked on the last step
    let walked = false;
    for (let i = 0; i < 60 && !walked; i++) {
      run(s, 1, 0, P2_BACK);
      walked = p2.state === "walkB";
    }
    expect(walked).toBe(true);
    const x = p2.x;
    run(s, 2, 0, P2_BACK);
    expect(p2.x).toBeGreaterThan(x);
  });

  it("drops during a whiffed attack's recovery, since nothing is coming any more", () => {
    const s = newMatch(400, 650); // st.HP can't reach 250 px
    const p2 = s.fighters[1];
    run(s, 13, B.HP, P2_BACK); // startup + active: frames 0..12
    expect(p2.state).toBe("guard");
    run(s, 1, B.HP, P2_BACK); // frame 13: recovery
    expect(s.fighters[0].state).toBe("attack");
    expect(p2.state).toBe("walkB");
  });

  it("is raised by an opponent's projectile coming this way within 360 px", () => {
    const s = newMatch(200, 600);
    const attack = normalizeAttack(NORMALS["st.LP"]);
    s.projectiles.push({ owner: 0, x: 300, y: -120, vx: 4, color: "#fff", attack, age: 0 });
    run(s, 1, 0, P2_BACK);
    expect(s.fighters[1].state).toBe("guard");
    s.projectiles[0].vx = -4; // flying away
    run(s, 1, 0, P2_BACK);
    expect(s.fighters[1].state).toBe("walkB");
  });
});

describe("pushback, trades and combos", () => {
  it("in the corner the attacker is pushed back instead", () => {
    const s = newMatch(800, 900);
    s.fighters[1].x = s.stage.right;
    run(s, 5, B.LP);
    expect(s.fighters[1].x).toBe(s.stage.right);
    expect(s.fighters[0].x).toBe(800 - NORMALS["st.LP"].pushback);
  });

  it("away from walls the defender is pushed back", () => {
    const s = newMatch(400, 520);
    run(s, 5, B.LP);
    expect(s.fighters[0].x).toBe(400);
    expect(s.fighters[1].x).toBe(520 + NORMALS["st.LP"].pushback);
  });

  it("both MPs on the same frame trade", () => {
    const s = newMatch(400, 540);
    const events = run(s, 7, B.MP, B.MP);
    const hits = of(events, "hit");
    expect(hits).toHaveLength(2);
    expect(hits[0].step).toBe(hits[1].step);
    expect(s.fighters[0].health).toBe(s.fighters[0].maxHealth - 8);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 8);
    expect(s.fighters[0].state).toBe("hitstun");
    expect(s.fighters[1].state).toBe("hitstun");
  });

  // Light hitstun 16 vs cr.LP: hit on step 4, hitstop steps 5..12, the attack is free
  // on step 22, and the defender's hitstun runs out on step 28. The second cr.LP hits
  // 4 steps after its press, so presses on steps 22 and 23 combo (one frame to spare).
  function crLpTwice(secondPress: number): { s: MatchState; events: (MatchEvent & { step: number })[] } {
    const s = newMatch(400, 500);
    const events: (MatchEvent & { step: number })[] = [];
    for (let step = 0; step < secondPress + 6; step++) {
      const input = step === 0 || step === secondPress ? B.DOWN | B.LP : B.DOWN;
      for (const e of stepMatch(s, [input, 0])) events.push({ ...e, step });
    }
    return { s, events };
  }

  it("cr.LP, cr.LP links: the second press on the first free frame combos", () => {
    const { s, events } = crLpTwice(22);
    expect(of(events, "hit").map((e) => e.step)).toEqual([4, 26]);
    expect(s.fighters[1].comboHits).toBe(2);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 8);
  });

  it("a press before the attack is over is ignored", () => {
    const { events } = crLpTwice(21);
    expect(of(events, "hit").map((e) => e.step)).toEqual([4]);
  });

  it("cr.LP, cr.LP still combos one frame late, but not two", () => {
    expect(crLpTwice(23).s.fighters[1].comboHits).toBe(2);
    const late = crLpTwice(24);
    expect(of(late.events, "hit").map((e) => e.step)).toEqual([4, 28]);
    expect(late.s.fighters[1].comboHits).toBe(1);
  });

  it("the combo count resets when the defender recovers", () => {
    const s = newMatch(400, 500);
    const p2 = s.fighters[1];
    run(s, 5, B.DOWN | B.LP);
    run(s, 40, B.DOWN);
    expect(p2.state).toBe("idle");
    expect(p2.comboHits).toBe(0);
  });
});

describe("determinism", () => {
  it("same inputs give identical state with attacks and guards", () => {
    const script = (i: number): [number, number] => [
      [B.LP, B.RIGHT, B.DOWN | B.MK, 0, B.HP, B.UP | B.RIGHT, B.HK][Math.floor(i / 5) % 7],
      [B.RIGHT, B.MP, B.DOWN | B.RIGHT, B.LEFT, 0, B.LK][Math.floor(i / 7) % 6],
    ];
    const a = newMatch(400, 560);
    const b = newMatch(400, 560);
    for (let i = 0; i < 400; i++) {
      expect(stepMatch(a, script(i))).toEqual(stepMatch(b, script(i)));
    }
    expect(a).toEqual(b);
  });
});
