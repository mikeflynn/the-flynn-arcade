import { heroes } from "../heroes";
import { hazards } from "../hazards";
import { items } from "../items";
import { tiles } from "../tiles";
import type { AssetCandidate } from "./assets";
import type { HeroDef } from "./types";
import type { LevelCatalog } from "./levelLoader";

/** Everything a level map can contain. */
export const catalog: LevelCatalog = { tiles, hazards, items };

export const heroList: HeroDef[] = [heroes.colin, heroes.ryan];

/** Custom PNGs kids can drop in to replace the drawings: public/assets/<key>.png */
export function spriteOverrideCandidates(): AssetCandidate[] {
  return [...heroList, ...hazards, ...items].map((def) => ({ key: def.key, urls: [`assets/${def.key}.png`] }));
}
