import { validateGames, type GameInfo } from "@web-games/arcade";

// Every game folder's arcade.ts, found automatically when the arcade is built.
const modules = import.meta.glob<{ arcadeInfo?: unknown }>("../../*/arcade.ts", { eager: true });

/** "../../super-flynn-bros/arcade.ts" → "super-flynn-bros" */
export function folderOf(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 2] ?? "";
}

const NOT_GAMES = new Set(["arcade", "lib", "node_modules", "docs"]);

/** Every game in the arcade, checked and sorted. */
export const games: GameInfo[] = validateGames(
  Object.entries(modules)
    .filter(([path]) => !NOT_GAMES.has(folderOf(path)))
    .map(([path, mod]) => ({ folder: folderOf(path), info: mod.arcadeInfo })),
);
