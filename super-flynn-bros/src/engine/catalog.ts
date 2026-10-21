import { heroes } from "../heroes";
import { hazards } from "../hazards";
import { items } from "../items";
import { tiles } from "../tiles";
import type { AssetCandidate } from "@web-games/audio";
import { checkHazard, checkHero } from "./checkDefs";
import type { HeroDef } from "./types";
import type { LevelCatalog } from "./levelLoader";

/** Colin and Ryan, with any out-of-range numbers fixed. */
export const checkedHeroes = { colin: checkHero(heroes.colin), ryan: checkHero(heroes.ryan) };

/** Everything a level map can contain (hazard numbers checked too). */
export const catalog: LevelCatalog = { tiles, hazards: hazards.map((h) => checkHazard(h)), items };

export const heroList: HeroDef[] = [checkedHeroes.colin, checkedHeroes.ryan];

/** Custom PNGs kids can drop in to replace the drawings: public/assets/<key>.png */
export function spriteOverrideCandidates(): AssetCandidate[] {
  return [...heroList, ...hazards, ...items].map((def) => ({ key: def.key, urls: [`assets/${def.key}.png`] }));
}
