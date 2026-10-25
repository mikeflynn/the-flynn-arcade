// Throws: grabbing a fighter who is standing close, even if they're blocking.
// With throw tech on, the grabbed fighter gets a few frames to break free.

import { addStun, damageOf, GUARD_FROM, knockDown, setTimed } from "./combat";
import { B } from "./input";
import { pushWidth } from "./movement";
import type { FState, FighterState, MatchEvent, MatchState } from "./types";

/**
 * How far apart the two bodies may be for a normal throw: the gap between them,
 * which is the center distance minus pushWidth (how close they can stand).
 * 16 is about 96 px center to center at height 1. The command throw uses 30.
 */
export const THROW_GAP = 16;
const THROW_DAMAGE = 14;
const THROW_DIZZY = 16;
/** How long the thrower is stuck after grabbing. */
const THROW_FRAMES = 24;
/** With throw tech on: how many frames the grabbed fighter has to break it. */
const TECH_FRAMES = 6;
/** A broken throw pushes both fighters this far apart. */
const TECH_PUSH = 60;

/** A defender in one of these can't be grabbed. */
const NOT_THROWABLE: FState[] = [
  "hitstun", "blockstun", "jumpSquat", "knockdown", "getup", "thrown", "throwing", "ko", "win",
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Forward or back (not diagonal, not neutral) with a newly pressed Medium or Heavy Punch. */
function throwInput(f: FighterState): "forward" | "back" | null {
  if (!f.history.pressed(B.MP | B.HP)) return null;
  const dir = f.history.dirAgo(0);
  return dir === 6 ? "forward" : dir === 4 ? "back" : null;
}

type Grab = { back: boolean; damage: number; dizzy: number };

/** The throw lands: damage, a knockdown, and (for a back throw) the thrown fighter ends up behind the thrower. */
function landThrow(s: MatchState, attacker: 0 | 1, { back, damage, dizzy }: Grab): MatchEvent[] {
  const att = s.fighters[attacker];
  const def = s.fighters[1 - attacker];
  const defender = (1 - attacker) as 0 | 1;
  const events: MatchEvent[] = [];
  def.health = Math.max(0, def.health - damageOf(att, damage, s.settings.damageScale));
  def.comboHits = 1;
  if (back) {
    const gap = Math.abs(def.x - att.x);
    def.x = clamp(att.x - att.facing * gap, s.stage.left, s.stage.right);
    def.facing = def.x < att.x ? 1 : -1; // still looking at the thrower
  }
  def.pendingThrow = null;
  knockDown(def);
  events.push({ type: "knockdown", player: defender, x: def.x, y: def.y });
  addStun(s, def, defender, dizzy, events);
  return events;
}

/** Could `attacker` grab the other fighter right now, if the bodies are at most `gap` apart? */
export function canGrab(s: MatchState, attacker: 0 | 1, gap: number): boolean {
  const att = s.fighters[attacker];
  const def = s.fighters[1 - attacker];
  if (def.airborne || NOT_THROWABLE.includes(def.state)) return false;
  return Math.abs(def.x - att.x) - pushWidth(att, def) <= gap;
}

/** Starts a grab (a normal throw or a command throw). Returns the events. */
export function grab(s: MatchState, attacker: 0 | 1, how: Grab): MatchEvent[] {
  const att = s.fighters[attacker];
  const def = s.fighters[1 - attacker];
  const damage = damageOf(att, how.damage, s.settings.damageScale);
  const events: MatchEvent[] = [{ type: "throw", player: attacker, x: (att.x + def.x) / 2, y: -120, damage }];
  att.attack = null;
  att.crouching = false;
  setTimed(att, "throwing", THROW_FRAMES);
  def.attack = null;
  def.crouching = false;
  if (s.settings.throwTechEnabled) {
    setTimed(def, "thrown", TECH_FRAMES);
    def.pendingThrow = { by: attacker, ...how };
  } else {
    events.push(...landThrow(s, attacker, how));
  }
  return events;
}

/**
 * Tries to start a throw for `attacker` this step. Returns null if this isn't a
 * throw (so the press can become a normal attack), or the events if it is.
 */
export function tryThrow(s: MatchState, attacker: 0 | 1): MatchEvent[] | null {
  const att = s.fighters[attacker];
  if (att.airborne || !GUARD_FROM.includes(att.state)) return null;
  const input = throwInput(att);
  if (!input || !canGrab(s, attacker, THROW_GAP)) return null;
  return grab(s, attacker, { back: input === "back", damage: THROW_DAMAGE, dizzy: THROW_DIZZY });
}

/**
 * Runs the grab window for fighters being thrown (throw tech on): a Medium or
 * Heavy Punch with a direction breaks it; otherwise the throw lands after TECH_FRAMES.
 */
export function updateThrown(s: MatchState): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (const i of [0, 1] as const) {
    const f = s.fighters[i];
    if (f.state !== "thrown" || !f.pendingThrow) continue;
    const { by, ...how } = f.pendingThrow;
    const att = s.fighters[by];
    f.stateFrame++;
    if (throwInput(f)) {
      const dir = Math.sign(f.x - att.x) || att.facing;
      f.x = clamp(f.x + dir * TECH_PUSH, s.stage.left, s.stage.right);
      att.x = clamp(att.x - dir * TECH_PUSH, s.stage.left, s.stage.right);
      for (const g of [f, att]) {
        g.state = "idle";
        g.stateFrame = 0;
      }
      f.pendingThrow = null;
      events.push({ type: "throwTech", player: i, x: (f.x + att.x) / 2, y: -120 });
    } else if (f.stateFrame >= f.stateLength) {
      events.push(...landThrow(s, by, how));
    }
  }
  return events;
}
