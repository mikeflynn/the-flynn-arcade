import { describe, expect, it } from "vitest";
import { normalizeFighter } from "../../src/fighter";
import { B, type InputFrame } from "../../src/engine/input";
import { createMatch, matchWinner, stepMatch } from "../../src/engine/match";
import type { FState, MatchEvent, MatchState } from "../../src/engine/types";
import { mySettings, type Settings } from "../../src/settings";

function fighter() {
  return normalizeFighter({ name: "T", look: { height: 1 }, stats: { power: 5 } }, "t", [], () => {})!;
}

/** A match past the intro, with P1 at x1 and P2 at x2 (P1 on the left, facing right). */
function newMatch(x1 = 400, x2 = 480, settings: Partial<Settings> = {}): MatchState {
  const s = createMatch({ p1: fighter(), p2: fighter(), settings: { ...mySettings, ...settings }, seed: 1 });
  for (let i = 0; i < 90; i++) stepMatch(s, [0, 0]);
  s.fighters[0].x = x1;
  s.fighters[1].x = x2;
  return s;
}

type Tagged = MatchEvent & { step: number };

/** Runs n steps and returns every event, tagged with the step it happened on. */
function run(s: MatchState, n: number, p1: InputFrame = 0, p2: InputFrame = 0): Tagged[] {
  const out: Tagged[] = [];
  for (let i = 0; i < n; i++) for (const e of stepMatch(s, [p1, p2])) out.push({ ...e, step: i });
  return out;
}

/** Steps until the next hit event (at most 60 steps) and returns the events of the steps it took. */
function untilHit(s: MatchState, p1: InputFrame = 0, p2: InputFrame = 0): Tagged[] {
  const out: Tagged[] = [];
  for (let i = 0; i < 60 && !out.some((e) => e.type === "hit"); i++) out.push(...run(s, 1, i === 0 ? p1 : 0, p2));
  expect(out.some((e) => e.type === "hit")).toBe(true);
  return out;
}

const of = (events: MatchEvent[], type: MatchEvent["type"]) => events.filter((e) => e.type === type);

// P1 faces right, so forward is RIGHT and back is LEFT. P2 faces left: back is RIGHT.
const FWD = B.RIGHT;
const BACK = B.LEFT;
const P2_BACK = B.RIGHT;

describe("throws", () => {
  it("forward + Heavy Punch at 60 px throws: 14 damage and a knockdown", () => {
    const s = newMatch(400, 460);
    const events = run(s, 1, FWD | B.HP);
    expect(of(events, "throw")).toMatchObject([{ player: 0, damage: 14 }]);
    expect(of(events, "knockdown")).toMatchObject([{ player: 1 }]);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 14);
    expect(s.fighters[1].state).toBe("knockdown");
    expect(s.fighters[0].state).toBe("throwing");
    expect(of(events, "hit")).toHaveLength(0);
  });

  it("Medium Punch throws too", () => {
    const s = newMatch(400, 460);
    expect(of(run(s, 1, BACK | B.MP), "throw")).toHaveLength(1);
  });

  it("the same press at 100 px is a normal attack instead", () => {
    const s = newMatch(400, 500);
    const events = run(s, 1, FWD | B.HP);
    expect(of(events, "throw")).toHaveLength(0);
    expect(s.fighters[0].state).toBe("attack");
    expect(s.fighters[0].attack?.data.id).toBe("st.HP");
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth);
  });

  it("a punch with no direction, or a light punch, is not a throw", () => {
    const s = newMatch(400, 460);
    expect(of(run(s, 1, B.HP), "throw")).toHaveLength(0);
    const t = newMatch(400, 460);
    expect(of(run(t, 1, FWD | B.LP), "throw")).toHaveLength(0);
  });

  it("throwing toward the back switches sides", () => {
    const s = newMatch(400, 460);
    run(s, 1, BACK | B.HP);
    expect(s.fighters[1].x).toBeLessThan(s.fighters[0].x);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 14);
    run(s, 80);
    expect(s.fighters[0].facing).toBe(-1);
    expect(s.fighters[1].facing).toBe(1);
  });

  it("a forward throw keeps sides", () => {
    const s = newMatch(400, 460);
    run(s, 1, FWD | B.HP);
    expect(s.fighters[1].x).toBeGreaterThan(s.fighters[0].x);
  });

  it.each<FState>(["hitstun", "blockstun", "jumpSquat", "knockdown", "getup"])("can't throw a defender in %s", (state) => {
    const s = newMatch(400, 460);
    s.fighters[1].state = state;
    s.fighters[1].stateLength = 30;
    const events = run(s, 1, FWD | B.HP);
    expect(of(events, "throw")).toHaveLength(0);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth);
  });

  it("can't throw a jumping defender, and can't throw while jumping", () => {
    const s = newMatch(400, 460);
    run(s, 8, 0, B.UP); // P2 is airborne by now
    expect(s.fighters[1].airborne).toBe(true);
    expect(of(run(s, 1, FWD | B.HP), "throw")).toHaveLength(0);
    const t = newMatch(400, 460);
    run(t, 8, B.UP);
    expect(of(run(t, 1, FWD | B.HP), "throw")).toHaveLength(0);
  });

  it("the thrown fighter can't be hit while down or getting up (60 frames), then can be", () => {
    const s = newMatch(400, 460);
    run(s, 1, FWD | B.HP);
    run(s, 24); // the thrower is free again
    const healthDown = s.fighters[1].health;
    const events = run(s, 20, B.LP); // LP comes out and swings while P2 is still down
    expect(of(events, "hit")).toHaveLength(0);
    expect(s.fighters[1].health).toBe(healthDown);
    expect(["knockdown", "getup"]).toContain(s.fighters[1].state);
    run(s, 20); // past frame 60: P2 is back on their feet
    expect(s.fighters[1].state).toBe("idle");
    expect(of(run(s, 8, B.LP), "hit")).toHaveLength(1);
  });
});

describe("throw tech", () => {
  const withTech = { throwTechEnabled: true };

  it("back + Medium Punch 3 frames after the grab breaks it: no damage, pushed apart", () => {
    const s = newMatch(400, 460, withTech);
    const events = run(s, 1, FWD | B.HP);
    expect(of(events, "throw")).toHaveLength(1);
    expect(s.fighters[1].state).toBe("thrown");
    run(s, 2);
    const after = run(s, 1, 0, P2_BACK | B.MP);
    expect(of(after, "throwTech")).toHaveLength(1);
    const later = run(s, 40);
    expect(of(later, "knockdown")).toHaveLength(0);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth);
    expect(s.fighters[1].state).toBe("idle");
    expect(s.fighters[0].state).toBe("idle");
    expect(s.fighters[1].x - s.fighters[0].x).toBeGreaterThan(80);
  });

  it("with nobody breaking it, the throw lands after 6 frames", () => {
    const s = newMatch(400, 460, withTech);
    run(s, 1, FWD | B.HP);
    run(s, 5);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth);
    const events = run(s, 2);
    expect(of(events, "knockdown")).toHaveLength(1);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 14);
    expect(s.fighters[1].state).toBe("knockdown");
  });

  it("a punch with no direction is too late or not a break", () => {
    const s = newMatch(400, 460, withTech);
    run(s, 1, FWD | B.HP);
    run(s, 2);
    run(s, 1, 0, B.MP);
    run(s, 10);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 14);
  });

  it("a break after the 6 frames is too late", () => {
    const s = newMatch(400, 460, withTech);
    run(s, 1, FWD | B.HP);
    run(s, 8);
    run(s, 1, 0, P2_BACK | B.MP);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 14);
  });

  it("without throwTechEnabled the break does nothing", () => {
    const s = newMatch(400, 460);
    run(s, 1, FWD | B.HP);
    run(s, 2);
    run(s, 1, 0, P2_BACK | B.MP);
    expect(s.fighters[1].health).toBe(s.fighters[1].maxHealth - 14);
  });
});

describe("knockdowns", () => {
  it("crouching Heavy Kick knocks down: 40 frames on the floor, then a 20-frame getup", () => {
    const s = newMatch(400, 520);
    const events = untilHit(s, B.DOWN | B.HK);
    expect(of(events, "knockdown")).toMatchObject([{ player: 1 }]);
    expect(s.fighters[1].state).toBe("knockdown");
    const states: string[] = ["knockdown"]; // the step of the hit itself
    for (let i = 0; i < 100; i++) {
      stepMatch(s, [0, 0]);
      states.push(s.fighters[1].state);
    }
    // 12 frozen frames of hitstop, then 40 down and 20 getting up.
    expect(states.filter((x) => x === "knockdown")).toHaveLength(12 + 40);
    expect(states.filter((x) => x === "getup")).toHaveLength(20);
    expect(states[states.length - 1]).toBe("idle");
  });

  it("a knocked-down fighter can't be hit by any attack", () => {
    const s = newMatch(400, 520);
    untilHit(s, B.DOWN | B.HK);
    const health = s.fighters[1].health;
    for (let i = 0; i < 100; i++) {
      // Keep poking while they are down. A poke that lands while they are down or getting up must do nothing.
      stepMatch(s, [i % 20 === 0 ? B.LP : 0, 0]);
      if (s.fighters[1].state === "knockdown" || s.fighters[1].state === "getup") expect(s.fighters[1].health).toBe(health);
    }
    expect(s.fighters[1].health).toBeLessThan(health); // once they were up again, a poke landed
  });
});

describe("dizzy", () => {
  /** Hits P2 with Heavy Punch n times, 50 frames apart (long enough to recover, short enough that the dizzy meter never decays). */
  function hammer(s: MatchState, n: number): MatchEvent[] {
    const events: MatchEvent[] = [];
    for (let i = 0; i < n; i++) {
      s.fighters[0].x = 300;
      s.fighters[1].x = 420;
      events.push(...run(s, 1, B.HP), ...run(s, 49));
    }
    return events;
  }

  function sturdy(settings: Partial<Settings> = {}): MatchState {
    const s = newMatch(300, 420, settings);
    s.fighters[1].health = s.fighters[1].maxHealth = 1000;
    return s;
  }

  it("heavy hits add 14 to the meter; the 8th makes them dizzy for 180 frames", () => {
    const s = sturdy();
    expect(of(hammer(s, 7), "hit")).toHaveLength(7);
    expect(s.fighters[1].stun).toBe(98);
    expect(s.fighters[1].state).not.toBe("dizzy");
    const events = hammer(s, 1);
    expect(of(events, "dizzy")).toMatchObject([{ player: 1 }]);
    expect(s.fighters[1].state).toBe("dizzy");
    expect(s.fighters[1].stun).toBe(0);
  });

  it("dizzy lasts 180 frames", () => {
    const s = sturdy();
    s.fighters[1].stun = 90;
    s.fighters[1].stunDecayDelay = 60;
    untilHit(s, B.HP);
    let n = 0;
    expect(s.fighters[1].state).toBe("dizzy");
    while (s.fighters[1].state === "dizzy" && n < 400) {
      stepMatch(s, [0, 0]);
      n++;
    }
    expect(n).toBe(12 + 180); // 12 frozen frames of hitstop first, then the dizzy time
  });

  it("mashing buttons shakes them out sooner (4 frames per press)", () => {
    const calm = sturdy();
    const mash = sturdy();
    for (const s of [calm, mash]) {
      s.fighters[1].stun = 90;
      s.fighters[1].stunDecayDelay = 60;
      untilHit(s, B.HP);
      expect(s.fighters[1].state).toBe("dizzy");
    }
    const count = (s: MatchState, mashing: boolean) => {
      let n = 0;
      while (s.fighters[1].state === "dizzy" && n < 400) {
        stepMatch(s, [0, mashing && n % 2 === 0 ? B.LP : 0]);
        n++;
      }
      return n;
    };
    const calmFrames = count(calm, false);
    const mashFrames = count(mash, true);
    expect(mashFrames).toBeLessThan(calmFrames - 40);
  });

  it("with dizzyEnabled false they never get dizzy", () => {
    const s = sturdy({ dizzyEnabled: false });
    expect(of(hammer(s, 12), "dizzy")).toHaveLength(0);
    expect(s.fighters[1].state).not.toBe("dizzy");
  });

  it("the meter waits 60 frames after a hit, then drains 1 per frame", () => {
    const s = sturdy();
    untilHit(s, B.HP);
    run(s, 72); // 12 frames of hitstop, then 60 of waiting
    expect(s.fighters[1].stun).toBe(14);
    run(s, 10);
    expect(s.fighters[1].stun).toBe(4);
    run(s, 10);
    expect(s.fighters[1].stun).toBe(0);
  });

  it("a hit that KOs beats a hit that would make them dizzy", () => {
    const s = sturdy();
    s.fighters[1].stun = 95;
    s.fighters[1].stunDecayDelay = 60;
    s.fighters[1].health = 5;
    const events = run(s, 10, B.HP);
    expect(of(events, "dizzy")).toHaveLength(0);
    expect(of(events, "ko")).toHaveLength(1);
    expect(s.fighters[1].state).toBe("ko");
  });
});

/** P1 lands a Light Punch on a P2 who has 4 health left. Stops on the step of the KO and returns the events so far. */
function knockOut(s: MatchState): Tagged[] {
  s.fighters[0].x = 400;
  s.fighters[1].x = 480;
  s.fighters[1].health = 4;
  const out: Tagged[] = [];
  for (let i = 0; i < 30 && s.phase === "fight"; i++) out.push(...run(s, 1, i === 0 ? B.LP : 0));
  expect(s.phase).toBe("ko");
  expect(s.phaseFrame).toBe(0);
  return out;
}

describe("KO and rounds", () => {
  it("a KO fires an event, starts the ko phase, and P2 goes to ko", () => {
    const s = newMatch();
    const events = knockOut(s);
    expect(of(events, "ko")).toMatchObject([{ player: 1 }]);
    expect(s.phase).toBe("ko");
    expect(s.fighters[1].state).toBe("ko");
    expect(s.fighters[1].health).toBe(0);
    expect(s.roundWinner).toBe(0);
  });

  it("the winner celebrates at frame 40, the ko phase lasts 120, roundOver 60, then round 2", () => {
    const s = newMatch();
    knockOut(s);
    run(s, 39);
    expect(s.fighters[0].state).not.toBe("win");
    run(s, 1);
    expect(s.fighters[0].state).toBe("win");
    run(s, 79);
    expect(s.phase).toBe("ko");
    expect(of(run(s, 1), "roundOver")).toHaveLength(1);
    expect(s.phase).toBe("roundOver");
    run(s, 59);
    expect(s.phase).toBe("roundOver");
    run(s, 1);
    expect(s.phase).toBe("intro");
    expect(s.round).toBe(2);
  });

  it("after 180 frames round 2 starts: wins [1, 0], health refilled, positions and timer reset", () => {
    const s = newMatch();
    knockOut(s);
    run(s, 180);
    expect(s.round).toBe(2);
    expect(s.fighters.map((f) => f.roundWins)).toEqual([1, 0]);
    expect(s.phase).toBe("intro");
    expect(s.phaseFrame).toBe(0);
    for (const f of s.fighters) {
      expect(f.health).toBe(f.maxHealth);
      expect(f.state).toBe("idle");
      expect(f.stun).toBe(0);
      expect(f.attack).toBeNull();
    }
    expect([s.fighters[0].x, s.fighters[1].x]).toEqual([300, 660]);
    expect([s.fighters[0].facing, s.fighters[1].facing]).toEqual([1, -1]);
    expect(s.timerFrames).toBe(mySettings.roundTime * 60);
    expect(s.roundWinner).toBeNull();
    // ...and the round plays.
    run(s, 90);
    expect(s.phase).toBe("fight");
  });

  it("inputs are ignored once the round is over", () => {
    const s = newMatch();
    knockOut(s);
    const x = s.fighters[0].x;
    run(s, 30, FWD);
    expect(s.fighters[0].x).toBe(x);
  });

  it("a KO on the knockdown finisher still goes straight to ko", () => {
    const s = newMatch(400, 520);
    s.fighters[1].health = 3;
    const events = run(s, 12, B.DOWN | B.HK);
    expect(of(events, "ko")).toHaveLength(1);
    expect(s.fighters[1].state).toBe("ko");
  });

  it("both fighters hit on the same frame with 4 health: both ko, a draw event, both get a win", () => {
    const s = newMatch(400, 480);
    s.fighters[0].health = 4;
    s.fighters[1].health = 4;
    const events = run(s, 10, B.LP, B.LP);
    expect(of(events, "ko")).toHaveLength(2);
    expect(of(events, "draw")).toHaveLength(1);
    expect(s.fighters.map((f) => f.roundWins)).toEqual([1, 1]);
    expect(s.roundWinner).toBeNull();
  });
});

describe("the timer", () => {
  it("counts down during the fight only", () => {
    const s = createMatch({ p1: fighter(), p2: fighter(), settings: mySettings, seed: 1 });
    for (let i = 0; i < 90; i++) stepMatch(s, [0, 0]);
    expect(s.timerFrames).toBe(99 * 60);
    run(s, 10);
    expect(s.timerFrames).toBe(99 * 60 - 10);
  });

  it("at 0 with equal health: timeOver, a draw, and both get a round win", () => {
    const s = newMatch(300, 660, { roundTime: 30 });
    expect(s.timerFrames).toBe(30 * 60);
    const events = run(s, 30 * 60 - 1);
    expect(of(events, "timeOver")).toHaveLength(0);
    const last = run(s, 1);
    expect(of(last, "timeOver")).toHaveLength(1);
    expect(of(last, "draw")).toHaveLength(1);
    expect(s.fighters.map((f) => f.roundWins)).toEqual([1, 1]);
    expect(s.phase).toBe("ko");
    expect(s.roundWinner).toBeNull();
    run(s, 180);
    expect(s.round).toBe(2);
  });

  it("at 0 the fighter with more health wins the round", () => {
    const s = newMatch(300, 660, { roundTime: 30 });
    s.fighters[1].health -= 10;
    const events = run(s, 30 * 60);
    expect(of(events, "timeOver")).toHaveLength(1);
    expect(of(events, "draw")).toHaveLength(0);
    expect(s.fighters.map((f) => f.roundWins)).toEqual([1, 0]);
    expect(s.roundWinner).toBe(0);
    run(s, 40);
    expect(s.fighters[0].state).toBe("win");
    expect(s.fighters[1].state).not.toBe("win");
  });
});

describe("the match", () => {
  it("has no winner until it is over", () => {
    const s = newMatch();
    expect(matchWinner(s)).toBeNull();
    knockOut(s);
    expect(matchWinner(s)).toBeNull();
  });

  it("two rounds won by P1 end the match", () => {
    const s = newMatch();
    const all: MatchEvent[] = [];
    for (let round = 1; round <= 2; round++) {
      if (s.phase === "intro") run(s, 90);
      all.push(...knockOut(s));
      all.push(...run(s, 180));
    }
    expect(s.phase).toBe("matchOver");
    expect(s.round).toBe(2);
    expect(matchWinner(s)).toBe(0);
    expect(of(all, "matchOver")).toMatchObject([{ player: 0 }]);
    expect(of(run(s, 300, FWD), "matchOver")).toHaveLength(0);
    expect(s.phase).toBe("matchOver");
  });

  it("P2 can win the match", () => {
    const s = newMatch(400, 480, { roundsToWin: 1 });
    s.fighters[0].health = 4;
    run(s, 10, 0, B.LP);
    run(s, 180);
    expect(s.phase).toBe("matchOver");
    expect(matchWinner(s)).toBe(1);
  });

  it("both reaching roundsToWin in the same round is a draw game", () => {
    const s = newMatch(400, 480, { roundsToWin: 1 });
    s.fighters[0].health = 4;
    s.fighters[1].health = 4;
    run(s, 10, B.LP, B.LP);
    run(s, 180);
    expect(s.phase).toBe("matchOver");
    expect(matchWinner(s)).toBe("draw");
  });
});

describe("airborne timing", () => {
  /** P2 jumps straight up; P1 pokes with crouching Heavy Punch so it connects on the way up or down. Returns the step of the hit. */
  function juggle(s: MatchState, start: number): number {
    let hit = -1;
    for (let i = 0; i < 120 && hit < 0; i++) {
      const events = stepMatch(s, [i === start ? B.DOWN | B.HP : 0, i === 0 ? B.UP : 0]);
      if (of(events, "hit").length) hit = i;
    }
    expect(hit).toBeGreaterThan(0);
    return hit;
  }

  it("air hitstun lasts its real length (22 frames after the 12-frame hitstop), not half", () => {
    const s = newMatch(400, 520);
    juggle(s, 0);
    expect(s.fighters[1].airborne).toBe(true);
    run(s, 12 + 21); // hitstop, then 21 of the 22 hitstun frames
    expect(s.fighters[1].state).toBe("hitstun");
    run(s, 1);
    expect(s.fighters[1].state).toBe("jump");
    expect(s.fighters[1].airborne).toBe(true);
  });

  it("landing during hitstun keeps the hitstun", () => {
    const s = newMatch(400, 520);
    juggle(s, 30);
    let guard = 0;
    while (s.fighters[1].airborne && guard++ < 100) run(s, 1);
    expect(s.fighters[1].airborne).toBe(false);
    expect(s.fighters[1].y).toBe(0);
    expect(s.fighters[1].state).toBe("hitstun");
    run(s, 30);
    expect(s.fighters[1].state).toBe("idle");
  });

  it("after being hit in the air you can't attack again before landing", () => {
    const s = newMatch(400, 520);
    juggle(s, 0);
    run(s, 12 + 22 + 1); // hitstun is over but they are still in the air
    expect(s.fighters[1].state).toBe("jump");
    expect(s.fighters[1].airborne).toBe(true);
    const events = run(s, 1, 0, B.LP);
    expect(s.fighters[1].state).toBe("jump");
    expect(s.fighters[1].attack).toBeNull();
    expect(of(events, "whiff")).toHaveLength(0);
  });

  it("a jumper who wasn't hit can still attack in the air", () => {
    const s = newMatch(400, 520);
    run(s, 12, 0, B.UP);
    run(s, 1, 0, B.LP);
    expect(s.fighters[1].state).toBe("attack");
  });

  it("after landing they can attack again", () => {
    const s = newMatch(400, 520);
    juggle(s, 12);
    run(s, 120);
    expect(s.fighters[1].airborne).toBe(false);
    run(s, 1, 0, B.LP);
    expect(s.fighters[1].state).toBe("attack");
  });
});
