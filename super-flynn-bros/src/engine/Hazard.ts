import Phaser from "phaser";
import { settings } from "../settings";
import { fitSprite } from "./sprites";
import type { HazardDef, Size } from "./types";

/** Anything a hazard might chase. */
export interface Target {
  x: number;
  isOut: boolean;
}

/**
 * A dog, neighbor, sprinkler... Behaviors come from hazards.ts. Hazards wait
 * ("sleep") until they're about to come on screen, like in the original Mario.
 */
export class Hazard extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private awake = false;
  private direction: -1 | 1;
  private spraying = true;
  private nextToggleAt = 0;
  private chasing = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: HazardDef,
    art: Size,
  ) {
    super(scene, x, y, def.key, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    fitSprite(this, art, def.hitbox);
    this.direction = def.direction ?? -1;
    if (def.behavior === "toggle") {
      this.body.setAllowGravity(false);
      this.body.setImmovable(true);
    }
  }

  /** Sprinklers only hurt while they're spraying. */
  get harmful(): boolean {
    return this.def.behavior !== "toggle" || this.spraying;
  }

  /** Runs every frame. Returns "bark" when a chasing dog spots a hero. */
  think(
    now: number,
    cameraLeft: number,
    cameraRight: number,
    targets: Target[],
    isGroundAt: (x: number, y: number) => boolean,
  ): "bark" | null {
    if (!this.awake) {
      if (this.x - this.displayWidth / 2 > cameraRight + 16) return null;
      this.awake = true;
      this.nextToggleAt = now + (this.def.onMs ?? 1500);
    }
    if (this.def.behavior === "rollAcross" && this.x < cameraLeft - 64) {
      this.destroy();
      return null;
    }

    let event: "bark" | null = null;
    const speed = this.def.speed ?? 40;
    const body = this.body;
    switch (this.def.behavior) {
      case "patrol":
        this.walk(speed, true, isGroundAt);
        break;
      case "slowWalk":
        this.walk(speed, false, isGroundAt);
        break;
      case "rollAcross":
        body.setVelocityX(this.direction * speed);
        break;
      case "bounce":
        if (body.blocked.left) this.direction = 1;
        else if (body.blocked.right) this.direction = -1;
        body.setVelocityX(this.direction * speed);
        if (body.blocked.down) body.setVelocityY(-Math.sqrt(2 * settings.gravity * (this.def.bounceHeight ?? 32)));
        break;
      case "chase": {
        const target = this.nearest(targets);
        const distance = target ? target.x - this.x : Number.POSITIVE_INFINITY;
        if (target && Math.abs(distance) < (this.def.range ?? 120)) {
          if (!this.chasing) event = "bark";
          this.chasing = true;
          this.direction = distance < 0 ? -1 : 1;
          body.setVelocityX(this.ledgeAhead(isGroundAt) ? 0 : this.direction * speed);
        } else {
          this.chasing = false;
          body.setVelocityX(0);
        }
        break;
      }
      case "toggle":
        if (now >= this.nextToggleAt) {
          this.spraying = !this.spraying;
          this.nextToggleAt = now + (this.spraying ? (this.def.onMs ?? 1500) : (this.def.offMs ?? 1500));
        }
        break;
    }

    this.setFlipX(this.direction > 0); // the drawings face left
    this.showFrame(now);
    return event;
  }

  private walk(speed: number, turnAtLedges: boolean, isGroundAt: (x: number, y: number) => boolean): void {
    const body = this.body;
    if (body.blocked.left) this.direction = 1;
    else if (body.blocked.right) this.direction = -1;
    else if (turnAtLedges && body.blocked.down && this.ledgeAhead(isGroundAt)) this.direction = this.direction === 1 ? -1 : 1;
    body.setVelocityX(this.direction * speed);
  }

  private ledgeAhead(isGroundAt: (x: number, y: number) => boolean): boolean {
    const aheadX = this.direction < 0 ? this.body.left - 2 : this.body.right + 2;
    return !isGroundAt(aheadX, this.body.bottom + 2);
  }

  private nearest(targets: Target[]): Target | null {
    let best: Target | null = null;
    for (const t of targets) {
      if (!t.isOut && (!best || Math.abs(t.x - this.x) < Math.abs(best.x - this.x))) best = t;
    }
    return best;
  }

  private showFrame(now: number): void {
    const count = this.def.frames.length;
    if (this.def.behavior === "toggle") this.setFrame(this.spraying ? Math.min(1, count - 1) : 0);
    else if (count > 1) this.setFrame(Math.floor(now / this.def.frameMs) % count);
  }
}
