/**
 * @web-games/arcade: how a game joins The Flynn Arcade, and how the arcade
 * and the games link to each other.
 *
 * Each game adds `<game>/arcade.ts` exporting `arcadeInfo: GameInfo`.
 */

/** One step of the capture script playing a game: keys are KeyboardEvent codes ("ArrowRight", "Space"). */
export interface CaptureStep {
  /** Keys held down for the whole step. */
  hold?: string[];
  /** Keys tapped once at the start of the step. */
  press?: string[];
  /** How long the step lasts, in milliseconds. */
  ms: number;
}

/** How the arcade's capture script plays a game to record its screenshot and clip. */
export interface CapturePlan {
  /** Added to the game's address, e.g. "?level=1&mode=colin". */
  query?: string;
  /** How long to wait before recording starts (milliseconds). */
  warmupMs?: number;
  /** How long the clip is (milliseconds). */
  clipMs?: number;
  /** Key presses, repeated until the clip is done. */
  steps?: CaptureStep[];
}

export interface GameInfo {
  /** Must match the game's folder name (it's also the web address: /<id>/). */
  id: string;
  /** Shown on the game's poster panel and the info bar. */
  title: string;
  /** One sentence about the game, shown in the info bar. */
  blurb: string;
  /** Optional: a short line under the title on the poster (up to 40 letters). */
  tagline?: string;
  players: { min: number; max: number; coop: boolean };
  /** The game's dev server port (see the port registry in CLAUDE.md). */
  devPort: number;
  /** Optional: lower numbers come first on the poster. */
  order?: number;
  /** The little picture shown when the game has no screenshot: up to 32 x 24 letters. */
  screenArt: { colors: Record<string, string>; art: string[] };
  /** Optional: how the capture script plays this game to record its clip. */
  capture?: CapturePlan;
  /** @deprecated Games used to have cabinet colors. The poster ignores them; old files still work. */
  colors?: unknown;
}

export const TAGLINE_MAX = 40;

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
  if (typeof g.devPort !== "number" || !Number.isInteger(g.devPort)) return "devPort should be a whole number, like 8001";
  const art = g.screenArt?.art;
  if (!Array.isArray(art) || !g.screenArt?.colors) return "screenArt needs colors and art";
  if (art.length > SCREEN_ART_MAX.height || art.some((row) => typeof row !== "string" || row.length > SCREEN_ART_MAX.width)) {
    return `screenArt is bigger than the cabinet screen (${SCREEN_ART_MAX.width} x ${SCREEN_ART_MAX.height} at most)`;
  }
  return null;
}

const isStringList = (v: unknown) => v === undefined || (Array.isArray(v) && v.every((k) => typeof k === "string"));
const isPositive = (v: unknown) => v === undefined || (typeof v === "number" && Number.isFinite(v) && v > 0);

function captureOk(c: unknown): boolean {
  if (!c || typeof c !== "object") return false;
  const p = c as Record<string, unknown>;
  if (p.query !== undefined && typeof p.query !== "string") return false;
  if (!isPositive(p.warmupMs) || !isPositive(p.clipMs)) return false;
  if (p.steps === undefined) return true;
  return (
    Array.isArray(p.steps) &&
    p.steps.every((s: unknown) => {
      if (!s || typeof s !== "object") return false;
      const step = s as Record<string, unknown>;
      return typeof step.ms === "number" && step.ms > 0 && isStringList(step.hold) && isStringList(step.press);
    })
  );
}

/**
 * A copy of a game with only the fields the arcade uses. Old fields (like the
 * cabinet `colors` games used to have) are dropped quietly; a bad optional
 * field is dropped with a note, and the game still shows up.
 */
function cleaned(info: GameInfo, note: (message: string) => void): GameInfo {
  const { colors: _oldCabinetColors, tagline, capture, ...game } = info;
  const result: GameInfo = { ...game };
  if (tagline !== undefined) {
    const text = typeof tagline === "string" ? tagline.trim() : "";
    if (text.length > 0 && text.length <= TAGLINE_MAX) result.tagline = text;
    else note(`tagline should be a short sentence (up to ${TAGLINE_MAX} letters)`);
  }
  if (capture !== undefined) {
    if (captureOk(capture)) result.capture = capture;
    else note("capture should look like { query: \"?level=1\", steps: [{ hold: [\"ArrowRight\"], ms: 500 }] }");
  }
  return result;
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
    const game = cleaned(info as GameInfo, (message) => warn(`🕹️ ${folder}/arcade.ts: ${message}. Leaving it out.`));
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
