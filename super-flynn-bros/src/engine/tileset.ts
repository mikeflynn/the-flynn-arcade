import type Phaser from "phaser";
import { addTextureFromFrames, parseFrames, type ParsedGrid } from "./pixelArt";
import { TILE_SIZE, UNKNOWN_TILE_KEY } from "./levelLoader";
import type { TileDef } from "./types";

/** The yellow "?" block shown for map letters the game doesn't know. */
export const UNKNOWN_TILE: TileDef = {
  key: UNKNOWN_TILE_KEY,
  name: "Unknown",
  mapChar: "?",
  solid: true,
  colors: { Y: "#f6d020", y: "#b8901a", K: "#222222" },
  art: [
    "KKKKKKKKKKKKKKKK",
    "KYYYYYYYYYYYYYYK",
    "KYyYYYYYYYYYYyYK",
    "KYYYYYKKKKYYYYYK",
    "KYYYYKKYYKKYYYYK",
    "KYYYYKKYYKKYYYYK",
    "KYYYYYYYYKKYYYYK",
    "KYYYYYYYKKYYYYYK",
    "KYYYYYYKKYYYYYYK",
    "KYYYYYYKKYYYYYYK",
    "KYYYYYYYYYYYYYYK",
    "KYYYYYYKKYYYYYYK",
    "KYYYYYYKKYYYYYYK",
    "KYyYYYYYYYYYYyYK",
    "KYYYYYYYYYYYYYYK",
    "KKKKKKKKKKKKKKKK",
  ],
};

export type TileVariant = "art" | "under" | "left" | "right";

export interface Tileset {
  /** "sidewalk:under" → frame number in the tiles texture. */
  frames: Map<string, number>;
  /** Frame numbers you can stand on. */
  solidIndexes: number[];
}

const VARIANTS: TileVariant[] = ["art", "under", "left", "right"];

/** Crops or pads a drawing to exactly one tile. */
function toTileSize(grid: ParsedGrid): ParsedGrid {
  const pixels: (string | null)[] = [];
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      pixels.push(x < grid.width && y < grid.height ? grid.pixels[y * grid.width + x] : null);
    }
  }
  return { width: TILE_SIZE, height: TILE_SIZE, pixels };
}

/** Draws every tile (and its variants) into one strip texture for the tilemap. */
export function buildTileset(
  scene: Phaser.Scene,
  key: string,
  tiles: TileDef[],
  warn: (message: string) => void = console.warn,
): Tileset {
  const frames = new Map<string, number>();
  const solidIndexes: number[] = [];
  const grids: ParsedGrid[] = [];
  for (const tile of [...tiles, UNKNOWN_TILE]) {
    for (const variant of VARIANTS) {
      const art = tile[variant];
      if (!art) continue;
      const sheet = parseFrames([art], tile.colors, `${tile.key} (${variant})`);
      sheet.warnings.forEach((message) => warn(message));
      if (sheet.width !== TILE_SIZE || sheet.height !== TILE_SIZE) {
        warn(`${tile.key} (${variant}) is ${sheet.width} x ${sheet.height}, but tiles are ${TILE_SIZE} x ${TILE_SIZE}. Trimming it to fit.`);
      }
      frames.set(`${tile.key}:${variant}`, grids.length);
      if (tile.solid) solidIndexes.push(grids.length);
      grids.push(toTileSize(sheet.frames[0]));
    }
  }
  addTextureFromFrames(scene, key, grids, TILE_SIZE, TILE_SIZE);
  return { frames, solidIndexes };
}

/** Frame number for a tile variant, falling back to the tile's main drawing, then the ? block. */
export function tileFrame(tileset: Tileset, key: string, variant: TileVariant): number {
  return (
    tileset.frames.get(`${key}:${variant}`) ??
    tileset.frames.get(`${key}:art`) ??
    tileset.frames.get(`${UNKNOWN_TILE_KEY}:art`) ??
    0
  );
}
