// Special moves: reading the motion + button, starting the move, running its
// frames (lunges, rising moves, multi-hits), and flying projectiles.
// Pure: no Phaser, no randomness. The move numbers live in the kid file src/moves.ts.

import type { SpecialChoice } from "../fighter";
import { MOVE_TYPES, type MoveTypeDef } from "../moves";
import {
  activeEnd, applyContact, canBeHit, canBlock, frames, GUARD_FROM, normalizeAttack, overlapOf, sizedHitbox,
  startupOf, worldHurtbox, type WorldBox,
} from "./combat";
import { B, matchMotion, MOTIONS, type Motion } from "./input";
import { canGrab, grab } from "./throws";
import type { AttackData, FState, FighterState, MatchEvent, MatchState, Projectile } from "./types";

/** Light, Medium, Heavy: the index is the move's strength. */
const PUNCHES = [B.LP, B.MP, B.HP];
const KICKS = [B.LK, B.MK, B.HK];
/** Specials start from the ground, or from the first frames of a jump (so a 360 or a charge-up doesn't jump instead). */
const SPECIAL_FROM: FState[] = [...GUARD_FROM, "jumpSquat"];
/** A special's button still counts if it was pressed up to this many frames ago (so an early press isn't lost). */
const BUTTON_BUFFER_FRAMES = 4;
/** When one input fits two specials, the earlier motion here wins (a dp contains most of a qcf). */
const MOTION_ORDER: Motion[] = ["360", "dp", "qcf", "qcb", "chargeBF", "chargeDU", "mash"];

/** Projectiles start at the front hand (this far in front at height 1) and fly at a fixed chest height. */
const HAND_X = 70;
const PROJECTILE_Y = -120;
const PROJECTILE_SIZE = 56;
const PROJECTILE_SPEED = { min: 1, max: 30 };
const DEFAULT_PROJECTILE_COLOR = "#7fd8ff";
/** A projectile this far past the edge of the stage is gone. */
const OFFSTAGE = 100;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const warned = new Set<string>();
/** Kid code runs every frame, so each problem is reported once. */
function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

function moveType(choice: SpecialChoice): MoveTypeDef | undefined {
  return Object.hasOwn(MOVE_TYPES, choice.type) ? MOVE_TYPES[choice.type] : undefined;
}

/** How many single-letter edits turn a into b (to suggest the motion a typo meant). */
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return row[b.length];
}

type Checked = { motion: Motion | null; button: "P" | "K" };
const checkedTypes = new WeakMap<MoveTypeDef, Checked>();

/**
 * A move type's motion and button, checked once. An unknown motion turns the
 * move off (with a message suggesting the closest one); an unknown button becomes "P".
 */
export function checkMoveType(def: MoveTypeDef, warn: (message: string) => void = warnOnce): Checked {
  const seen = checkedTypes.get(def);
  if (seen) return seen;
  const motion = MOTIONS.find((m) => m === def.motion) ?? null;
  if (!motion) {
    const typed = String(def.motion);
    const closest = [...MOTIONS].sort(
      (a, b) => editDistance(typed.toLowerCase(), a.toLowerCase()) - editDistance(typed.toLowerCase(), b.toLowerCase()),
    )[0];
    warn(
      `🥊 moves.ts ${def.type}: motion ${JSON.stringify(def.motion)} isn't one we know. Did you mean "${closest}"? ` +
        `(Try: ${MOTIONS.join(", ")}.) This move is off until it's fixed.`,
    );
  }
  let button: "P" | "K" = def.button === "K" ? "K" : "P";
  if (def.button !== "P" && def.button !== "K") {
    button = String(def.button).trim().toUpperCase() === "K" ? "K" : "P";
    warn(`🥊 moves.ts ${def.type}: button should be "P" or "K", not ${JSON.stringify(def.button)}. Using "${button}".`);
  }
  const checked = { motion, button };
  checkedTypes.set(def, checked);
  return checked;
}

/** The attack numbers from moves.ts, made safe. A move whose code throws is skipped (with a message) instead of crashing. */
function attackOf(def: MoveTypeDef, strength: 0 | 1 | 2, choice: SpecialChoice): AttackData | null {
  try {
    return normalizeAttack(def.attack(strength, choice), warnOnce);
  } catch (err) {
    warnOnce(`🥊 moves.ts ${def.type}: its attack has a problem (${String(err)}). Skipping the move.`);
    return null;
  }
}

/** A ground normal that connected (hit or blocked) and is cancellable can turn into a special during its hitstop. */
function canCancel(f: FighterState): boolean {
  const a = f.attack;
  return a !== null && !a.special && !f.airborne && a.hasHit && a.data.cancellable && f.hitstop > 0;
}

/**
 * Starts one of the fighter's special moves if its motion and button were just
 * input. Works when the fighter is free, or as a cancel during a cancellable
 * normal's hitstop. Returns the events, or null if no special started (so the
 * press can become a throw or a normal attack).
 */
export function trySpecial(s: MatchState, player: 0 | 1): MatchEvent[] | null {
  const f = s.fighters[player];
  if (!canCancel(f) && (f.attack || f.airborne || !SPECIAL_FROM.includes(f.state))) return null;
  const choices: { choice: SpecialChoice; def: MoveTypeDef; motion: Motion; button: "P" | "K" }[] = [];
  for (const choice of f.fighter.specials) {
    const def = moveType(choice);
    if (!def) continue;
    const { motion, button } = checkMoveType(def);
    if (motion) choices.push({ choice, def, motion, button });
  }
  choices.sort((a, b) => MOTION_ORDER.indexOf(a.motion) - MOTION_ORDER.indexOf(b.motion));

  for (const { choice, def, motion, button } of choices) {
    const buttons = button === "K" ? KICKS : PUNCHES;
    const down = f.history.newestPress(buttons[0] | buttons[1] | buttons[2], BUTTON_BUFFER_FRAMES);
    if (!down || !matchMotion(f.history, motion, s.settings.motionWindowFrames)) continue;
    const strength = ([2, 1, 0] as const).find((n) => (down & buttons[n]) !== 0) ?? 0;
    const data = attackOf(def, strength, choice);
    if (!data) continue;
    if (data.projectile && f.projectileOut) continue; // one projectile at a time
    const special: MatchEvent = { type: "special", player, name: choice.name };
    if (data.grab) {
      if (!canGrab(s, player, data.grab.range)) continue;
      return [special, ...grab(s, player, { back: false, damage: data.damage, dizzy: data.dizzy })];
    }
    f.attack = { data: { ...data, hitbox: sizedHitbox(data.hitbox, f) }, frame: 0, hasHit: false, special: choice };
    f.state = "attack";
    f.stateFrame = 0;
    f.crouching = false;
    return [special];
  }
  return null;
}

/**
 * Runs this frame of fighter i's special move (if they're doing one): throws
 * the projectile, lets a multi-hit hit again, moves a lunge or launches a rising
 * move, then runs the move's own onFrame code.
 */
export function runSpecial(s: MatchState, i: 0 | 1, events: MatchEvent[]): void {
  const f = s.fighters[i];
  const atk = f.attack;
  if (!atk?.special) return;
  const a = atk.data;
  const frame = atk.frame;
  const start = startupOf(a);
  const end = activeEnd(a);
  const active = frame >= start && frame < end;

  const every = frames(a.rehitEvery ?? 0);
  if (every > 0 && active && frame > start && (frame - start) % every === 0) atk.hasHit = false;

  if (a.projectile && frame === start) events.push(spawnProjectile(s, i, a, atk.special));

  if (a.move && active) {
    f.vx = f.facing * (a.move.vx ?? 0);
    if (frame === start && a.move.vy) {
      f.vy = a.move.vy;
      f.airborne = true;
      atk.inAir = true;
    }
    if (!f.airborne) f.x = clamp(f.x + f.vx, s.stage.left, s.stage.right);
  } else if (!f.airborne) {
    f.vx = 0;
  }

  const onFrame = moveType(atk.special)?.onFrame;
  if (onFrame) {
    try {
      onFrame(f, frame);
    } catch (err) {
      warnOnce(`🥊 moves.ts ${atk.special.type}: its onFrame code has a problem (${String(err)}).`);
    }
  }

}

/** Throws fighter i's projectile from their front hand. */
function spawnProjectile(s: MatchState, i: 0 | 1, a: AttackData, choice: SpecialChoice): MatchEvent {
  const f = s.fighters[i];
  const speed = Number(a.projectile?.speed);
  const p: Projectile = {
    owner: i,
    x: f.x + f.facing * HAND_X * f.fighter.look.height,
    y: PROJECTILE_Y,
    vx: f.facing * (Number.isFinite(speed) ? clamp(speed, PROJECTILE_SPEED.min, PROJECTILE_SPEED.max) : PROJECTILE_SPEED.min),
    color: a.projectile?.color ?? DEFAULT_PROJECTILE_COLOR,
    attack: a,
    age: 0,
  };
  s.projectiles.push(p);
  f.projectileOut = true;
  return { type: "projectile", player: i, x: p.x, y: p.y, name: choice.name };
}

/** A projectile's box in the world: PROJECTILE_SIZE square around (x, y). */
function projectileBox(p: Projectile): WorldBox {
  const half = PROJECTILE_SIZE / 2;
  return { x0: p.x - half, x1: p.x + half, y0: p.y - half, y1: p.y + half };
}

/**
 * Moves every projectile one frame (a new one waits a frame first), then: two
 * that touch destroy each other; one that touches the other fighter's hurtbox
 * hits or is blocked (with chip); one that flies off the stage is gone.
 */
export function updateProjectiles(s: MatchState): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (const p of s.projectiles) {
    if (p.age > 0) p.x += p.vx;
    p.age++;
  }
  const gone = new Set<Projectile>();
  for (const a of s.projectiles) {
    for (const b of s.projectiles) {
      if (a.owner < b.owner && overlapOf(projectileBox(a), projectileBox(b))) {
        gone.add(a);
        gone.add(b);
      }
    }
  }
  for (const p of s.projectiles) {
    if (gone.has(p)) continue;
    const def = s.fighters[1 - p.owner];
    const box = projectileBox(p);
    const body = worldHurtbox(def);
    if (canBeHit(def) && overlapOf(box, body)) {
      const x = (Math.max(box.x0, body.x0) + Math.min(box.x1, body.x1)) / 2;
      const y = (Math.max(box.y0, body.y0) + Math.min(box.y1, body.y1)) / 2;
      events.push(...applyContact(s, p.owner, p.attack, true, canBlock(def, p.attack.level), x, y));
      def.hitstop = Math.max(def.hitstop, frames(p.attack.hitstop));
      def.x = clamp(def.x + Math.sign(p.vx) * Math.max(0, p.attack.pushback), s.stage.left, s.stage.right);
      gone.add(p);
    } else if (p.x < s.stage.left - OFFSTAGE || p.x > s.stage.right + OFFSTAGE) {
      gone.add(p);
    }
  }
  s.projectiles = s.projectiles.filter((p) => !gone.has(p));
  for (const i of [0, 1] as const) s.fighters[i].projectileOut = s.projectiles.some((p) => p.owner === i);
  return events;
}
