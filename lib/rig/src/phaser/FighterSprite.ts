import type Phaser from "phaser";
import type { BakedFighter } from "../canvas/bakeFighter";
import { shownFrame } from "../pose";
import { addBakedTextures, pageKey, removeBakedTextures } from "./bakedTexture";

/**
 * A baked fighter on screen: one Image whose frame follows the animation.
 * It owns the textures under its key: they are added on construction / `setBaked`
 * and removed by `setBaked` (old key) and `destroy`.
 *
 * The scene camera has zoom 0.5, so world units are half pixels: scale ±2 makes
 * one baked pixel one real pixel, and positions snap to even world units.
 */
export class FighterSprite {
  readonly image: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  private key = "";
  private baked!: BakedFighter;
  private held = new Map<string, number[]>();
  private job = 0;
  private anim = "";
  private frame = 0;
  private facing: 1 | -1 = 1;
  private x = 0;
  private y = 0;

  constructor(scene: Phaser.Scene, key: string, baked: BakedFighter) {
    this.scene = scene;
    this.image = scene.add.image(0, 0, "__DEFAULT");
    this.setBaked(key, baked);
  }

  /** Swap in a new bake (a new look, or a different fps), staying on the current animation frame. */
  setBaked(key: string, baked: BakedFighter): this {
    if (this.key && this.key !== key) removeBakedTextures(this.scene, this.key);
    addBakedTextures(this.scene, key, baked);
    this.key = key;
    this.baked = baked;
    this.held = new Map(Object.entries(baked.index).map(([name, list]) => [name, list.map((e) => e.frame)]));
    this.job = 0;
    this.apply();
    return this.anim ? this.show(this.anim, this.frame) : this;
  }

  /** Show animation `anim` at frame `frame` (60 per second). An unknown animation keeps the current picture. */
  show(anim: string, frame: number): this {
    const list = this.baked.index[anim], held = this.held.get(anim), a = this.baked.anims[anim];
    if (!list?.length || !held || !a) return this;
    this.anim = anim;
    this.frame = frame;
    const entry = list[held.indexOf(shownFrame(a, held, frame))];
    if (!entry || entry.job === this.job) return this;
    this.job = entry.job;
    return this.apply();
  }

  setFacing(f: 1 | -1): this {
    this.facing = f;
    this.image.setScale(2 * f, 2);
    return this;
  }

  /** Where the feet go, in world units. */
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    this.image.setPosition(Math.round(x / 2) * 2, Math.round(y / 2) * 2);
    return this;
  }

  setTint(color: number | null): this {
    if (color === null) this.image.clearTint();
    else this.image.setTint(color);
    return this;
  }

  /** A joint of the current frame in world units (art units × 2 × bake scale, mirrored by facing). */
  jointWorld(name: "head" | "fH" | "bH"): { x: number; y: number } {
    const j = this.baked.frames[this.job]?.joints[name] ?? { x: 0, y: 0 };
    const k = 2 * this.baked.scale;
    return { x: this.x + this.facing * j.x * k, y: this.y + j.y * k };
  }

  destroy(): void {
    this.image.destroy();
    if (this.key) removeBakedTextures(this.scene, this.key);
    this.key = "";
  }

  private apply(): this {
    const f = this.baked.frames[this.job];
    if (!f) return this;
    this.image.setTexture(pageKey(this.key, f.page), this.job).setOrigin(f.footX / f.w, f.footY / f.h);
    this.image.setScale(2 * this.facing, 2);
    return this;
  }
}
