// The match: a frame-counted simulation. stepMatch runs one frame as a
// sequence of phases, so later features (combat, throws, rounds, specials)
// slot in as extra steps without changing the shape.

import type { Fighter } from "../fighter";
import type { InputFrame } from "./input";
import { InputHistory } from "./input";
import { pushApart, updateFacing, updateMovement } from "./movement";
import { Rng } from "./rng";
import type { FightSettings, FighterState, MatchEvent, MatchState } from "./types";

const INTRO_FRAMES = 90;
const INTRO_FIGHT_CALL_FRAME = 60;
const FRAMES_PER_SECOND = 60;

function createFighterState(fighter: Fighter, x: number, facing: 1 | -1): FighterState {
  return {
    fighter,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    facing,
    health: fighter.stats.health,
    maxHealth: fighter.stats.health,
    state: "idle",
    stateFrame: 0,
    attack: null,
    hitstop: 0,
    stun: 0,
    stunDecayDelay: 0,
    comboHits: 0,
    projectileOut: false,
    history: new InputHistory(),
    roundWins: 0,
    crouching: false,
    airborne: false,
    jumpDir: 0,
  };
}

export function createMatch(cfg: { p1: Fighter; p2: Fighter; settings: FightSettings; seed: number }): MatchState {
  return {
    frame: 0,
    phase: "intro",
    phaseFrame: 0,
    round: 1,
    timerFrames: cfg.settings.roundTime * FRAMES_PER_SECOND,
    fighters: [createFighterState(cfg.p1, 300, 1), createFighterState(cfg.p2, 660, -1)],
    projectiles: [],
    rng: new Rng(cfg.seed),
    settings: cfg.settings,
    stage: { left: 60, right: 900, ground: 488 },
  };
}

function stepIntro(s: MatchState, events: MatchEvent[]): void {
  if (s.phaseFrame === 0) events.push({ type: "round" });
  if (s.phaseFrame === INTRO_FIGHT_CALL_FRAME) events.push({ type: "fight" });
  // Nobody can move yet, but the input history keeps ticking with empty frames.
  for (const f of s.fighters) f.history.push(0, f.facing);
  s.phaseFrame++;
  if (s.phaseFrame >= INTRO_FRAMES) {
    s.phase = "fight";
    s.phaseFrame = 0;
  }
}

function stepFight(s: MatchState, inputs: [InputFrame, InputFrame]): void {
  const [p1, p2] = s.fighters;
  p1.history.push(inputs[0], p1.facing);
  p2.history.push(inputs[1], p2.facing);
  updateMovement(p1, s.stage);
  updateMovement(p2, s.stage);
  pushApart(p1, p2, s.stage);
  updateFacing(p1, p2);
  updateFacing(p2, p1);
  s.phaseFrame++;
}

/** Runs one frame. Returns the things that happened, for sounds and effects. */
export function stepMatch(s: MatchState, inputs: [InputFrame, InputFrame]): MatchEvent[] {
  const events: MatchEvent[] = [];
  switch (s.phase) {
    case "intro":
      stepIntro(s, events);
      break;
    case "fight":
      stepFight(s, inputs);
      break;
    default:
      break; // ko / roundOver / matchOver arrive with the round logic
  }
  s.frame++;
  return events;
}
