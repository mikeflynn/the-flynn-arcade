import { validateGames, type GameInfo, type Registration } from "@web-games/arcade";

type ArcadeModule = { arcadeInfo?: unknown };
type Importer = () => Promise<ArcadeModule>;

// Every game folder's arcade.ts, found automatically. Each one loads on its
// own, so a game whose arcade.ts has a mistake can't take the others down.
const importers = import.meta.glob<ArcadeModule>("../../*/arcade.ts");

/** "../../super-flynn-bros/arcade.ts" → "super-flynn-bros" */
export function folderOf(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 2] ?? "";
}

const NOT_GAMES = new Set(["arcade", "lib", "node_modules", "docs"]);

/** Loads each arcade.ts. One that won't load is left out with a friendly message. */
export async function collectRegistrations(
  entries: [string, Importer][],
  warn: (message: string) => void = console.warn,
): Promise<Registration[]> {
  const games = entries.filter(([path]) => !NOT_GAMES.has(folderOf(path)));
  const results = await Promise.allSettled(games.map(([, load]) => load()));
  const registrations: Registration[] = [];
  results.forEach((result, i) => {
    const folder = folderOf(games[i][0]);
    if (result.status === "fulfilled") {
      registrations.push({ folder, info: result.value.arcadeInfo });
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      warn(`🕹️ ${folder}/arcade.ts has a mistake in it, so it can't be read (${reason}). Leaving it out of the arcade for now.`);
    }
  });
  return registrations;
}

/** Every game in the arcade, checked and sorted. */
export async function loadGames(warn: (message: string) => void = console.warn): Promise<GameInfo[]> {
  return validateGames(await collectRegistrations(Object.entries(importers), warn), warn);
}
