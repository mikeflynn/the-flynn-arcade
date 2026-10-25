import type Phaser from "phaser";
import type { BakedFighter } from "../canvas/bakeFighter";

/** The texture key of one sprite page. */
export const pageKey = (key: string, page: number): string => `${key}-p${page}`;

/** One canvas texture per page (`key-p0`, `key-p1`, …); frame `i` is baked frame `i`. Replaces any textures already under `key`. */
export function addBakedTextures(scene: Phaser.Scene, key: string, baked: BakedFighter): void {
  removeBakedTextures(scene, key);
  const textures = baked.pages.map((canvas, n) => scene.textures.addCanvas(pageKey(key, n), canvas));
  baked.frames.forEach((f, i) => textures[f.page]?.add(i, 0, f.x, f.y, f.w, f.h));
}

/** Throw away every page texture under `key`. */
export function removeBakedTextures(scene: Phaser.Scene, key: string): void {
  for (let n = 0; scene.textures.exists(pageKey(key, n)); n++) scene.textures.remove(pageKey(key, n));
}
