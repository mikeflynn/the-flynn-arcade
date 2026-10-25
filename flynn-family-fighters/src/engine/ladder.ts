// The arcade ladder: who the player fights, in what order, and how hard they are.

import type { Fighter } from "../fighter";
import type { Rng } from "./rng";

/** Every other fighter in a random order. With only one fighter, you fight a mirror of yourself. */
export function arcadeLadder(roster: Fighter[], playerId: string, rng: Rng): Fighter[] {
  if (roster.length <= 1) return [...roster];
  const others = roster.filter((f) => f.id !== playerId);
  // Fisher-Yates shuffle with the seeded Rng, so the same seed gives the same ladder.
  for (let i = others.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others;
}

/** The CPU gets one level harder every two fights, up to level 8. */
export function ladderDifficulty(base: number, index: number): number {
  return Math.min(8, base + Math.floor(index / 2));
}
