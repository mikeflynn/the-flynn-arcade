import type Phaser from "phaser";
import type { Size } from "./types";

export interface BodyFit {
  scale: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Works out how to show a frame at the art's size and where its hitbox goes
 * (centered, at the feet). Body sizes and offsets are in frame pixels.
 * A kid's PNG can be any size: it's scaled to fit inside the art's size.
 */
export function fitBody(frame: Size, art: Size, hitbox: Size = art): BodyFit {
  const scale = Math.min(art.width / frame.width, art.height / frame.height);
  const width = Math.min(frame.width, hitbox.width / scale);
  const height = Math.min(frame.height, hitbox.height / scale);
  return { scale, width, height, offsetX: (frame.width - width) / 2, offsetY: frame.height - height };
}

export function fitSprite(sprite: Phaser.Physics.Arcade.Sprite, art: Size, hitbox?: Size): void {
  const fit = fitBody({ width: sprite.frame.width, height: sprite.frame.height }, art, hitbox);
  sprite.setScale(fit.scale);
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setSize(fit.width, fit.height, false);
  body.setOffset(fit.offsetX, fit.offsetY);
}

/** A picture with no physics (title and ending screens), sized like the art. */
export function addPicture(scene: Phaser.Scene, key: string, x: number, y: number, art: Size): Phaser.GameObjects.Image {
  const image = scene.add.image(x, y, key, 0).setOrigin(0.5, 1);
  image.setScale(Math.min(art.width / image.frame.width, art.height / image.frame.height));
  return image;
}
