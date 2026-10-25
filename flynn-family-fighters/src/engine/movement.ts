// Walking, crouching, jumping, pushing and turning around.
// Every number here is per frame (the game runs at 60 frames a second).

import { TIMED_STATES, type FighterState, type Stage } from "./types";

const WALK_BASE = 1.5;
const WALK_PER_SPEED = 0.25;
const WALK_BACK_FACTOR = 0.8;
const JUMP_SQUAT_FRAMES = 4;
const JUMP_BASE = 15;
const JUMP_PER_STAT = 0.25;
const GRAVITY = 0.9;
const JUMP_VX = 6.5;
/** A jumper whose feet are higher than this is over the other fighter's waist, so no pushing. */
const PASS_OVER_Y = -110;
const PUSH_PER_HEIGHT = 80;

const TURN_STATES = ["idle", "walkF", "walkB", "crouch", "guard"];
const WALK_STATES = ["idle", "walkF", "walkB", "crouch", "guard"];

/** How close (center to center) two grounded fighters may stand. Taller fighters take more room. */
export function pushWidth(a: FighterState, b: FighterState): number {
  return PUSH_PER_HEIGHT * (a.fighter.look.height + b.fighter.look.height) / 2;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function setState(f: FighterState, state: FighterState["state"]): void {
  if (f.state !== state) {
    f.state = state;
    f.stateFrame = 0;
  } else {
    f.stateFrame++;
  }
}

/** Moves one fighter for one frame, using the newest input already pushed into its history. */
export function updateMovement(f: FighterState, stage: Stage): void {
  if (f.airborne) {
    // Timed states (hitstun and friends) count their own frames in combat.ts; counting here too would run them at double speed.
    if (!TIMED_STATES.includes(f.state)) f.stateFrame++;
    f.x = clamp(f.x + f.vx, stage.left, stage.right);
    f.y += f.vy;
    f.vy += GRAVITY;
    if (f.y >= 0) {
      f.y = 0;
      f.vy = 0;
      f.vx = 0;
      f.airborne = false;
      f.jumpDir = 0;
      f.hitInAir = false;
      // Landing from a jump or a jump attack means standing. Anything else (hitstun, a knockdown, a KO) carries on.
      if (f.state === "jump" || f.state === "attack") {
        f.state = "idle";
        f.stateFrame = 0;
      }
    }
    return;
  }

  if (f.state === "jumpSquat") {
    f.stateFrame++;
    if (f.stateFrame >= JUMP_SQUAT_FRAMES) {
      f.vy = -(JUMP_BASE + JUMP_PER_STAT * f.fighter.stats.jump);
      f.vx = f.jumpDir * f.facing * JUMP_VX;
      f.airborne = true;
      f.crouching = false;
      f.state = "jump";
      f.stateFrame = 0;
    }
    return;
  }

  if (!WALK_STATES.includes(f.state)) return;

  const dir = f.history.dirAgo(0);
  const speed = WALK_BASE + WALK_PER_SPEED * f.fighter.stats.speed;

  if (dir === 7 || dir === 8 || dir === 9) {
    f.jumpDir = dir === 9 ? 1 : dir === 7 ? -1 : 0;
    f.crouching = false;
    f.state = "jumpSquat";
    f.stateFrame = 0;
    return;
  }
  if (dir === 1 || dir === 2 || dir === 3) {
    f.crouching = true;
    setState(f, "crouch");
    return;
  }
  f.crouching = false;
  if (dir === 6) {
    f.x = clamp(f.x + f.facing * speed, stage.left, stage.right);
    setState(f, "walkF");
  } else if (dir === 4) {
    f.x = clamp(f.x - f.facing * speed * WALK_BACK_FACTOR, stage.left, stage.right);
    setState(f, "walkB");
  } else {
    setState(f, "idle");
  }
}

/**
 * Keeps two fighters from standing inside each other. The overlap is split evenly;
 * if one is against a wall, the other one takes the rest. Nobody is pushed while
 * one of them is jumping over the other.
 */
export function pushApart(a: FighterState, b: FighterState, stage: Stage): void {
  if (a.y < PASS_OVER_Y || b.y < PASS_OVER_Y) return;
  const width = pushWidth(a, b);
  const gap = b.x - a.x;
  if (Math.abs(gap) >= width) return;
  const dir = gap !== 0 ? Math.sign(gap) : a.facing; // exactly on top: b is the one in front of a
  const half = (width - Math.abs(gap)) / 2;
  let ax = a.x - dir * half;
  let bx = b.x + dir * half;
  // At a wall, whoever is stuck hands the leftover push to the other fighter.
  if (ax < stage.left || ax > stage.right) {
    const fixed = clamp(ax, stage.left, stage.right);
    bx += fixed - ax;
    ax = fixed;
  }
  if (bx < stage.left || bx > stage.right) {
    const fixed = clamp(bx, stage.left, stage.right);
    ax += fixed - bx;
    bx = fixed;
  }
  a.x = clamp(ax, stage.left, stage.right);
  b.x = clamp(bx, stage.left, stage.right);
}

/** Turns a grounded, free fighter to look at the opponent (this is what flips things after a cross-over). */
export function updateFacing(f: FighterState, other: FighterState): void {
  if (f.airborne || !TURN_STATES.includes(f.state)) return;
  if (other.x > f.x) f.facing = 1;
  else if (other.x < f.x) f.facing = -1;
}
