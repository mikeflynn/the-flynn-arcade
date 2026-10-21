/**
 * @web-games/arcade: how a game joins The Flynn Arcade, and how the arcade
 * and the games link to each other.
 *
 * Each game adds `<game>/arcade.ts` exporting `arcadeInfo: GameInfo`.
 */

export interface GameInfo {
  /** Must match the game's folder name (it's also the web address: /<id>/). */
  id: string;
  /** Shown on the cabinet marquee and the info panel. */
  title: string;
  /** One sentence about the game, typed out on the info panel. */
  blurb: string;
  players: { min: number; max: number; coop: boolean };
  /** Cabinet colors as "#rrggbb". */
  colors: { primary: string; secondary: string };
  /** The game's dev server port (see the port registry in CLAUDE.md). */
  devPort: number;
  /** Optional: lower numbers come first in the row of cabinets. */
  order?: number;
  /** The little picture on the cabinet's screen: up to 32 x 24 letters. */
  screenArt: { colors: Record<string, string>; art: string[] };
}

export const SCREEN_ART_MAX = { width: 32, height: 24 } as const;
export const ARCADE_DEV_PORT = 8000;

export interface Registration {
  folder: string;
  info: unknown;
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Why a registration can't be used, or null if it's fine. */
function problemWith(folder: string, info: unknown): string | null {
  if (!info || typeof info !== "object") return "no `arcadeInfo` exported from arcade.ts";
  const g = info as Partial<GameInfo>;
  if (typeof g.id !== "string" || !KEBAB_CASE.test(g.id)) return "id should be kebab-case, like \"space-pong\"";
  if (g.id !== folder) return `id is "${g.id}" but should be "${folder}" (the folder name)`;
  if (typeof g.title !== "string" || g.title.length === 0) return "it needs a title";
  if (typeof g.blurb !== "string") return "it needs a blurb";
  const p = g.players;
  if (!p || typeof p.min !== "number" || typeof p.max !== "number" || p.min < 1 || p.min > p.max) {
    return "players should look like { min: 1, max: 2, coop: true }";
  }
  if (!g.colors || typeof g.colors.primary !== "string" || typeof g.colors.secondary !== "string") {
    return "colors needs a primary and a secondary color";
  }
  if (typeof g.devPort !== "number" || !Number.isInteger(g.devPort)) return "devPort should be a whole number, like 8001";
  const art = g.screenArt?.art;
  if (!Array.isArray(art) || !g.screenArt?.colors) return "screenArt needs colors and art";
  if (art.length > SCREEN_ART_MAX.height || art.some((row) => typeof row !== "string" || row.length > SCREEN_ART_MAX.width)) {
    return `screenArt is bigger than the cabinet screen (${SCREEN_ART_MAX.width} x ${SCREEN_ART_MAX.height} at most)`;
  }
  return null;
}

/**
 * Checks every game's arcade.ts. Broken ones are skipped with a friendly
 * message instead of breaking the arcade. Sorted by order, then title.
 */
export function validateGames(
  registrations: Registration[],
  warn: (message: string) => void = console.warn,
): GameInfo[] {
  const games: GameInfo[] = [];
  const seen = new Set<string>();
  for (const { folder, info } of registrations) {
    const problem = problemWith(folder, info);
    if (problem) {
      warn(`🕹️ ${folder}/arcade.ts: ${problem}. Leaving it out of the arcade for now.`);
      continue;
    }
    const game = info as GameInfo;
    if (seen.has(game.id)) {
      warn(`🕹️ Two games use the id "${game.id}". Keeping the first one.`);
      continue;
    }
    seen.add(game.id);
    games.push(game);
  }
  const order = (g: GameInfo) => g.order ?? Number.POSITIVE_INFINITY;
  return games.sort((a, b) => order(a) - order(b) || a.title.localeCompare(b.title));
}

/** Where to send a player to play a game. */
export function gameUrl(info: Pick<GameInfo, "id" | "devPort">, env: { dev: boolean }): string {
  return env.dev ? `http://localhost:${info.devPort}/` : `/${info.id}/`;
}

/** Where a game sends a player back to the arcade (it remembers which game they came from). */
export function arcadeUrl(fromGameId: string, env: { dev: boolean; arcadeDevPort?: number }): string {
  const query = `?from=${encodeURIComponent(fromGameId)}`;
  return env.dev ? `http://localhost:${env.arcadeDevPort ?? ARCADE_DEV_PORT}/${query}` : `/${query}`;
}

/** The game a player just came back from (from "?from=..."), or null. */
export function fromGameId(search: string): string | null {
  const id = new URLSearchParams(search).get("from");
  return id ? id : null;
}
