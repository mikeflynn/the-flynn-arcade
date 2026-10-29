// Baking a fighter (drawing every frame of every animation) takes about half a
// second, so each bake is kept for the next fight: a rematch or the next fight
// up the ladder starts straight away instead of freezing while it draws.

import type { Look } from "@web-games/rig";
import { bakeFighter, type BakedFighter } from "@web-games/rig/canvas";
import { ANIMS } from "../animations";
import type { PartPictures } from "./FighterView";

/**
 * How many bakes to keep (each is about 24 MB of pictures). Two fighters in a
 * match, plus one more so the ladder's player 1 and a mirror match's second
 * outfit usually stay ready.
 */
const KEEP = 3;

/** Oldest first: a Map remembers the order things were added. */
const cache = new Map<string, BakedFighter>();

/**
 * The full set of a fighter's animations, baked once and reused. The key covers
 * everything the pictures depend on: the fighter's id (for its part pictures),
 * the whole look (so a changed file or a mirror match's other colors bake anew)
 * and the frame rate.
 *
 * Only the drawn pages are shared. Every FighterSprite still adds its own
 * Phaser textures from them under its own key and removes them itself, so
 * forgetting a bake here never pulls a picture out from under a sprite. (Removing
 * a Phaser texture doesn't touch its canvas: the rig makes its own canvases, not
 * Phaser's pooled ones, so a page can be added again by the next sprite.)
 */
export function bakedFighter(id: string, look: Look, fps: 15 | 20 | 30, parts: PartPictures = {}): BakedFighter {
  const key = `${id}|${fps}|${JSON.stringify(look)}`;
  const found = cache.get(key);
  if (found) {
    cache.delete(key); // move it to the newest end
    cache.set(key, found);
    return found;
  }
  const baked = bakeFighter(look, ANIMS, { fps, overrides: parts });
  cache.set(key, baked);
  while (cache.size > KEEP) cache.delete(cache.keys().next().value!);
  return baked;
}
