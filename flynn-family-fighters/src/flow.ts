// The game's flow between screens: who fights next, and where the
// character select grid goes. Plain logic with no Phaser, so it can be tested.

import type { Fighter } from "./fighter";

/** 1P ARCADE (you against the whole family) or 2P VERSUS. */
export type Mode = "arcade" | "versus";

export interface FlowState {
  mode: Mode;
  p1: Fighter;
  /** Player 2's pick (versus mode only). */
  p2?: Fighter;
  /** Arcade mode: everyone you have to beat, in order. */
  ladder: Fighter[];
  /** Arcade mode: which ladder fight is next. */
  ladderIndex: number;
}

/** Who player 1 fights next: the next ladder fighter, or player 2's pick. */
export function opponent(f: FlowState): Fighter {
  return f.mode === "arcade" ? (f.ladder[f.ladderIndex] ?? f.p1) : (f.p2 ?? f.p1);
}

/**
 * What happens after a match.
 * - Arcade: a win moves up the ladder (or makes you the champ after the last fight);
 *   a loss or a draw shows the menu, where you can continue (try that fight again) or quit.
 * - Versus: always the menu (rematch, character select or quit).
 */
export function afterMatch(f: FlowState, winner: 0 | 1 | "draw"): { next: "versus" | "champ" | "menu"; flow: FlowState } {
  if (f.mode === "arcade" && winner === 0) {
    const ladderIndex = f.ladderIndex + 1;
    if (ladderIndex >= f.ladder.length) return { next: "champ", flow: f };
    return { next: "versus", flow: { ...f, ladderIndex } };
  }
  return { next: "menu", flow: f };
}

/** Where the select grid sits (world units): its top, and how tall it may grow. */
export const GRID_TOP = 80;
export const GRID_MAX_HEIGHT = 224;
/** The biggest a portrait cell gets. */
const MAX_CELL = 112;

const evenDown = (n: number) => Math.floor(n / 2) * 2;

/**
 * The select screen's portrait grid for `count` fighters, `width` units wide.
 * It picks the column count that gives the biggest cells, so the grid grows as
 * fighters are added. Positions are cell centers (x from 0 to width); the last
 * row is centered.
 */
export function gridLayout(count: number, width = 960): { cols: number; cellSize: number; positions: { x: number; y: number }[] } {
  if (count <= 0) return { cols: 0, cellSize: 0, positions: [] };
  let cols = 1, cellSize = 0;
  for (let c = 1; c <= count; c++) {
    const rows = Math.ceil(count / c);
    const size = evenDown(Math.min(MAX_CELL, width / c, GRID_MAX_HEIGHT / rows));
    if (size >= cellSize) [cols, cellSize] = [c, size];
  }
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    const left = evenDown((width - inRow * cellSize) / 2);
    positions.push({ x: left + (i % cols) * cellSize + cellSize / 2, y: GRID_TOP + row * cellSize + cellSize / 2 });
  }
  return { cols, cellSize, positions };
}
