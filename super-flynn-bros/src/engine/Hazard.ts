import Phaser from "phaser";
import type { HazardDef, Size } from "./types";

export interface Target {
  x: number;
  isOut: boolean;
}

export class Hazard extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, readonly def: HazardDef, _art: Size) {
    super(scene, x, y, def.key, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this); // colliders need a body, even on a stub
    this.setOrigin(0.5, 1);
  }

  get harmful(): boolean {
    return false;
  }

  think(_now: number, _left: number, _right: number, _targets: Target[], _ground: (x: number, y: number) => boolean): "bark" | null {
    return null;
  }
}
