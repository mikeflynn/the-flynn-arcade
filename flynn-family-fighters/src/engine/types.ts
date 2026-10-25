// The shapes the fight engine passes around. Pure data: no Phaser, no DOM.

import type { Fighter, SpecialChoice } from "../fighter";
import type { Settings } from "../settings";
import type { InputHistory } from "./input";
import type { Rng } from "./rng";

/** A rectangle relative to the fighter's feet. +x is forward, and up is negative y. */
export type Box = { x: number; y: number; w: number; h: number };

export type FState =
  | "idle" | "walkF" | "walkB" | "crouch" | "guard" | "jumpSquat" | "jump" | "attack"
  | "hitstun" | "blockstun" | "knockdown" | "getup" | "dizzy" | "throwing" | "thrown" | "ko" | "win";

/** States that run on a timer (stateFrame counts up to stateLength) rather than on input. */
export const TIMED_STATES: readonly FState[] = ["hitstun", "blockstun", "knockdown", "getup", "dizzy", "throwing", "thrown"];

export interface AttackData {
  id: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  chip: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  dizzy: number;
  hitbox: Box;
  level: "high" | "mid" | "low";
  pushback: number;
  knockdown: boolean;
  cancellable: boolean;
  /** Throws a projectile on the first active frame instead of hitting with the body. */
  projectile?: { speed: number; color?: string };
  /** Can't be hit while the attack's frame is below this. */
  invulnFrames?: number;
  /** During the active frames the fighter moves forward at vx; a vy lifts them off the ground on the first one. */
  move?: { vx?: number; vy?: number };
  /** Multi-hit: the attack can hit again every this many frames while active. */
  rehitEvery?: number;
  /** A grab instead of a hit: works when the gap between the bodies is at most `range`. */
  grab?: { range: number };
}

export interface ActiveAttack {
  data: AttackData;
  frame: number;
  hasHit: boolean;
  special?: SpecialChoice;
  /** The special lifted the fighter off the ground: landing starts its recovery. */
  inAir?: boolean;
}

export interface Projectile {
  owner: 0 | 1;
  x: number;
  y: number;
  vx: number;
  color: string;
  attack: AttackData;
  age: number;
}

export interface FighterState {
  fighter: Fighter;
  /** Feet center in world units. */
  x: number;
  /** Height above the ground. Negative is up, 0 is standing on the floor. */
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  health: number;
  maxHealth: number;
  state: FState;
  stateFrame: number;
  /** How many frames a timed state (hitstun, blockstun) lasts; it ends when stateFrame reaches this. */
  stateLength: number;
  attack: ActiveAttack | null;
  hitstop: number;
  stun: number;
  stunDecayDelay: number;
  comboHits: number;
  projectileOut: boolean;
  history: InputHistory;
  roundWins: number;
  crouching: boolean;
  airborne: boolean;
  /** Which way the current jump goes, relative to facing: 1 forward, -1 back, 0 straight up. */
  jumpDir: -1 | 0 | 1;
  /** Hit while in the air: no more attacking until they land. */
  hitInAir: boolean;
  /** While `thrown` (with throw tech on): who grabbed this fighter and which way, until the throw lands. */
  pendingThrow: { by: 0 | 1; back: boolean; damage: number; dizzy: number } | null;
}

/** The kid settings the engine reads. */
export type FightSettings = Pick<
  Settings,
  "roundTime" | "roundsToWin" | "damageScale" | "chipDamageFraction" | "dizzyEnabled" | "throwTechEnabled" | "motionWindowFrames"
>;

export interface Stage {
  left: number;
  right: number;
  /** Screen y of the floor, for drawing only. */
  ground: number;
}

export interface MatchState {
  frame: number;
  phase: "intro" | "fight" | "ko" | "roundOver" | "matchOver";
  phaseFrame: number;
  round: number;
  /** Frames left on the round clock; it only runs during `fight`. */
  timerFrames: number;
  /** Who won the round that just ended (null while fighting, or if it was a draw). */
  roundWinner: 0 | 1 | null;
  fighters: [FighterState, FighterState];
  projectiles: Projectile[];
  rng: Rng;
  settings: FightSettings;
  stage: Stage;
}

/**
 * For hit, block, whiff and throw, `player` is the attacker (the defender is the other one).
 * For knockdown, dizzy, ko and throwTech it is the fighter it happened to / who broke the throw;
 * for roundOver and matchOver it is the winner (missing for a draw).
 */
export type MatchEvent = {
  type:
    | "round" | "fight" | "hit" | "block" | "whiff" | "special" | "projectile" | "throw" | "knockdown"
    | "dizzy" | "ko" | "timeOver" | "roundOver" | "matchOver" | "draw" | "throwTech";
  player?: 0 | 1;
  x?: number;
  y?: number;
  name?: string;
  damage?: number;
};
