// Attacks: which normal a button means, running its frames, raising a guard,
// and deciding hits, blocks and trades. Pure: no Phaser, no randomness.
// The attack numbers themselves live in the kid file src/moves.ts.

import type { NormalId } from "../fighter";
import { NORMALS, type MoveData } from "../moves";
import { B, type Dir } from "./input";
import type { ActiveAttack, AttackData, Box, FState, FighterState, MatchEvent, MatchState, Stage } from "./types";

/**
 * Where a fighter can be hit, at look height 1 (already sized for fighters drawn
 * at 80% of the art). y and h grow with the look's height. The air box is measured
 * from the jumper's feet and stops 80 above them, because the legs are tucked.
 */
export const HURTBOXES: { stand: Box; crouch: Box; air: Box } = {
  stand: { x: -40, y: -250, w: 80, h: 250 },
  crouch: { x: -40, y: -160, w: 80, h: 160 },
  air: { x: -40, y: -230, w: 80, h: 150 },
};

/** Medium and Heavy Punch use their close version when the fighters' centers are nearer than this. */
const CLOSE_RANGE = 90;
/** Holding back raises the guard when an opponent's attack is starting within this distance... */
const GUARD_RANGE = 300;
/** ...or one of their projectiles is flying this way within this distance. */
const PROJECTILE_GUARD_RANGE = 360;

/** Heaviest first, so pressing two buttons on the same frame picks the bigger attack. */
const BUTTONS: readonly [number, string][] = [
  [B.HP, "HP"], [B.HK, "HK"], [B.MP, "MP"], [B.MK, "MK"], [B.LP, "LP"], [B.LK, "LK"],
];

/** How long a fighter stays down, then takes to get up. They can't be hit during either. */
const KNOCKDOWN_FRAMES = 40;
const GETUP_FRAMES = 20;
/** The dizzy meter: a fighter who reaches DIZZY_AT is dizzy for DIZZY_FRAMES; each newly pressed button shakes off DIZZY_MASH more. */
const DIZZY_AT = 100;
const DIZZY_FRAMES = 180;
const DIZZY_MASH = 4;
/** The meter holds for this many frames after a hit, then drains 1 per frame. */
const STUN_DECAY_DELAY = 60;

const ATTACK_FROM: FState[] = ["idle", "walkF", "walkB", "crouch", "guard", "jump"];
/** Free on the ground: can guard, and can start a throw. */
export const GUARD_FROM: FState[] = ["idle", "walkF", "walkB", "crouch", "guard"];
/** Can't be hit at all. */
const INVULNERABLE: FState[] = ["knockdown", "getup", "thrown", "ko", "win"];

const BLOCK_FROM: FState[] = ["idle", "walkB", "crouch", "guard", "blockstun"];
/** States that mean "back to normal": a combo is over once the defender reaches one. */
const NEUTRAL: FState[] = ["idle", "walkF", "walkB", "crouch", "guard", "jumpSquat", "jump", "attack"];
const DOWNS: Dir[] = [1, 2, 3];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A frame count from moves.ts, made safe: a whole number, never below `min`. */
export function frames(n: number, min = 0): number {
  return Number.isFinite(n) ? Math.max(min, Math.round(n)) : min;
}

export function startupOf(a: AttackData): number {
  return frames(a.startup);
}

/** The first frame after the active frames. */
export function activeEnd(a: AttackData): number {
  return startupOf(a) + frames(a.active, 1);
}

function totalFrames(a: AttackData): number {
  return activeEnd(a) + frames(a.recovery);
}

function isActive(atk: ActiveAttack): boolean {
  return atk.frame >= startupOf(atk.data) && atk.frame < activeEnd(atk.data);
}

/** Can anything (an attack or a projectile) hit this fighter right now? Not while down, and not during an attack's invulnerable frames. */
export function canBeHit(f: FighterState): boolean {
  if (INVULNERABLE.includes(f.state)) return false;
  return !(f.attack && f.attack.frame < frames(f.attack.data.invulnFrames ?? 0));
}

const LEVELS: readonly AttackData["level"][] = ["high", "mid", "low"];

/** Turns a moves.ts entry into engine data, fixing a level typo (to "mid" if it can't tell) with a friendly warning. */
export function normalizeAttack(move: MoveData, warn: (message: string) => void = console.warn): AttackData {
  const exact = LEVELS.find((l) => l === move.level);
  if (exact) return { ...move, level: exact };
  const close = LEVELS.find((l) => l === String(move.level).trim().toLowerCase());
  const level = close ?? "mid";
  warn(`🥊 moves.ts ${move.id}: level should be "high", "mid" or "low", not ${JSON.stringify(move.level)}. Using "${level}".`);
  return { ...move, level };
}

/** The moves table, checked once when the game starts. */
const ATTACKS = Object.fromEntries(
  Object.entries(NORMALS).map(([id, move]) => [id, normalizeAttack(move)]),
) as Record<NormalId, AttackData>;

/** The fighter's current hurtbox, grown by the look's height. */
export function hurtbox(f: FighterState): Box {
  const base = f.airborne ? HURTBOXES.air : f.crouching ? HURTBOXES.crouch : HURTBOXES.stand;
  const height = f.fighter.look.height;
  return { x: base.x, y: base.y * height, w: base.w, h: base.h * height };
}

/** Which normal this button means right now: jumping, crouching, close or standing, with the fighter's own tweaks. */
export function attackFor(f: FighterState, button: number, other: FighterState): AttackData {
  const name = BUTTONS.find(([bit]) => bit === button)?.[1] ?? "LP";
  const version = f.airborne
    ? "j"
    : DOWNS.includes(f.history.dirAgo(0))
      ? "cr"
      : (name === "MP" || name === "HP") && Math.abs(other.x - f.x) < CLOSE_RANGE
        ? "cl"
        : "st";
  const id = `${version}.${name}` as NormalId;
  const base = ATTACKS[id];
  const tweak = f.fighter.normals[id] ?? {};
  return { ...base, damage: tweak.damage ?? base.damage, hitbox: sizedHitbox(base.hitbox, f, tweak.reach ?? 1) };
}

/** A hitbox from moves.ts, grown with the look's height (and stretched sideways by `reach`). */
export function sizedHitbox(hb: Box, f: FighterState, reach = 1): Box {
  const height = f.fighter.look.height;
  const r = height * reach;
  return { x: hb.x * r, y: hb.y * height, w: hb.w * r, h: hb.h * height };
}

export type WorldBox = { x0: number; x1: number; y0: number; y1: number };

/** A box relative to a fighter's feet, turned into world coordinates. */
function toWorld(b: Box, x: number, y: number, facing: 1 | -1): WorldBox {
  const x0 = facing === 1 ? x + b.x : x - b.x - b.w;
  return { x0, x1: x0 + b.w, y0: y + b.y, y1: y + b.y + b.h };
}

export function overlapOf(a: WorldBox, b: WorldBox): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** Fighter f's hurtbox in world coordinates. */
export function worldHurtbox(f: FighterState): WorldBox {
  return toWorld(hurtbox(f), f.x, f.y, f.facing);
}

/** Fighter f's attack hitbox in world coordinates while it can hit (not for projectiles and grabs), or null. */
export function worldHitbox(f: FighterState): WorldBox | null {
  const atk = f.attack;
  if (!atk || !isActive(atk) || atk.data.projectile || atk.data.grab) return null;
  return toWorld(atk.data.hitbox, f.x, f.y, f.facing);
}

/** Do two boxes, each attached to a fighter at (x, y) facing a way, touch? */
export function boxesOverlap(
  a: Box, aX: number, aY: number, aFacing: 1 | -1,
  b: Box, bX: number, bY: number, bFacing: 1 | -1,
): boolean {
  return overlapOf(toWorld(a, aX, aY, aFacing), toWorld(b, bX, bY, bFacing));
}

/** Is something about to hit fighter i: an attack starting nearby, or a projectile on its way? */
function threatened(s: MatchState, i: 0 | 1): boolean {
  const f = s.fighters[i];
  const o = s.fighters[1 - i];
  const a = o.attack;
  if (a && !a.hasHit && a.frame < activeEnd(a.data) && Math.abs(o.x - f.x) < GUARD_RANGE) return true;
  return s.projectiles.some(
    (p) => p.owner !== i && p.vx !== 0 && Math.sign(f.x - p.x) === Math.sign(p.vx) && Math.abs(f.x - p.x) < PROJECTILE_GUARD_RANGE,
  );
}

export function setTimed(f: FighterState, state: FState, length: number): void {
  f.state = state;
  f.stateFrame = 0;
  f.stateLength = frames(length, 1);
}

/** Knocks a fighter over: down for a while, then a getup, invulnerable the whole time. */
export function knockDown(f: FighterState): void {
  f.attack = null;
  setTimed(f, "knockdown", KNOCKDOWN_FRAMES);
}

/**
 * Adds to a fighter's dizzy meter after a hit. Reaching the top makes them dizzy
 * (unless they're knocked down or out of health: a KO beats dizzy).
 */
export function addStun(s: MatchState, f: FighterState, index: 0 | 1, amount: number, events: MatchEvent[]): void {
  if (!s.settings.dizzyEnabled || f.state === "dizzy") return;
  f.stun += frames(amount);
  f.stunDecayDelay = STUN_DECAY_DELAY;
  if (f.stun < DIZZY_AT || f.health <= 0 || f.state === "knockdown") return;
  f.attack = null;
  f.stun = 0;
  setTimed(f, "dizzy", DIZZY_FRAMES);
  events.push({ type: "dizzy", player: index });
}

function toNeutral(f: FighterState): void {
  f.state = f.airborne ? "jump" : f.crouching ? "crouch" : "idle";
  f.stateFrame = 0;
}

function endAttack(f: FighterState, i: 0 | 1, events: MatchEvent[]): void {
  if (f.attack && !f.attack.hasHit) events.push({ type: "whiff", player: i, name: f.attack.data.id });
  f.attack = null;
  if (f.state === "attack") toNeutral(f);
}

/** Counts down hitstop. Returns true if the fighter is frozen this step. */
export function tickHitstop(f: FighterState): boolean {
  if (f.hitstop <= 0) return false;
  f.hitstop--;
  return true;
}

/**
 * Runs fighter i's timers for one step: the dizzy meter, hit/block/knockdown/dizzy
 * stun, and the current attack's frames. Returns true when the fighter is free to
 * start something new (an attack or a throw) on this step.
 */
export function runTimers(s: MatchState, i: 0 | 1, events: MatchEvent[]): boolean {
  const f = s.fighters[i];
  if (f.stunDecayDelay > 0) f.stunDecayDelay--;
  else if (f.stun > 0) f.stun--;
  switch (f.state) {
    case "hitstun":
    case "blockstun":
    case "throwing":
    case "getup":
      f.stateFrame++;
      if (f.stateFrame >= f.stateLength) toNeutral(f);
      break;
    case "knockdown":
      if (!f.airborne) f.stateFrame++; // knocked down in the air: the time on the floor starts at landing
      if (f.stateFrame >= f.stateLength) setTimed(f, "getup", GETUP_FRAMES);
      break;
    case "dizzy": {
      const shakes = BUTTONS.filter(([bit]) => f.history.pressed(bit)).length;
      f.stateFrame += 1 + DIZZY_MASH * shakes;
      if (f.stateFrame >= f.stateLength) toNeutral(f);
      break;
    }
    default:
      break;
  }
  if (f.attack) {
    f.attack.frame++;
    // A jump attack holds its pose until the fighter lands (one attack per jump).
    if (f.attack.frame >= totalFrames(f.attack.data) && !f.airborne) endAttack(f, i, events);
    if (f.attack) return false; // still busy; otherwise this first free frame can start the next attack
  }
  return true;
}

/** Starts the normal attack for a newly pressed button, if the fighter is free to. */
export function startAttack(s: MatchState, i: 0 | 1): void {
  const f = s.fighters[i];
  if (!ATTACK_FROM.includes(f.state)) return;
  if (f.airborne && f.hitInAir) return; // hit in the air: no more attacking until you land
  const pressed = BUTTONS.find(([bit]) => f.history.pressed(bit));
  if (!pressed) return;
  const data = attackFor(f, pressed[0], s.fighters[1 - i]);
  f.attack = { data, frame: 0, hasHit: false };
  if (!f.airborne) f.crouching = DOWNS.includes(f.history.dirAgo(0));
  f.state = "attack";
  f.stateFrame = 0;
}

/**
 * Proximity guard: holding back (4) or down-back (1) on the ground while
 * threatened stops the fighter in a guard pose. Returns true if it did, so
 * movement is skipped. With no threat, movement turns guard back into walkB/crouch.
 */
export function updateGuard(s: MatchState, i: 0 | 1): boolean {
  const f = s.fighters[i];
  if (f.airborne || !GUARD_FROM.includes(f.state)) return false;
  const dir = f.history.dirAgo(0);
  if ((dir !== 4 && dir !== 1) || !threatened(s, i)) return false;
  f.crouching = dir === 1;
  if (f.state === "guard") f.stateFrame++;
  else {
    f.state = "guard";
    f.stateFrame = 0;
  }
  return true;
}

/**
 * Tidies up after movement: a jump attack ends on landing, a special that lifted
 * the fighter starts its recovery on landing, and a combo ends back in neutral.
 */
export function afterMovement(s: MatchState, i: 0 | 1, events: MatchEvent[]): void {
  const f = s.fighters[i];
  if (f.attack?.inAir && !f.airborne) {
    f.attack.inAir = false;
    f.attack.frame = activeEnd(f.attack.data);
  }
  if (f.attack && f.state !== "attack") endAttack(f, i, events); // landing set the state to idle
  if (NEUTRAL.includes(f.state)) f.comboHits = 0;
}

/** Standing blocks high and mid, crouching blocks low and mid. You must hold back, be on the ground, and be free. */
export function canBlock(def: FighterState, level: AttackData["level"]): boolean {
  const dir = def.history.dirAgo(0);
  if ((dir !== 4 && dir !== 1) || def.airborne || !BLOCK_FROM.includes(def.state)) return false;
  return dir === 1 ? level !== "high" : level !== "low";
}

/** Pushes the defender away; whatever a wall stops is taken by the attacker instead. */
function pushBack(att: FighterState, def: FighterState, amount: number, stage: Stage): void {
  const dir = Math.sign(def.x - att.x) || att.facing;
  const want = def.x + dir * Math.max(0, amount);
  def.x = clamp(want, stage.left, stage.right);
  att.x = clamp(att.x - (want - def.x), stage.left, stage.right);
}

/** Damage after the attacker's power and the kid's damageScale setting. */
export function damageOf(att: FighterState, baseDamage: number, damageScale: number): number {
  return Math.max(0, Math.round(baseDamage * (0.8 + 0.04 * att.fighter.stats.power) * damageScale));
}

/**
 * Applies a hit or a block from fighter i's attack `a` to the other fighter.
 * Hitstop and pushback are up to the caller. Blocked special moves chip.
 */
export function applyContact(
  s: MatchState, i: 0 | 1, a: AttackData, special: boolean, blocked: boolean, x: number, y: number,
): MatchEvent[] {
  const att = s.fighters[i];
  const def = s.fighters[1 - i];
  const damage = damageOf(att, a.damage, s.settings.damageScale);
  if (blocked) {
    const chip = special ? Math.round(damage * s.settings.chipDamageFraction) : frames(a.chip);
    def.crouching = def.history.dirAgo(0) === 1;
    def.health = Math.max(0, def.health - chip);
    setTimed(def, "blockstun", a.blockstun);
    return [{ type: "block", player: i, x, y, name: a.id }];
  }
  const events: MatchEvent[] = [];
  const wasDizzy = def.state === "dizzy";
  def.comboHits = def.state === "hitstun" || wasDizzy ? def.comboHits + 1 : 1;
  def.health = Math.max(0, def.health - damage);
  def.attack = null; // getting hit interrupts whatever they were doing
  def.hitInAir = def.airborne;
  def.lastHitLevel = a.level;
  if (a.knockdown) knockDown(def);
  else if (!wasDizzy) setTimed(def, "hitstun", a.hitstun); // a dizzy fighter stays dizzy
  events.push({ type: "hit", player: i, x, y, name: a.id, damage });
  if (a.knockdown) events.push({ type: "knockdown", player: (1 - i) as 0 | 1, x, y });
  addStun(s, def, (1 - i) as 0 | 1, a.dizzy, events);
  return events;
}

/**
 * Checks both fighters' active attacks against the other's hurtbox and applies
 * every hit or block. Both sides are checked before either is applied, so two
 * attacks that connect on the same step trade. Fireballs and grabs don't hit
 * with the body (specials.ts handles them).
 */
export function resolveHits(s: MatchState): MatchEvent[] {
  const events: MatchEvent[] = [];
  const contacts: { i: 0 | 1; atk: ActiveAttack; blocked: boolean; x: number; y: number }[] = [];
  for (const i of [0, 1] as const) {
    const att = s.fighters[i];
    const def = s.fighters[1 - i];
    const atk = att.attack;
    if (!atk || atk.hasHit || att.hitstop > 0 || !isActive(atk) || !canBeHit(def)) continue;
    if (atk.data.projectile || atk.data.grab) continue;
    const hit = toWorld(atk.data.hitbox, att.x, att.y, att.facing);
    const body = worldHurtbox(def);
    if (!overlapOf(hit, body)) continue;
    contacts.push({
      i,
      atk,
      blocked: canBlock(def, atk.data.level),
      x: (Math.max(hit.x0, body.x0) + Math.min(hit.x1, body.x1)) / 2,
      y: (Math.max(hit.y0, body.y0) + Math.min(hit.y1, body.y1)) / 2,
    });
  }

  for (const { i, atk, blocked, x, y } of contacts) {
    const att = s.fighters[i];
    const def = s.fighters[1 - i];
    const a = atk.data;
    atk.hasHit = true;
    events.push(...applyContact(s, i, a, atk.special !== undefined, blocked, x, y));
    const stop = frames(a.hitstop);
    att.hitstop = Math.max(att.hitstop, stop);
    def.hitstop = Math.max(def.hitstop, stop);
    pushBack(att, def, a.pushback, s.stage);
  }
  return events;
}
