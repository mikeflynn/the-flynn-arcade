// The computer opponent. It plays by making InputFrames, exactly like a human
// pressing buttons, so it can't break any rule. It only looks at the match
// state (never at what the other player is pressing this frame).
//
// Every few frames ("reaction time") it decides what to do and queues a short
// script of inputs, because a fireball motion has to be typed one frame at a time.

import { MOVE_TYPES } from "../moves";
import { activeEnd, GUARD_FROM } from "./combat";
import { B, type InputFrame } from "./input";
import type { Rng } from "./rng";
import { checkMoveType } from "./specials";
import type { FighterState, MatchState } from "./types";

/** Farther than this: throw a fireball or walk closer. */
const FAR = 350;
/** Closer than this: use normals and throws. */
const CLOSE = 180;
/** An attacking opponent this near is worth blocking. */
const BLOCK_RANGE = 300;
/** An opponent who whiffed this near can be punished. */
const PUNISH_RANGE = 230;
/** A jumping opponent this near might land on us: anti-air. */
const ANTI_AIR_RANGE = 320;

const PUNCH_BUTTONS = [B.LP, B.MP, B.HP];
const KICK_BUTTONS = [B.LK, B.MK, B.HK];
const ALL_BUTTONS = [...PUNCH_BUTTONS, ...KICK_BUTTONS];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** n frames of the same input. */
const hold = (input: InputFrame, n: number): InputFrame[] => new Array<InputFrame>(n).fill(input);

export class CpuBrain {
  private queue: InputFrame[] = [];
  private wait = 0;
  private readonly difficulty: number;
  private readonly reaction: number;

  constructor(
    private readonly player: 0 | 1,
    difficulty: number,
    private readonly rng: Rng,
  ) {
    this.difficulty = clamp(Number.isFinite(difficulty) ? difficulty : 1, 0, 10);
    // 🛠️ TRY THIS: a smaller number makes the computer react faster.
    this.reaction = Math.max(4, Math.round(34 - 4 * this.difficulty));
  }

  /** The input for this frame. Call once per step. */
  next(s: MatchState): InputFrame {
    if (s.phase !== "fight") {
      this.queue = [];
      this.wait = 0;
      return 0;
    }
    if (this.wait > 0) this.wait--;
    if (this.wait === 0 && this.queue.length === 0) {
      this.queue = this.decide(s);
      this.wait = Math.max(this.reaction, this.queue.length);
    }
    return this.queue.shift() ?? 0;
  }

  /** True with this chance, where `base` is at difficulty 0 and `perLevel` is added for each level. */
  private chance(base: number, perLevel: number): boolean {
    return this.rng.next() < clamp(base + perLevel * this.difficulty, 0, 0.97);
  }

  private decide(s: MatchState): InputFrame[] {
    const me = s.fighters[this.player];
    const op = s.fighters[1 - this.player];
    const fwd = me.facing === 1 ? B.RIGHT : B.LEFT;
    const back = me.facing === 1 ? B.LEFT : B.RIGHT;
    const dist = Math.abs(op.x - me.x);

    // Mistakes: sometimes it just does something random.
    if (this.rng.next() < Math.max(0, 0.35 - 0.04 * this.difficulty)) return this.randomMove(fwd, back);

    const opAttack = op.attack;
    const free = GUARD_FROM.includes(me.state);

    // Anti-air: a jumper coming at us gets an uppercut, or a standing heavy punch.
    const comingIn = op.airborne && dist < ANTI_AIR_RANGE && Math.sign(me.x - op.x) === Math.sign(op.vx || op.facing);
    if (free && comingIn && this.chance(0.1, 0.08)) {
      return this.special(me, "uppercut", fwd) ?? [B.HP, 0];
    }

    // Block an attack that is about to hit, or is hitting right now.
    if (opAttack && opAttack.frame < activeEnd(opAttack.data) && dist < BLOCK_RANGE && this.chance(0.15, 0.1)) {
      const low = opAttack.data.level === "low";
      const frames = clamp(activeEnd(opAttack.data) - opAttack.frame + 4, 6, 24);
      return hold(low ? back | B.DOWN : back, frames);
    }

    // Punish: they swung and missed, and are stuck recovering.
    if (opAttack && !opAttack.hasHit && opAttack.frame >= activeEnd(opAttack.data) && this.difficulty >= 5 && dist < PUNISH_RANGE) {
      if (free && this.chance(0.3, 0.07)) return dist < CLOSE ? [B.HP, 0] : [fwd, fwd, B.HP, 0];
    }

    if (dist > FAR) {
      if (this.chance(0.1, 0.08)) {
        const ball = this.special(me, "fireball", fwd);
        if (ball && !me.projectileOut) return ball;
      }
      return hold(fwd, this.reaction);
    }
    if (dist > CLOSE) {
      if (this.chance(0.05, 0.03)) return this.jumpIn(fwd);
      return this.rng.next() < 0.7 ? hold(fwd, this.reaction) : [0];
    }
    // Close up.
    if (this.difficulty >= 4 && this.chance(0, 0.03) && !op.airborne) return [fwd, fwd | this.pick([B.MP, B.HP]), 0];
    return this.normal(me);
  }

  private pick<T>(list: readonly T[]): T {
    return list[this.rng.int(0, list.length - 1)];
  }

  /** A short jump toward the opponent, hitting with a kick on the way down. */
  private jumpIn(fwd: number): InputFrame[] {
    return [B.UP | fwd, B.UP | fwd, ...hold(fwd, 22), this.pick([B.HK, B.MK, B.HP]), 0];
  }

  /** A normal attack: standing, or crouching (a low) sometimes. */
  private normal(me: FighterState): InputFrame[] {
    const button = this.pick(ALL_BUTTONS);
    const crouch = this.rng.next() < 0.3 && me.state !== "jump" ? B.DOWN : 0;
    return [crouch | button, 0, 0];
  }

  private randomMove(fwd: number, back: number): InputFrame[] {
    switch (this.rng.int(0, 5)) {
      case 0: return hold(fwd, 10);
      case 1: return hold(back, 10);
      case 2: return [B.UP, B.UP, 0];
      case 3: return hold(B.DOWN, 10);
      case 4: return [this.pick(ALL_BUTTONS), 0];
      default: return [0, 0, 0];
    }
  }

  /** The inputs for the fighter's special of this type (motion typed frame by frame), or null if they don't have it. */
  private special(me: FighterState, type: string, fwd: number): InputFrame[] | null {
    if (!me.fighter.specials.some((c) => c.type === type)) return null;
    const def = Object.hasOwn(MOVE_TYPES, type) ? MOVE_TYPES[type] : undefined;
    if (!def) return null;
    const { motion, button } = checkMoveType(def);
    const bit = this.pick(button === "K" ? KICK_BUTTONS : PUNCH_BUTTONS);
    switch (motion) {
      case "qcf": return [B.DOWN, B.DOWN | fwd, fwd | bit, 0];
      case "dp": return [fwd, B.DOWN, B.DOWN | fwd | bit, 0];
      default: return null; // other motions are not needed for the moves the CPU plans around
    }
  }
}
