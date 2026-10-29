import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeFighter, type Fighter } from "../../src/fighter";
import { B, type InputFrame } from "../../src/engine/input";
import { createMatch, stepMatch } from "../../src/engine/match";
import { trySpecial } from "../../src/engine/specials";
import type { MatchEvent, MatchState } from "../../src/engine/types";
import { KNOWN_MOVE_TYPES, MOVE_TYPES, type MoveTypeDef } from "../../src/moves";
import { testSettings } from "../fixtures/settings";

// Engine tests use their own frozen copies of the kid files moves.ts and
// settings.ts (see tests/fixtures/), so a kid's edits there can't fail them.
vi.mock("../../src/moves", () => import("../fixtures/moves"));

type Opts = { specials?: unknown[]; height?: number; jump?: number; known?: string[] };

const ALL = [
  { type: "fireball", name: "BLAST" },
  { type: "uppercut", name: "RISER" },
  { type: "spin-kick", name: "SPINNER" },
  { type: "charge-dash", name: "DASHER" },
];

function fighter(o: Opts = {}): Fighter {
  return normalizeFighter(
    { name: "T", look: { height: o.height ?? 1 }, stats: { power: 5, jump: o.jump ?? 5 }, specials: o.specials ?? ALL },
    "t", o.known ?? KNOWN_MOVE_TYPES, () => {},
  )!;
}

/** A match past the intro, with P1 at x1 and P2 at x2 (P1 on the left, facing right). */
function newMatch(x1: number, x2: number, a: Opts = {}, b: Opts = {}): MatchState {
  const s = createMatch({ p1: fighter(a), p2: fighter(b), settings: testSettings, seed: 1 });
  for (let i = 0; i < 90; i++) stepMatch(s, [0, 0]);
  s.fighters[0].x = x1;
  s.fighters[1].x = x2;
  return s;
}

type Tagged = MatchEvent & { step: number };

/**
 * Runs `n` steps. `p1` and `p2` are either one input held every step, or a
 * function of the step number (steps start at `from`).
 */
function run(
  s: MatchState, n: number,
  p1: InputFrame | ((step: number) => InputFrame) = 0,
  p2: InputFrame | ((step: number) => InputFrame) = 0,
  from = 0,
): Tagged[] {
  const at = (p: typeof p1, i: number) => (typeof p === "function" ? p(i) : p);
  const out: Tagged[] = [];
  for (let i = from; i < from + n; i++) for (const e of stepMatch(s, [at(p1, i), at(p2, i)])) out.push({ ...e, step: i });
  return out;
}

/** A list of inputs, one per step from step 0, then nothing. */
const script = (...inputs: InputFrame[]) => (step: number) => inputs[step] ?? 0;

const of = <E extends MatchEvent>(events: E[], type: MatchEvent["type"]): E[] => events.filter((e) => e.type === type);

// P1 faces right: forward is RIGHT, back is LEFT. P2 faces left: forward is LEFT, back is RIGHT.
const P1_QCF = [B.DOWN, B.DOWN | B.RIGHT, B.RIGHT];
const P2_QCF = [B.DOWN, B.DOWN | B.LEFT, B.LEFT];
const PUNCHES = [B.LP, B.MP, B.HP];
/** qcf + a punch for P1, on steps 0, 1, 2. */
const p1Fireball = (punch: number = B.LP) => script(P1_QCF[0], P1_QCF[1], P1_QCF[2] | punch);

describe("fireball", () => {
  it("qcf + LP throws a projectile on frame 12 that travels 4 px a frame and hits for 10", () => {
    const s = newMatch(300, 660);
    const events = run(s, 15, p1Fireball());
    expect(of(events, "special")).toMatchObject([{ player: 0, name: "BLAST", step: 2 }]);
    expect(of(events, "projectile")).toMatchObject([{ player: 0, step: 14 }]);
    const x = s.projectiles[0].x;
    run(s, 1);
    expect(s.projectiles[0].x).toBeCloseTo(x + 4, 5);
    const later = run(s, 120);
    expect(of(later, "hit")).toMatchObject([{ player: 0, damage: 10 }]);
    expect(s.fighters[1].health).toBe(90);
    expect(s.projectiles).toHaveLength(0);
    expect(s.fighters[0].projectileOut).toBe(false);
  });

  it("chips round(10 × 0.25) = 3 through a block", () => {
    const s = newMatch(300, 660);
    const events = run(s, 140, p1Fireball(), B.RIGHT);
    expect(of(events, "block")).toHaveLength(1);
    expect(of(events, "hit")).toHaveLength(0);
    expect(s.fighters[1].health).toBe(97);
  });

  it("only one at a time: a second fireball while one is out does nothing", () => {
    const s = newMatch(300, 900);
    const first = run(s, 50, p1Fireball());
    expect(s.projectiles).toHaveLength(1);
    const second = run(s, 3, script(...P1_QCF.slice(0, 2), P1_QCF[2] | B.LP), 0);
    const after = run(s, 20);
    expect(of([...first, ...second, ...after], "projectile")).toHaveLength(1);
    expect(of([...second, ...after], "special")).toHaveLength(0);
  });

  it("two fireballs that touch destroy each other, and nobody gets hurt", () => {
    const s = newMatch(300, 660);
    const p2 = script(P2_QCF[0], P2_QCF[1], P2_QCF[2] | B.LP);
    const events = run(s, 120, p1Fireball(), p2);
    expect(of(events, "projectile")).toHaveLength(2);
    expect(of(events, "hit")).toHaveLength(0);
    expect(s.projectiles).toHaveLength(0);
    expect(s.fighters.map((f) => f.health)).toEqual([100, 100]);
    expect(s.fighters.map((f) => f.projectileOut)).toEqual([false, false]);
  });
});

describe("fireballs and knockdowns", () => {
  it("pass through a fighter who is down or getting up", () => {
    const s = newMatch(300, 420);
    const events = run(s, 10, (i) => (i === 0 ? B.DOWN | B.HK : B.DOWN)); // a sweep knocks P2 down
    expect(of(events, "knockdown")).toMatchObject([{ player: 1 }]);
    let step = 10;
    while (s.fighters[0].attack) events.push(...run(s, 1, B.DOWN, 0, step++));
    const from = step;
    const fb = (i: number) => [B.DOWN, B.DOWN | B.RIGHT, B.RIGHT | B.HP][i - from] ?? 0;
    let passedThrough = 0;
    for (let i = 0; i < 100; i++, step++) {
      events.push(...run(s, 1, fb, 0, step));
      const p = s.projectiles[0];
      if (p && Math.abs(p.x - s.fighters[1].x) < 28 + 40) {
        expect(["knockdown", "getup"]).toContain(s.fighters[1].state);
        passedThrough++;
      }
    }
    expect(of(events, "projectile")).toHaveLength(1);
    expect(passedThrough).toBeGreaterThan(5);
    expect(of(events, "hit").map((e) => e.name)).toEqual(["cr.HK"]);
  });
});

describe("dodging fireballs", () => {
  /** Tries every frame for P2 to press `jump` (once) against P1's fireball, and counts the frames where P2 isn't hurt. */
  function dodgingFrames(strength: 0 | 1 | 2, jumpStat: number, jump: InputFrame): number {
    let dodged = 0;
    for (let press = 0; press < 160; press++) {
      const s = newMatch(200, 700, {}, { jump: jumpStat });
      run(s, 260, p1Fireball(PUNCHES[strength]), (i) => (i === press ? jump : 0));
      if (s.fighters[1].health === 100) dodged++;
    }
    return dodged;
  }

  for (const strength of [0, 1, 2] as const) {
    for (const jumpStat of [1, 6, 10]) {
      it(`a forward jump has 20+ dodging frames (${["LP", "MP", "HP"][strength]}, jump ${jumpStat})`, () => {
        expect(dodgingFrames(strength, jumpStat, B.UP | B.LEFT)).toBeGreaterThanOrEqual(20);
      });
    }
  }

  for (const jumpStat of [1, 6, 10]) {
    it(`jumping straight up clears an HP fireball with 6+ frames (jump ${jumpStat})`, () => {
      expect(dodgingFrames(2, jumpStat, B.UP)).toBeGreaterThanOrEqual(6);
    });
  }

  it("crouching never dodges", () => {
    for (const strength of [0, 1, 2] as const) {
      const s = newMatch(200, 700);
      run(s, 200, p1Fireball(PUNCHES[strength]), B.DOWN);
      expect(s.fighters[1].health).toBe(90);
    }
  });
});

describe("uppercut", () => {
  // P2 jumps in from 500 and kicks with j.HK; P1 stands at 300.
  const p2JumpIn = script(B.UP | B.LEFT, ...Array<number>(13).fill(0), B.HK);

  /** The step P2's j.HK hits a P1 who does nothing. */
  function jumpInHitStep(): number {
    const s = newMatch(300, 500);
    const hit = of(run(s, 60, 0, p2JumpIn), "hit");
    expect(hit).toMatchObject([{ player: 1, name: "j.HK" }]);
    return hit[0].step;
  }

  it("is invulnerable on frames 0-6 (HP) and beats a jump-in that would hit", () => {
    const h = jumpInHitStep();
    const s = newMatch(300, 500);
    const dp = (i: number) => (i === h - 2 ? B.RIGHT : i === h - 1 ? B.DOWN : i === h ? B.DOWN | B.RIGHT | B.HP : 0);
    const events = run(s, h + 7, dp, p2JumpIn);
    expect(of(events, "special")).toMatchObject([{ player: 0, name: "RISER", step: h }]);
    expect(s.fighters[0].health).toBe(100);
    const rest = run(s, 60, 0, 0, h + 7);
    expect(of([...events, ...rest], "hit").filter((e) => e.player === 1)).toHaveLength(0);
    expect(of([...events, ...rest], "knockdown")).toMatchObject([{ player: 1 }]);
  });

  it("an air knockdown keeps the full 40 frames on the floor", () => {
    const h = jumpInHitStep();
    const s = newMatch(300, 500);
    const dp = (i: number) => (i === h - 2 ? B.RIGHT : i === h - 1 ? B.DOWN : i === h ? B.DOWN | B.RIGHT | B.HP : 0);
    let landed = -1;
    let gotUp = -1;
    for (let i = 0; i < 160 && gotUp < 0; i++) {
      run(s, 1, dp(i), p2JumpIn(i));
      const p2 = s.fighters[1];
      if (p2.state === "knockdown" && !p2.airborne && landed < 0) landed = i;
      if (p2.state === "getup" && gotUp < 0) gotUp = i;
    }
    expect(landed).toBeGreaterThan(h);
    expect(gotUp - landed).toBe(40);
  });

  it("rises, then lands and recovers for 28 frames", () => {
    const s = newMatch(300, 800);
    run(s, 3, script(B.RIGHT, B.DOWN, B.DOWN | B.RIGHT | B.LP));
    let landedAt = -1;
    let freeAt = -1;
    let peak = 0;
    for (let i = 3; i < 120 && freeAt < 0; i++) {
      run(s, 1);
      const p1 = s.fighters[0];
      peak = Math.min(peak, p1.y);
      if (landedAt < 0 && peak < 0 && !p1.airborne) landedAt = i;
      if (landedAt >= 0 && p1.attack === null) freeAt = i;
    }
    expect(peak).toBeLessThan(-100);
    expect(freeAt - landedAt).toBe(28);
  });
});

describe("charge-dash", () => {
  it("charge back 45 frames, then forward + MP lunges and hits from 200 away", () => {
    const s = newMatch(60, 260);
    run(s, 45, B.LEFT);
    const x0 = s.fighters[0].x;
    const events = run(s, 1, B.RIGHT | B.MP);
    expect(of(events, "special")).toMatchObject([{ player: 0, name: "DASHER" }]);
    let maxVx = 0;
    const later: Tagged[] = [];
    for (let i = 0; i < 30; i++) {
      later.push(...run(s, 1));
      maxVx = Math.max(maxVx, s.fighters[0].vx);
    }
    expect(maxVx).toBeGreaterThan(0);
    expect(s.fighters[0].x).toBeGreaterThan(x0 + 100);
    expect(of(later, "hit")).toMatchObject([{ player: 0, name: "charge-dash", damage: 11 }]);
  });
});

describe("cancels", () => {
  it("cr.MK cancels into a fireball during its hitstop, for a 2-hit combo", () => {
    const s = newMatch(300, 410);
    const p1 = (i: number) => (i === 0 ? B.DOWN | B.MK : i < 7 ? B.DOWN : i === 7 ? B.DOWN | B.RIGHT : i === 8 ? B.RIGHT | B.LP : 0);
    const events: Tagged[] = [];
    let combo = 0;
    for (let i = 0; i < 60; i++) {
      events.push(...run(s, 1, p1, 0, i));
      if (events.some((e) => e.type === "hit" && e.name === "fireball") && combo === 0) combo = s.fighters[1].comboHits;
    }
    const mk = of(events, "hit").find((e) => e.name === "cr.MK")!;
    expect(mk.step).toBe(6);
    const special = of(events, "special")[0];
    // cr.MK alone: 6 + 4 + 12 frames, plus 10 frames of hitstop.
    expect(special.step).toBeLessThan(22);
    expect(combo).toBe(2);
  });

  it("a special pressed a couple of frames early still comes out (input buffer)", () => {
    const s = newMatch(300, 900);
    // st.HK whiffs: 9 + 4 + 20 = 33 frames. The fireball is input on steps 29-31, while still recovering.
    const p1 = (i: number) => (i === 0 ? B.HK : i === 29 ? B.DOWN : i === 30 ? B.DOWN | B.RIGHT : i === 31 ? B.RIGHT | B.LP : 0);
    const events = run(s, 40, p1);
    expect(of(events, "special")).toMatchObject([{ step: 33 }]);
  });

  it("a normal that isn't cancellable doesn't cancel", () => {
    const s = newMatch(300, 410);
    // st.HP isn't cancellable.
    const p1 = (i: number) => (i === 0 ? B.HP : i === 9 ? B.DOWN : i === 10 ? B.DOWN | B.RIGHT : i === 11 ? B.RIGHT | B.LP : 0);
    const events = run(s, 20, p1);
    expect(of(events, "hit")).toMatchObject([{ name: "st.HP", step: 9 }]);
    expect(of(events, "special")).toHaveLength(0);
  });
});

describe("other move types", () => {
  it("spin-kick (qcb + K) travels forward in the air and hits up to 3 times for 5 each", () => {
    const s = newMatch(300, 460);
    const events = run(s, 80, script(B.DOWN, B.DOWN | B.LEFT, B.LEFT | B.LK));
    expect(of(events, "special")).toMatchObject([{ name: "SPINNER" }]);
    const hits = of(events, "hit");
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits.length).toBeLessThanOrEqual(3);
    for (const h of hits) expect(h).toMatchObject({ player: 0, name: "spin-kick", damage: 5 });
  });

  it("flip-kick (charge down, up + K) is an overhead that knocks down", () => {
    const s = newMatch(300, 400, { specials: [{ type: "flip-kick", name: "FLIP" }] });
    const p1 = (i: number) => (i < 45 ? B.DOWN : i === 45 ? B.UP | B.MK : 0);
    // P2 crouch-blocks, which doesn't stop an overhead.
    const events = run(s, 80, p1, B.DOWN | B.RIGHT);
    expect(of(events, "special")).toMatchObject([{ name: "FLIP" }]);
    expect(of(events, "hit")).toMatchObject([{ player: 0, name: "flip-kick", damage: 13 }]);
    expect(of(events, "knockdown")).toMatchObject([{ player: 1 }]);
  });

  it("rapid-hits (tap P 5 times) hits every 6 frames for 3, and chips when blocked", () => {
    const s = newMatch(300, 400, { specials: [{ type: "rapid-hits", name: "FLURRY" }] });
    const taps = (i: number) => (i % 2 === 0 && i < 10 ? B.LP : 0);
    const events = run(s, 60, taps, B.RIGHT);
    const special = of(events, "special");
    expect(special).toMatchObject([{ name: "FLURRY" }]);
    const blocks = of(events, "block").filter((e) => e.name === "rapid-hits");
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    for (let k = 1; k < blocks.length; k++) expect(blocks[k].step - blocks[k - 1].step).toBeGreaterThanOrEqual(6);
  });

  it("command-throw (360 + P) grabs within a gap of 30 for 22 damage", () => {
    const s = newMatch(400, 500, { specials: [{ type: "command-throw", name: "BEAR HUG" }] });
    const spin = script(B.RIGHT, B.DOWN | B.RIGHT, B.DOWN, B.DOWN | B.LEFT, B.LEFT, B.UP | B.LEFT, B.UP | B.LP);
    const events = run(s, 7, spin);
    expect(of(events, "special")).toMatchObject([{ name: "BEAR HUG" }]);
    expect(of(events, "throw")).toMatchObject([{ player: 0, damage: 22 }]);
    expect(s.fighters[1].health).toBe(78);
  });

  it("command-throw doesn't grab from further away (a normal comes out instead)", () => {
    const s = newMatch(400, 560, { specials: [{ type: "command-throw", name: "BEAR HUG" }] });
    const spin = script(B.RIGHT, B.DOWN | B.RIGHT, B.DOWN, B.DOWN | B.LEFT, B.LEFT, B.UP | B.LEFT, B.UP | B.LP);
    const events = run(s, 7, spin);
    expect(of(events, "throw")).toHaveLength(0);
    expect(of(events, "special")).toHaveLength(0);
  });

  it("damageBonus adds to the damage", () => {
    const s = newMatch(300, 660, { specials: [{ type: "fireball", name: "BIG", damageBonus: 3 }] });
    const events = run(s, 140, p1Fireball());
    expect(of(events, "hit")).toMatchObject([{ damage: 13 }]);
  });
});

describe("forgiving", () => {
  /** P1 idle, with qcf + LP just entered (the last frame goes straight into the input history, not through a step). */
  function qcfJustEntered(specials: unknown[], known: string[]): MatchState {
    const s = newMatch(300, 660, { specials, known });
    run(s, 2, script(P1_QCF[0], P1_QCF[1]));
    s.fighters[0].history.push(P1_QCF[2] | B.LP, 1);
    return s;
  }

  it("trySpecial starts a known special from this exact setup (so the tests below can fail)", () => {
    const s = qcfJustEntered([{ type: "fireball", name: "BLAST" }], KNOWN_MOVE_TYPES);
    expect(trySpecial(s, 0)).toMatchObject([{ type: "special", name: "BLAST" }]);
  });

  for (const type of ["laser", "constructor", "toString"]) {
    it(`trySpecial ignores a special whose type isn't a move type ("${type}")`, () => {
      const s = qcfJustEntered([{ type, name: "ZAP" }], [...KNOWN_MOVE_TYPES, type]);
      expect(s.fighters[0].fighter.specials).toMatchObject([{ type }]);
      expect(s.fighters[0].attack).toBeNull();
      expect(trySpecial(s, 0)).toBeNull();
    });
  }

  describe("a move type with a typo", () => {
    let warn: ReturnType<typeof vi.spyOn>;
    const added: string[] = [];
    function addType(type: string, over: Partial<MoveTypeDef>): void {
      MOVE_TYPES[type] = { ...MOVE_TYPES.fireball, type, ...over };
      added.push(type);
    }
    beforeEach(() => {
      warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => {
      for (const type of added.splice(0)) delete MOVE_TYPES[type];
      warn.mockRestore();
    });

    it("an unknown motion turns the move off, with one message suggesting the closest motion", () => {
      addType("typo-motion", { motion: "qcff" });
      const s = newMatch(300, 660, { specials: [{ type: "typo-motion", name: "OOPS" }], known: ["typo-motion"] });
      const events = run(s, 60, p1Fireball());
      events.push(...run(s, 3, p1Fireball(), 0, 0));
      expect(of(events, "special")).toHaveLength(0);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(/typo-motion.*"qcff".*Did you mean "qcf"/);
    });

    it("an unknown button acts as P, with one message", () => {
      addType("typo-button", { button: "Punch" });
      const s = newMatch(300, 660, { specials: [{ type: "typo-button", name: "STILL WORKS" }], known: ["typo-button"] });
      const events = run(s, 60, p1Fireball());
      expect(of(events, "special")).toMatchObject([{ name: "STILL WORKS" }]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(/typo-button.*button should be "P" or "K".*"Punch".*Using "P"/);
    });
  });
});
