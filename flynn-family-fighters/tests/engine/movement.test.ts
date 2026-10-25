import { describe, expect, it } from "vitest";
import { normalizeFighter, type Fighter } from "../../src/fighter";
import { B, type InputFrame } from "../../src/engine/input";
import { createMatch, stepMatch } from "../../src/engine/match";
import { pushWidth } from "../../src/engine/movement";
import { Rng } from "../../src/engine/rng";
import type { MatchState } from "../../src/engine/types";
import { mySettings } from "../../src/settings";

function fighter(over: { speed?: number; jump?: number; height?: number } = {}): Fighter {
  return normalizeFighter(
    { name: "T", look: { height: over.height ?? 1 }, stats: { speed: over.speed ?? 5, jump: over.jump ?? 5 } },
    "t", [], () => {},
  )!;
}

function newMatch(a: Parameters<typeof fighter>[0] = {}, b: Parameters<typeof fighter>[0] = {}, seed = 1): MatchState {
  const s = createMatch({ p1: fighter(a), p2: fighter(b), settings: mySettings, seed });
  for (let i = 0; i < 90; i++) stepMatch(s, [0, 0]); // skip the intro
  return s;
}

function run(s: MatchState, n: number, p1: InputFrame = 0, p2: InputFrame = 0): void {
  for (let i = 0; i < n; i++) stepMatch(s, [p1, p2]);
}

describe("intro", () => {
  it("lasts 90 frames, calls round then fight, and ignores input", () => {
    const s = createMatch({ p1: fighter(), p2: fighter(), settings: mySettings, seed: 1 });
    const types: string[] = [];
    for (let i = 0; i < 90; i++) {
      expect(s.phase).toBe("intro");
      for (const e of stepMatch(s, [B.RIGHT, B.UP])) types.push(`${e.type}@${i}`);
    }
    expect(types).toEqual(["round@0", "fight@60"]);
    expect(s.phase).toBe("fight");
    expect(s.fighters[0].x).toBe(300);
    expect(s.fighters[0].state).toBe("idle");
  });
});

describe("walking", () => {
  it("walks forward at 1.5 + 0.25 * speed", () => {
    const s = newMatch({ speed: 5 });
    run(s, 60, B.RIGHT);
    expect(s.fighters[0].x).toBeCloseTo(300 + 60 * 2.75, 2);
    expect(s.fighters[0].state).toBe("walkF");
  });

  it("walks back at 0.8 of that", () => {
    const s = newMatch({ speed: 5 });
    run(s, 60, B.LEFT);
    expect(s.fighters[0].x).toBeCloseTo(300 - 60 * 2.75 * 0.8, 2);
    expect(s.fighters[0].state).toBe("walkB");
  });

  it("works mirrored for player 2", () => {
    const s = newMatch();
    run(s, 10, 0, B.LEFT);
    expect(s.fighters[1].x).toBeCloseTo(660 - 10 * 2.75, 2);
    expect(s.fighters[1].state).toBe("walkF");
  });

  it("crouches while down is held, without moving", () => {
    const s = newMatch();
    run(s, 5, B.DOWN | B.RIGHT);
    expect(s.fighters[0].state).toBe("crouch");
    expect(s.fighters[0].crouching).toBe(true);
    expect(s.fighters[0].x).toBe(300);
    run(s, 1, 0);
    expect(s.fighters[0].state).toBe("idle");
    expect(s.fighters[0].crouching).toBe(false);
  });

  it("never leaves the stage", () => {
    const s = newMatch();
    s.fighters[0].x = s.stage.left;
    run(s, 30, B.LEFT);
    expect(s.fighters[0].x).toBe(s.stage.left);
  });
});

describe("jumping", () => {
  it("squats for 4 frames, jumps, and lands idle within 60 frames", () => {
    const s = newMatch();
    const seen: string[] = [];
    for (let i = 0; i < 60; i++) {
      stepMatch(s, [i === 0 ? B.UP : 0, 0]);
      seen.push(s.fighters[0].state);
    }
    expect(seen.slice(0, 5)).toEqual(["jumpSquat", "jumpSquat", "jumpSquat", "jumpSquat", "jump"]);
    expect(seen.includes("jump")).toBe(true);
    expect(s.fighters[0].y).toBe(0);
    expect(s.fighters[0].state).toBe("idle");
  });

  it("a back jump goes away and keeps facing", () => {
    const s = newMatch();
    run(s, 1, B.UP | B.LEFT);
    run(s, 60);
    expect(s.fighters[0].x).toBeLessThan(300 - 150);
    expect(s.fighters[0].facing).toBe(1);
  });
});

describe("pushing and passing", () => {
  it("walking into a standing opponent never clips, and nudges them along", () => {
    const s = newMatch();
    const width = pushWidth(s.fighters[0], s.fighters[1]);
    s.fighters[0].x = 660 - width - 20;
    for (let i = 0; i < 40; i++) {
      stepMatch(s, [B.RIGHT, 0]);
      expect(s.fighters[1].x - s.fighters[0].x).toBeGreaterThanOrEqual(width - 0.01);
    }
    expect(s.fighters[1].x).toBeGreaterThan(660);
  });

  it("at a wall the other fighter is the one who moves", () => {
    const s = newMatch();
    s.fighters[1].x = s.stage.right;
    s.fighters[0].x = s.stage.right - 200;
    run(s, 60, B.RIGHT);
    expect(s.fighters[1].x).toBe(s.stage.right);
    expect(s.fighters[1].x - s.fighters[0].x).toBeGreaterThanOrEqual(pushWidth(s.fighters[0], s.fighters[1]) - 0.01);
  });

  it("jumping over the opponent flips both facings", () => {
    const s = newMatch();
    s.fighters[0].x = 400;
    s.fighters[1].x = 560;
    run(s, 1, B.UP | B.RIGHT);
    run(s, 80);
    expect(s.fighters[0].x).toBeGreaterThan(s.fighters[1].x);
    expect(s.fighters[0].facing).toBe(-1);
    expect(s.fighters[1].facing).toBe(1);
  });

  for (const side of ["left", "right"] as const) {
    for (let jump = 1; jump <= 10; jump++) {
      it(`escapes the ${side} corner with jump stat ${jump}`, () => {
        const s = newMatch({ jump, height: 1.15 }, { height: 1.15 });
        const w = pushWidth(s.fighters[0], s.fighters[1]);
        const sign = side === "left" ? 1 : -1;
        const wall = side === "left" ? s.stage.left : s.stage.right;
        s.fighters[0].x = wall;
        s.fighters[1].x = wall + sign * w;
        s.fighters[0].facing = sign as 1 | -1;
        s.fighters[1].facing = (-sign) as 1 | -1;
        run(s, 1, B.UP | (side === "left" ? B.RIGHT : B.LEFT));
        run(s, 80);
        const [a, b] = s.fighters;
        expect(sign * (a.x - b.x)).toBeGreaterThan(0);
        expect(a.facing).toBe(-sign);
        expect(b.facing).toBe(sign);
      });
    }
  }
});

describe("determinism", () => {
  it("same seed and inputs give identical state", () => {
    const script = (i: number): [number, number] => [
      [B.RIGHT, B.UP | B.RIGHT, B.DOWN, 0, B.LEFT][Math.floor(i / 7) % 5],
      [B.LEFT, B.UP, B.RIGHT | B.DOWN, B.LEFT, 0][Math.floor(i / 11) % 5],
    ];
    const a = newMatch({}, {}, 42);
    const b = newMatch({}, {}, 42);
    for (let i = 0; i < 300; i++) {
      stepMatch(a, script(i));
      stepMatch(b, script(i));
    }
    expect(a).toEqual(b);
  });

  it("Rng repeats for a seed and int stays in range", () => {
    const r1 = new Rng(7), r2 = new Rng(7);
    for (let i = 0; i < 50; i++) {
      const v = r1.int(3, 5);
      expect(v).toBe(r2.int(3, 5));
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});
