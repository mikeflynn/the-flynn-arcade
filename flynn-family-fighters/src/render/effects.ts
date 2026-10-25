import type Phaser from "phaser";
import { darken, hex, INK, lighten, outlineOf } from "@web-games/rig";
import { worldHitbox, worldHurtbox, type WorldBox } from "../engine/combat";
import { projectileBox } from "../engine/specials";
import type { MatchState } from "../engine/types";
import type { FighterView } from "./FighterView";

// Hit sparks, projectiles, dizzy stars and shadows. Everything here moves in
// steps (a new shape every few frames) to match the fighters' held frames,
// and uses solid colors: no see-through glows.

/** How many steps a hit spark lasts. */
const SPARK_STEPS = 12;
const SPARK_HIT = 0xffe14a;
const SPARK_BLOCK = 0x7fd8ff;
const STAR = 0xffe14a;
/** How far above the head joint the dizzy stars circle (world units). */
const STARS_ABOVE_HEAD = 100;
/** Where the stars circle a knocked-out fighter's head, lying on the floor. */
const KO_STARS_BEHIND = 40;
const KO_STARS_ABOVE = 30;
/** Shadow size for a standing fighter of height 1 (world units). */
const SHADOW_W = 116;
const SHADOW_H = 14;

interface Spark {
  x: number;
  y: number;
  t: number;
  block: boolean;
}

type Point = { x: number; y: number };

/** A star (or starburst) shape: `points` tips alternating between radius `outer` and `inner`. */
function starPoints(x: number, y: number, points: number, outer: number, inner: number, turn: number): Point[] {
  const list: Point[] = [];
  for (let j = 0; j < points * 2; j++) {
    const r = j % 2 ? inner : outer;
    const a = (j * Math.PI) / points + turn;
    list.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
  return list;
}

export class Effects {
  private readonly shadows: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  private sparks: Spark[] = [];

  constructor(scene: Phaser.Scene, private readonly shadowColor: number) {
    this.shadows = scene.add.graphics().setDepth(4);
    this.fx = scene.add.graphics().setDepth(8);
  }

  /** A starburst where a hit landed (screen coordinates). Blue if it was blocked. */
  spark(x: number, y: number, block: boolean): void {
    this.sparks.push({ x, y, t: 0, block });
  }

  /** Called once per game step: sparks grow, then disappear. */
  step(): void {
    for (const s of this.sparks) s.t++;
    this.sparks = this.sparks.filter((s) => s.t < SPARK_STEPS);
  }

  draw(s: MatchState, views: readonly FighterView[], showHitboxes: boolean): void {
    const ground = s.stage.ground;
    this.drawShadows(s);
    const fx = this.fx;
    fx.clear();
    for (const p of s.projectiles) this.drawProjectile(p.x, ground + p.y, Math.sign(p.vx) || 1, hex(p.color, 0x7fd8ff), p.age);
    for (const sp of this.sparks) this.drawSpark(sp);
    s.fighters.forEach((f, i) => {
      // Dizzy fighters see stars. So do knocked-out ones, lying on the floor.
      const head = views[i]!.sprite.jointWorld("head");
      if (f.state === "dizzy") this.drawStars(head.x, head.y - STARS_ABOVE_HEAD, s.frame);
      // Lying on your back, your head points away from the other fighter.
      if (f.state === "ko") this.drawStars(head.x - f.facing * KO_STARS_BEHIND, head.y - KO_STARS_ABOVE, s.frame);
    });
    if (showHitboxes) this.drawBoxes(s);
  }

  destroy(): void {
    this.shadows.destroy();
    this.fx.destroy();
  }

  private drawShadows(s: MatchState): void {
    const g = this.shadows;
    g.clear();
    g.fillStyle(this.shadowColor);
    for (const f of s.fighters) {
      // A jumper's shadow shrinks the higher they go.
      const k = Math.max(0.4, 1 + f.y / 500) * f.fighter.look.height;
      const w = Math.round((SHADOW_W * k) / 2) * 2;
      const h = Math.round((SHADOW_H * k) / 2) * 2;
      g.fillEllipse(Math.round(f.x / 2) * 2, s.stage.ground + 4, w, h);
    }
  }

  /** The energy blast: solid rings of the special's color with a white-hot middle, and a trail of shrinking puffs. */
  private drawProjectile(x: number, y: number, dir: number, color: number, age: number): void {
    const fx = this.fx;
    const wobble = Math.floor(age / 3) % 2 ? 4 : 0;
    for (let i = 3; i >= 1; i--) {
      fx.fillStyle(darken(color, 0.15 * i));
      fx.fillCircle(x - dir * i * 18, y, 22 - i * 4);
    }
    fx.fillStyle(outlineOf(color));
    fx.fillCircle(x, y, 36 + wobble);
    fx.fillStyle(color);
    fx.fillCircle(x, y, 32 + wobble);
    fx.fillStyle(lighten(color, 0.5));
    fx.fillCircle(x + dir * 4, y, 22);
    fx.fillStyle(0xffffff);
    fx.fillCircle(x + dir * 8, y - 2, 12);
  }

  /** A starburst that grows in jumps every 2 steps and flickers its points. */
  private drawSpark(sp: Spark): void {
    if (sp.t >= SPARK_STEPS - 2) return;
    const r = 14 + Math.floor(sp.t / 2) * 10;
    const fx = this.fx;
    fx.fillStyle(sp.block ? SPARK_BLOCK : SPARK_HIT);
    fx.fillPoints(starPoints(sp.x, sp.y, 8, r, r * 0.4, sp.t % 4 < 2 ? 0 : 0.2), true);
    fx.fillStyle(0xffffff);
    fx.fillCircle(sp.x, sp.y, r * 0.35);
  }

  /** Three stars circling a head, jumping to a new spot every 7 steps. */
  private drawStars(x: number, y: number, frame: number): void {
    const fx = this.fx;
    const turn = Math.floor(frame / 7) * 0.45;
    for (let i = 0; i < 3; i++) {
      const a = turn + (i * Math.PI * 2) / 3;
      const star = starPoints(x + Math.cos(a) * 40, y + Math.sin(a) * 10, 5, 12, 5, -Math.PI / 2);
      fx.fillStyle(INK);
      fx.fillPoints(star.map((p) => ({ x: p.x + 2, y: p.y + 2 })), true);
      fx.fillStyle(STAR);
      fx.fillPoints(star, true);
    }
  }

  /** settings.showHitboxes: where each fighter can be hit (blue) and where attacks can hit (red). */
  private drawBoxes(s: MatchState): void {
    const fx = this.fx;
    const ground = s.stage.ground;
    const outline = (b: WorldBox, color: number) => {
      fx.lineStyle(4, color);
      fx.strokeRect(b.x0, ground + b.y0, b.x1 - b.x0, b.y1 - b.y0);
    };
    for (const f of s.fighters) {
      outline(worldHurtbox(f), 0x4080ff);
      const hit = worldHitbox(f);
      if (hit) outline(hit, 0xff4060);
    }
    for (const p of s.projectiles) outline(projectileBox(p), 0xff4060);
  }
}
