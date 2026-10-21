import Phaser from "phaser";
import { settings } from "../settings";
import { fitSprite } from "./sprites";
import type { HeroDef, Size } from "./types";

export interface HeroControls {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
}

/** Frame numbers in the hero's sprite sheet (same order as heroes.ts). */
const FRAME = { idle: 0, walk1: 1, walk2: 2, jump: 3 } as const;

/** Colin or Ryan: running, jumping, hearts, and blinking after a bump. */
export class Hero extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  hearts: number;
  /** Co-op: ran out of hearts and waiting to pop back in. */
  isOut = false;
  /** Last spot with ground under both feet; falling in a pit sends you back here. */
  lastSafe: { x: number; y: number };
  private safeUntil = 0;
  /** After falling in a pit, controls pause briefly so a held arrow key doesn't run you straight back in. */
  private frozenUntil = 0;
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private jumpBufferedAt = Number.NEGATIVE_INFINITY;
  private rising = false;
  private wasOnGround = false;
  /** Being placed on the ground (level start, respawn) isn't a landing, so the next touchdown makes no "land" sound. */
  private justPlaced = true;
  /** True for the one frame when the hero touches down after being in the air. */
  landed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: HeroDef,
    readonly player: 1 | 2,
    art: Size,
  ) {
    super(scene, x, y, def.key, FRAME.idle);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    fitSprite(this, art, def.hitbox);
    this.body.setMaxVelocity(10_000, settings.maxFallSpeed);
    this.hearts = Math.min(settings.hearts, settings.maxHearts);
    this.lastSafe = { x, y };
  }

  /** Runs every frame. Returns true if the hero jumped this frame. */
  move(now: number, deltaMs: number, controls: HeroControls): boolean {
    if (this.isOut) return false;
    const body = this.body;
    const dt = deltaMs / 1000;
    const onGround = body.blocked.down;
    if (onGround) this.lastGroundedAt = now;
    this.landed = onGround && !this.wasOnGround && !this.justPlaced;
    if (onGround) this.justPlaced = false;
    this.wasOnGround = onGround;

    // Running: speed up toward the top speed, slow down when you let go.
    if (now < this.frozenUntil) controls = { left: false, right: false, jumpHeld: false, jumpPressed: false };
    const dir = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const control = onGround ? 1 : settings.airControl;
    let vx = body.velocity.x;
    if (dir !== 0) {
      vx = Phaser.Math.Clamp(vx + dir * settings.acceleration * control * dt, -this.def.runSpeed, this.def.runSpeed);
      this.setFlipX(dir < 0);
    } else {
      const slow = settings.deceleration * control * dt;
      vx = Math.abs(vx) <= slow ? 0 : vx - Math.sign(vx) * slow;
    }
    body.setVelocityX(vx);

    // Jumping, with a little forgiveness on both sides.
    if (controls.jumpPressed) this.jumpBufferedAt = now;
    const buffered = now - this.jumpBufferedAt <= settings.jumpBufferMs;
    const coyote = now - this.lastGroundedAt <= settings.coyoteTimeMs;
    let jumped = false;
    if (buffered && coyote && !this.rising) {
      body.setVelocityY(-this.def.jumpPower);
      this.rising = true;
      jumped = true;
      this.jumpBufferedAt = Number.NEGATIVE_INFINITY;
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    }
    // Let go early = smaller hop.
    if (this.rising && !controls.jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * settings.jumpCut);
      this.rising = false;
    }
    if (!jumped && (body.velocity.y >= 0 || onGround)) this.rising = false;

    this.showFrame(now, onGround, dir);
    this.setAlpha(now < this.safeUntil && Math.floor(now / 80) % 2 === 0 ? 0.3 : 1);
    return jumped;
  }

  /** Can't be hurt right now (just got bumped, or waiting to pop back in). */
  isSafe(now: number): boolean {
    return this.isOut || now < this.safeUntil;
  }

  /** Touched a hazard at `fromX`. Returns true if a heart was lost. */
  bump(now: number, fromX: number): boolean {
    if (this.isSafe(now)) return false;
    this.hearts = Math.max(0, this.hearts - 1);
    this.safeUntil = now + settings.safeTimeMs;
    const away = this.x < fromX ? -1 : 1;
    this.body.setVelocity(away * settings.knockback, -settings.knockback);
    return true;
  }

  /** Fell in a pit: lose a heart and go back to safe ground. */
  fall(now: number, spawn: { x: number; y: number }): void {
    this.hearts = Math.max(0, this.hearts - 1);
    this.safeUntil = now + settings.safeTimeMs;
    this.frozenUntil = now + 500;
    this.placeAt(spawn.x, spawn.y);
  }

  heal(amount: number): void {
    this.hearts = Math.min(settings.maxHearts, this.hearts + amount);
  }

  placeAt(x: number, y: number): void {
    this.body.reset(x, y);
    this.justPlaced = true;
    this.lastSafe = { x, y };
  }

  knockOut(): void {
    this.isOut = true;
    this.setVisible(false);
    this.body.enable = false;
  }

  revive(x: number, y: number, hearts: number, now: number): void {
    this.isOut = false;
    this.setVisible(true);
    this.body.enable = true;
    this.placeAt(x, y);
    this.hearts = hearts;
    this.safeUntil = now + settings.safeTimeMs;
  }

  /** Remembers this spot if there's ground under both feet. */
  rememberSafeGround(isGroundAt: (x: number, y: number) => boolean): void {
    const body = this.body;
    if (body.blocked.down && isGroundAt(body.left + 1, body.bottom + 1) && isGroundAt(body.right - 1, body.bottom + 1)) {
      this.lastSafe = { x: this.x, y: this.y };
    }
  }

  private showFrame(now: number, onGround: boolean, dir: number): void {
    if (!onGround) this.setFrame(FRAME.jump);
    else if (dir !== 0 || Math.abs(this.body.velocity.x) > 10) this.setFrame(Math.floor(now / 120) % 2 ? FRAME.walk1 : FRAME.walk2);
    else this.setFrame(FRAME.idle);
  }
}
