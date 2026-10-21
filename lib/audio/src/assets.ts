/** One thing we might load, and the places it could be (first match wins). */
export interface AssetCandidate {
  key: string;
  urls: string[];
}

export type UrlExists = (url: string) => Promise<boolean>;

/**
 * Checks which optional files (custom pictures, sounds, music) actually exist,
 * so the game only loads those. Missing files are simply left out.
 */
export async function findAssets(candidates: AssetCandidate[], exists: UrlExists): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  await Promise.all(
    candidates.map(async ({ key, urls }) => {
      for (const url of urls) {
        let ok = false;
        try {
          ok = await exists(url);
        } catch {
          ok = false;
        }
        if (ok) {
          found.set(key, url);
          return;
        }
      }
    }),
  );
  return found;
}

/**
 * Like findAssets, but keeps every address that exists, in order. Used for
 * sounds: if jump.mp3 turns out to be broken, the game can try jump.ogg.
 */
export async function findAllAssets(candidates: AssetCandidate[], exists: UrlExists): Promise<Map<string, string[]>> {
  const found = new Map<string, string[]>();
  await Promise.all(
    candidates.map(async ({ key, urls }) => {
      const checks = await Promise.all(urls.map((url) => exists(url).catch(() => false)));
      const present = urls.filter((_, i) => checks[i]);
      if (present.length > 0) found.set(key, present);
    }),
  );
  return found;
}

/**
 * After a loading round: for each file that didn't load (missing or broken),
 * the next address to try, plus the backups still left after that.
 */
export function nextAttempts(
  backups: ReadonlyMap<string, string[]>,
  isLoaded: (key: string) => boolean,
): { attempts: [string, string][]; remaining: Map<string, string[]> } {
  const attempts: [string, string][] = [];
  const remaining = new Map<string, string[]>();
  for (const [key, urls] of backups) {
    if (isLoaded(key) || urls.length === 0) continue;
    attempts.push([key, urls[0]]);
    remaining.set(key, urls.slice(1));
  }
  return { attempts, remaining };
}

/** Asks the web server whether a file is there, without downloading it. */
export function makeHttpExists(fetchFn: typeof fetch = (input, init) => fetch(input, init)): UrlExists {
  return async (url) => {
    try {
      const response = await fetchFn(url, { method: "HEAD" });
      // A server that answers every address with the web page would look like
      // a match. A web page is never a sound or a picture, so skip it.
      const type = response.headers.get("content-type") ?? "";
      return response.ok && !type.includes("text/html");
    } catch {
      return false;
    }
  };
}
