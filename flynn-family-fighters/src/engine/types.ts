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
  projectile?: { speed: number; color?: string };
  invulnFrames?: number;
  move?: { vx?: number; vy?: number };
}

export interface ActiveAttack {
  data: AttackData;
  frame: number;
  hasHit: boolean;
  special?: SpecialChoice;
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
  timerFrames: number;
  fighters: [FighterState, FighterState];
  projectiles: Projectile[];
  rng: Rng;
  settings: FightSettings;
  stage: Stage;
}

/** For hit, block and whiff, `player` is the attacker (the defender is the other one). */
export type MatchEvent = {
  type:
    | "round" | "fight" | "hit" | "block" | "whiff" | "special" | "projectile" | "throw" | "knockdown"
    | "dizzy" | "ko" | "timeOver" | "roundOver" | "matchOver" | "draw";
  player?: 0 | 1;
  x?: number;
  y?: number;
  name?: string;
  damage?: number;
};
