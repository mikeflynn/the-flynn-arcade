import type { Palette } from "@web-games/pixel-art";
import type { ThemeName } from "../levels/themes";
import type { MusicKey, SoundKey } from "../sounds";

export interface Size {
  width: number;
  height: number;
}

export interface HeroDef {
  key: string;
  name: string;
  colors: Palette;
  frames: { idle: string[]; walk1: string[]; walk2: string[]; jump: string[] };
  /** Top running speed (pixels per second). */
  runSpeed: number;
  /** How hard a jump pushes up. Bigger = higher jumps. */
  jumpPower: number;
  /** The part of the hero that bumps into things. */
  hitbox: Size;
}

export type HazardBehavior = "patrol" | "slowWalk" | "rollAcross" | "bounce" | "chase" | "toggle";

export interface HazardDef {
  key: string;
  name: string;
  /** The letter that places this hazard in a level map. */
  mapChar: string;
  colors: Palette;
  /** Animation frames. For "toggle", frame 1 is "off" and frame 2 is "on". */
  frames: string[][];
  /** Milliseconds per animation frame. */
  frameMs: number;
  behavior: HazardBehavior;
  speed?: number;
  /** -1 = starts moving left, 1 = right. */
  direction?: -1 | 1;
  bounceHeight?: number;
  range?: number;
  onMs?: number;
  offMs?: number;
  hitbox?: Size;
}

export interface ItemDef {
  key: string;
  name: string;
  mapChar: string;
  colors: Palette;
  frames: string[][];
  score: number;
  hearts: number;
  sound: SoundKey;
}

export interface TileDef {
  key: string;
  name: string;
  mapChar: string;
  /** Can heroes stand on it and bump into it? */
  solid: boolean;
  colors: Palette;
  art: string[];
  /** Used when the same tile is right above (e.g. dirt under the sidewalk). */
  under?: string[];
  /** Used on the left end of a row of this tile. */
  left?: string[];
  /** Used on the right end of a row of this tile. */
  right?: string[];
}

export interface LevelDef {
  name: string;
  /** Shown on the goal sign. */
  goalLabel: string;
  theme: ThemeName;
  /** Which music track plays (from sounds.ts). Defaults to level1, level2, ... */
  music?: MusicKey;
  map: string[];
}
