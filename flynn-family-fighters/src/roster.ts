// Finds every fighter in src/characters/ and cleans each one up.
// Drop in a new file and it shows up: there's no list to edit.

import { normalizeFighter, type Fighter } from "./fighter";
import { KNOWN_MOVE_TYPES } from "./moves";

export interface RosterResult {
  fighters: Fighter[];
  /** Friendly messages about files that couldn't be used, for the select screen. */
  problems: string[];
}

type Entry = [path: string, load: () => Promise<{ fighter?: unknown }>];

/** Loads every entry on its own, so one broken file never takes down the rest. */
export async function collectRoster(entries: Entry[], knownMoveTypes: readonly string[] = KNOWN_MOVE_TYPES): Promise<RosterResult> {
  const fighters: Fighter[] = [];
  const problems: string[] = [];
  const settled = await Promise.allSettled(entries.map(([, load]) => load()));

  settled.forEach((result, i) => {
    const file = entries[i]![0].split("/").pop()!;
    const id = file.replace(/\.ts$/, "");
    if (result.status === "rejected") {
      const why = result.reason instanceof Error ? result.reason.message : String(result.reason);
      problems.push(`${file} has a problem: ${why}`);
      return;
    }
    if (result.value.fighter === undefined) {
      problems.push(`${file} has a problem: it needs a line like "export const fighter = { ... }"`);
      return;
    }
    const warnings: string[] = [];
    const fighter = normalizeFighter(result.value.fighter, id, knownMoveTypes, (m) => {
      warnings.push(m);
      console.warn(m);
    });
    if (!fighter) {
      problems.push(`${file} has a problem: ${warnings[0] ?? "it isn't a fighter"}`);
      return;
    }
    // Two fighters with one name both stay; the later one gets a number.
    const same = fighters.filter((f) => f.name === fighter.name || f.name.replace(/ \d+$/, "") === fighter.name).length;
    if (same > 0) fighter.name = `${fighter.name} ${same + 1}`;
    fighters.push(fighter);
  });
  return { fighters, problems };
}

/** Lazy, so a file with a typo only costs that one fighter. */
export function loadRoster(knownMoveTypes: readonly string[] = KNOWN_MOVE_TYPES): Promise<RosterResult> {
  const files = import.meta.glob("./characters/*.ts") as Record<string, () => Promise<{ fighter?: unknown }>>;
  return collectRoster(Object.entries(files), knownMoveTypes);
}
