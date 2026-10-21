import { clampSettings, type Range } from "@web-games/settings";
import type { HazardDef, HeroDef, Size } from "./types";

// Safe ranges for the numbers in heroes.ts and hazards.ts, so a typo like a
// negative speed gets fixed (with a friendly message) instead of breaking the game.

const heroLimits: Record<string, Range> = {
  runSpeed: { min: 40, max: 400 },
  jumpPower: { min: 150, max: 600 },
};

const hitboxLimits: Record<string, Range> = {
  width: { min: 2, max: 64 },
  height: { min: 2, max: 64 },
};

const hazardLimits: Record<string, Range> = {
  speed: { min: 0, max: 300 },
  frameMs: { min: 50, max: 5000 },
  bounceHeight: { min: 4, max: 120 },
  range: { min: 16, max: 640 },
  onMs: { min: 100, max: 10000 },
  offMs: { min: 100, max: 10000 },
};

const checkHitbox = (hitbox: Size, warn: (message: string) => void): Size => clampSettings(hitbox, hitboxLimits, warn);

export function checkHero(def: HeroDef, warn: (message: string) => void = console.warn): HeroDef {
  const named = (message: string) => warn(`${def.name}: ${message}`);
  return { ...clampSettings(def, heroLimits, named), hitbox: checkHitbox(def.hitbox, named) };
}

export function checkHazard(def: HazardDef, warn: (message: string) => void = console.warn): HazardDef {
  const named = (message: string) => warn(`${def.name}: ${message}`);
  // Only check the settings this hazard actually has (a dog has no onMs).
  const used = Object.fromEntries(
    Object.entries(hazardLimits).filter(([key]) => def[key as keyof HazardDef] !== undefined),
  );
  const fixed = clampSettings(def, used, named);
  return def.hitbox ? { ...fixed, hitbox: checkHitbox(def.hitbox, named) } : fixed;
}
