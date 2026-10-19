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
