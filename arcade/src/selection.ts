import type { GameInfo } from "@web-games/arcade";

/** One spot in the row: a real game, or a "COMING SOON" cabinet. */
export type Slot = { kind: "game"; game: GameInfo } | { kind: "soon" };

export function buildSlots(games: GameInfo[], comingSoon: number): Slot[] {
  // With no games at all, show at least one "COMING SOON" cabinet so the arcade never has an empty row.
  const soon = games.length === 0 ? Math.max(1, comingSoon) : comingSoon;
  return [...games.map((game) => ({ kind: "game" as const, game })), ...Array.from({ length: soon }, () => ({ kind: "soon" as const }))];
}

/** Keeps an index inside 0..count-1, wrapping around at both ends. */
export function wrap(index: number, count: number): number {
  return count === 0 ? 0 : ((index % count) + count) % count;
}

/** Which cabinet starts selected: the game you came back from, or the first one. */
export function initialIndex(slots: Slot[], fromId: string | null): number {
  const found = slots.findIndex((s) => s.kind === "game" && s.game.id === fromId);
  return found >= 0 ? found : 0;
}

/**
 * Show-off mode's next cabinet. It skips "COMING SOON" cabinets, unless
 * there's only one real game (then it wanders across all of them).
 */
export function nextAttractIndex(current: number, slots: Slot[]): number {
  const realGames = slots.filter((s) => s.kind === "game").length;
  for (let step = 1; step <= slots.length; step++) {
    const next = wrap(current + step, slots.length);
    if (realGames <= 1 || slots[next].kind === "game") return next;
  }
  return current;
}
