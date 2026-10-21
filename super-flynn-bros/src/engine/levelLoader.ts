import type { HazardDef, ItemDef, TileDef } from "./types";

export const TILE_SIZE = 16;

/** Special letters in level maps. */
export const MAP_MARKERS = { player1: "1", player2: "2", goal: "G" } as const;

/** Tile shown for letters the game doesn't know. It's solid, so nobody falls through. */
export const UNKNOWN_TILE_KEY = "unknown";

export interface LevelCatalog {
  tiles: TileDef[];
  hazards: HazardDef[];
  items: ItemDef[];
}

export interface Cell {
  col: number;
  row: number;
}

export interface PlacedThing extends Cell {
  key: string;
}

export interface LoadedLevel {
  cols: number;
  rows: number;
  /** [row][col]: tile key, or null for empty. */
  tiles: (string | null)[][];
  /** [row][col]: can you stand on it? */
  solid: boolean[][];
  hazards: PlacedThing[];
  items: PlacedThing[];
  starts: { 1: Cell; 2: Cell };
  goal: Cell;
  warnings: string[];
}

type Lookup = Map<string, { kind: "tile" | "hazard" | "item"; key: string; solid: boolean }>;

/** Builds the letter → thing table and warns about letters used twice. */
export function buildCharLookup(catalog: LevelCatalog): { lookup: Lookup; warnings: string[] } {
  const lookup: Lookup = new Map();
  const warnings: string[] = [];
  const reserved = new Set<string>([...Object.values(MAP_MARKERS), " ", "."]);
  const add = (char: string, kind: "tile" | "hazard" | "item", key: string, solid: boolean) => {
    if (reserved.has(char)) {
      warnings.push(`"${char}" is a special map letter, so ${key} can't use it. Pick another mapChar.`);
      return;
    }
    const existing = lookup.get(char);
    if (existing) {
      warnings.push(`${key} and ${existing.key} both use "${char}". Give one of them a different mapChar.`);
      return;
    }
    lookup.set(char, { kind, key, solid });
  };
  catalog.tiles.forEach((t) => add(t.mapChar, "tile", t.key, t.solid));
  catalog.hazards.forEach((h) => add(h.mapChar, "hazard", h.key, false));
  catalog.items.forEach((i) => add(i.mapChar, "item", i.key, false));
  return { lookup, warnings };
}

/** The topmost row in `col` that's solid with empty space above it, or null if the column is empty. */
export function surfaceRow(solid: boolean[][], col: number): number | null {
  for (let row = 0; row < solid.length; row++) {
    if (solid[row][col] && (row === 0 || !solid[row - 1][col])) return row;
  }
  return null;
}

/**
 * The first safe place to stand at or after `fromCol`: a solid surface with
 * two empty rows above it (room for a hero). Returns the empty cell to stand in.
 */
export function findSafeSpawn(level: Pick<LoadedLevel, "solid" | "cols">, fromCol: number): Cell | null {
  const start = Math.max(0, Math.min(level.cols - 1, fromCol));
  const order = [
    ...Array.from({ length: level.cols - start }, (_, i) => start + i),
    ...Array.from({ length: start }, (_, i) => start - 1 - i),
  ];
  for (const col of order) {
    const row = surfaceRow(level.solid, col);
    if (row !== null && row >= 2) return { col, row: row - 1 };
  }
  return null;
}

/**
 * Where to put a hero after falling in a pit: a couple of tiles before their
 * last safe spot, so holding "right" doesn't walk them straight back in.
 * Never left of `minCol` (the edge of the screen).
 */
export function findRespawn(
  level: Pick<LoadedLevel, "solid" | "cols">,
  lastSafeCol: number,
  minCol: number,
  stepBack = 2,
): Cell | null {
  return findSafeSpawn(level, Math.max(minCol, lastSafeCol - stepBack));
}

/** Which drawing a tile uses, based on its neighbors. */
export function tileVariant(
  tiles: (string | null)[][],
  col: number,
  row: number,
): "art" | "under" | "left" | "right" {
  const key = tiles[row]?.[col];
  if (!key) return "art";
  if (tiles[row - 1]?.[col] === key) return "under";
  const leftSame = tiles[row]?.[col - 1] === key;
  const rightSame = tiles[row]?.[col + 1] === key;
  if (!leftSame && rightSame) return "left";
  if (leftSame && !rightSame) return "right";
  return "art";
}

/** Reads a text map into tiles, hazards, items, starts, and the goal. Never throws. */
export function loadLevel(
  map: readonly string[],
  catalog: LevelCatalog,
  name = "level",
  options: { expectedRows?: number } = {},
): LoadedLevel {
  const { lookup, warnings } = buildCharLookup(catalog);
  const rows = Math.max(1, map.length);
  const cols = Math.max(1, ...map.map((line) => line.length));
  const tiles: (string | null)[][] = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
  const solid: boolean[][] = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const hazards: PlacedThing[] = [];
  const items: PlacedThing[] = [];
  const found: { 1?: Cell; 2?: Cell; goal?: Cell } = {};
  const unknown = new Map<string, Cell>();

  map.forEach((line, row) => {
    [...line].forEach((char, col) => {
      if (char === " " || char === ".") return;
      const marker =
        char === MAP_MARKERS.player1 ? 1 : char === MAP_MARKERS.player2 ? 2 : char === MAP_MARKERS.goal ? "goal" : null;
      if (marker !== null) {
        if (found[marker]) warnings.push(`${name}: there's more than one "${char}". Using the first one.`);
        else found[marker] = { col, row };
        return;
      }
      const thing = lookup.get(char);
      if (!thing) {
        if (!unknown.has(char)) unknown.set(char, { col, row });
        tiles[row][col] = UNKNOWN_TILE_KEY;
        solid[row][col] = true;
        return;
      }
      if (thing.kind === "tile") {
        tiles[row][col] = thing.key;
        solid[row][col] = thing.solid;
      } else {
        (thing.kind === "hazard" ? hazards : items).push({ key: thing.key, col, row });
      }
    });
  });

  if (options.expectedRows !== undefined && map.length !== options.expectedRows) {
    warnings.push(
      `${name}: levels should be ${options.expectedRows} rows tall, but this one is ${map.length}. Some of it may be off the screen.`,
    );
  }

  for (const [char, at] of unknown) {
    warnings.push(
      `${name}: I don't know what "${char}" means (first seen at row ${at.row + 1}, column ${at.col + 1}). Showing a ? block.`,
    );
  }

  const fallbackStart = (fromCol: number): Cell => findSafeSpawn({ solid, cols }, fromCol) ?? { col: fromCol, row: 0 };
  if (!found[1]) {
    found[1] = fallbackStart(0);
    warnings.push(`${name}: no "1" (player 1 start) in the map, so I put one at the left.`);
  }
  if (!found[2]) found[2] = fallbackStart(found[1].col + 2);
  if (!found.goal) {
    let goal: Cell = { col: cols - 1, row: 0 };
    for (let col = cols - 1; col >= 0; col--) {
      const row = surfaceRow(solid, col);
      if (row !== null && row >= 1) {
        goal = { col, row: row - 1 };
        break;
      }
    }
    found.goal = goal;
    warnings.push(`${name}: no "G" (goal) in the map, so I put one at the right.`);
  }

  return { cols, rows, tiles, solid, hazards, items, starts: { 1: found[1], 2: found[2] }, goal: found.goal, warnings };
}
