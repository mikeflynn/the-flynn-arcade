import type Phaser from "phaser";
import { nextAttempts } from "./assets";

/**
 * Loads sound files with backups: each key starts with its first URL, and if
 * that file is broken (say jump.mp3 won't decode), the next one is tried
 * (jump.ogg), round after round. Calls `done` when nothing is left to try.
 *
 * Call it from a scene's create(). (Phaser fires no event when a file fails
 * to decode, so this checks the audio cache after each loading round.)
 */
export function loadSoundsWithBackups(scene: Phaser.Scene, files: ReadonlyMap<string, string[]>, done: () => void): void {
  const round = (backups: Map<string, string[]>): void => {
    const { attempts, remaining } = nextAttempts(backups, (key) => scene.cache.audio.exists(key));
    if (attempts.length === 0) {
      done();
      return;
    }
    for (const [key, url] of attempts) {
      console.info(`Loading sound ${url}`);
      scene.load.audio(key, url);
    }
    scene.load.once("complete", () => round(remaining));
    scene.load.start();
  };
  // Round one tries every first choice; later rounds try the backups.
  round(new Map([...files].map(([key, urls]) => [key, urls])));
}
