// The match: a frame-counted simulation. stepMatch runs one frame as a
// sequence of phases, so later features (combat, throws, rounds, specials)
// slot in as extra steps without changing the shape.

import type { Fighter } from "../fighter";
import { afterMovement, resolveHits, runTimers, startAttack, tickHitstop, updateGuard } from "./combat";
import type { InputFrame } from "./input";
import { InputHistory } from "./input";
import { pushApart, updateFacing, updateMovement } from "./movement";
import { Rng } from "./rng";
import { runSpecial, trySpecial, updateProjectiles } from "./specials";
import { tryThrow, updateThrown } from "./throws";
import type { FightSettings, FighterState, MatchEvent, MatchState } from "./types";

const INTRO_FRAMES = 90;
const INTRO_FIGHT_CALL_FRAME = 60;
const FRAMES_PER_SECOND = 60;
/** After a round ends: the winner strikes a pose at WIN_POSE_FRAME, the ko phase lasts KO_FRAMES, then roundOver lasts ROUND_OVER_FRAMES. */
const WIN_POSE_FRAME = 40;
const KO_FRAMES = 120;
const ROUND_OVER_FRAMES = 60;
/** Where each fighter starts every round, and which way they face. */
const START_X = [300, 660] as const;
const START_FACING = [1, -1] as const;

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
    stateLength: 0,
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
    hitInAir: false,
    pendingThrow: null,
  };
}

export function createMatch(cfg: { p1: Fighter; p2: Fighter; settings: FightSettings; seed: number }): MatchState {
  return {
    frame: 0,
    phase: "intro",
    phaseFrame: 0,
    round: 1,
    timerFrames: cfg.settings.roundTime * FRAMES_PER_SECOND,
    roundWinner: null,
    fighters: [createFighterState(cfg.p1, START_X[0], START_FACING[0]), createFighterState(cfg.p2, START_X[1], START_FACING[1])],
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

const PLAYERS = [0, 1] as const;

function stepFight(s: MatchState, inputs: [InputFrame, InputFrame], events: MatchEvent[]): void {
  const [p1, p2] = s.fighters;
  p1.history.push(inputs[0], p1.facing);
  p2.history.push(inputs[1], p2.facing);
  events.push(...updateThrown(s));
  // Hitstop: a fighter frozen this step skips everything below (inputs are still recorded).
  const frozen = [tickHitstop(p1), tickHitstop(p2)];
  // Cancels: a cancellable normal that connected can turn into a special during its hitstop.
  for (const i of PLAYERS) if (frozen[i]) events.push(...(trySpecial(s, i) ?? []));
  // Everyone's timers run before anyone starts something new, so neither player gets a head start.
  const free = PLAYERS.map((i) => !frozen[i] && runTimers(s, i, events));
  for (const i of PLAYERS) {
    if (!free[i]) continue;
    // A special wins over a throw, and a throw over a normal attack, when more than one fits the input.
    const started = trySpecial(s, i) ?? tryThrow(s, i);
    if (started) events.push(...started);
    else startAttack(s, i);
  }
  for (const i of PLAYERS) if (!frozen[i]) runSpecial(s, i, events);
  const guarding = PLAYERS.map((i) => !frozen[i] && updateGuard(s, i));
  for (const i of PLAYERS) {
    if (frozen[i]) continue;
    if (!guarding[i]) updateMovement(s.fighters[i], s.stage);
    afterMovement(s, i, events);
  }
  pushApart(p1, p2, s.stage);
  updateFacing(p1, p2);
  updateFacing(p2, p1);
  events.push(...resolveHits(s));
  events.push(...updateProjectiles(s));
  s.phaseFrame++;
  s.timerFrames = Math.max(0, s.timerFrames - 1);
  checkRoundEnd(s, events);
}

/** A KO (health gone) ends the round, and so does the clock hitting 0. A KO always comes first. */
function checkRoundEnd(s: MatchState, events: MatchEvent[]): void {
  const [p1, p2] = s.fighters;
  let winner: 0 | 1 | null;
  if (p1.health <= 0 || p2.health <= 0) {
    for (const i of PLAYERS) {
      const f = s.fighters[i];
      if (f.health > 0) continue;
      f.attack = null;
      f.hitInAir = false;
      f.state = "ko";
      f.stateFrame = 0;
      events.push({ type: "ko", player: i, x: f.x, y: f.y });
    }
    winner = p1.health > 0 ? 0 : p2.health > 0 ? 1 : null;
  } else if (s.timerFrames <= 0) {
    events.push({ type: "timeOver" });
    winner = p1.health > p2.health ? 0 : p2.health > p1.health ? 1 : null;
  } else {
    return;
  }
  if (winner === null) {
    for (const f of s.fighters) f.roundWins++;
    events.push({ type: "draw" });
  } else {
    s.fighters[winner].roundWins++;
  }
  // Whoever is still standing stops what they were doing (a jumper keeps falling).
  for (const f of s.fighters) {
    if (f.state === "ko") continue;
    f.attack = null;
    f.pendingThrow = null;
    f.state = f.airborne ? "jump" : "idle";
    f.stateFrame = 0;
  }
  s.roundWinner = winner;
  s.phase = "ko";
  s.phaseFrame = 0;
}

/** Keeps the ko and win poses animating, and lets a fighter who was in the air finish landing. */
function stepPoses(s: MatchState): void {
  for (const f of s.fighters) {
    if (tickHitstop(f)) continue;
    if (f.airborne) updateMovement(f, s.stage);
    else if (f.state === "ko" || f.state === "win") f.stateFrame++;
  }
}

function stepKo(s: MatchState, events: MatchEvent[]): void {
  stepPoses(s);
  s.phaseFrame++;
  if (s.phaseFrame === WIN_POSE_FRAME && s.roundWinner !== null) {
    const w = s.fighters[s.roundWinner];
    w.attack = null;
    w.state = "win";
    w.stateFrame = 0;
  }
  if (s.phaseFrame >= KO_FRAMES) {
    s.phase = "roundOver";
    s.phaseFrame = 0;
    events.push({ type: "roundOver", ...(s.roundWinner !== null && { player: s.roundWinner }) });
  }
}

function leader(s: MatchState): 0 | 1 | "draw" {
  const [a, b] = [s.fighters[0].roundWins, s.fighters[1].roundWins];
  return a > b ? 0 : b > a ? 1 : "draw";
}

function stepRoundOver(s: MatchState, events: MatchEvent[]): void {
  stepPoses(s);
  s.phaseFrame++;
  if (s.phaseFrame < ROUND_OVER_FRAMES) return;
  s.phaseFrame = 0;
  if (s.fighters.some((f) => f.roundWins >= s.settings.roundsToWin)) {
    s.phase = "matchOver";
    const winner = leader(s);
    events.push({ type: "matchOver", ...(winner !== "draw" && { player: winner }) });
    return;
  }
  // Next round: everyone back to their corner with full health.
  s.round++;
  s.fighters.forEach((f, i) => {
    Object.assign(f, createFighterState(f.fighter, START_X[i], START_FACING[i]), { roundWins: f.roundWins });
  });
  s.projectiles = [];
  s.timerFrames = s.settings.roundTime * FRAMES_PER_SECOND;
  s.roundWinner = null;
  s.phase = "intro";
}

/** Who won the match: 0 or 1, "draw" if both got to roundsToWin in the same round, or null while it is still going. */
export function matchWinner(s: MatchState): 0 | 1 | "draw" | null {
  return s.phase === "matchOver" ? leader(s) : null;
}

/** Runs one frame. Returns the things that happened, for sounds and effects. */
export function stepMatch(s: MatchState, inputs: [InputFrame, InputFrame]): MatchEvent[] {
  const events: MatchEvent[] = [];
  switch (s.phase) {
    case "intro":
      stepIntro(s, events);
      break;
    case "fight":
      stepFight(s, inputs, events);
      break;
    case "ko":
      stepKo(s, events);
      break;
    case "roundOver":
      stepRoundOver(s, events);
      break;
    case "matchOver":
      stepPoses(s);
      break;
  }
  s.frame++;
  return events;
}
