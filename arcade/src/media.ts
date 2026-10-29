/** A game's optional poster pictures (web addresses), from <game>/arcade-media/. */
export interface GameMedia {
  screenshot?: string;
  clip?: string;
}

const FILES: Record<string, keyof GameMedia> = { "screenshot.png": "screenshot", "clip.mp4": "clip" };

/**
 * Sorts the files Vite found ("../../<game>/arcade-media/<file>" → address)
 * into one GameMedia per game. Other files are ignored.
 */
export function mediaByGame(urls: Record<string, string>): Map<string, GameMedia> {
  const media = new Map<string, GameMedia>();
  for (const [path, url] of Object.entries(urls)) {
    const parts = path.split("/");
    const kind = FILES[parts[parts.length - 1] ?? ""];
    const game = parts[parts.length - 3];
    if (!kind || !game || parts[parts.length - 2] !== "arcade-media") continue;
    media.set(game, { ...media.get(game), [kind]: url });
  }
  return media;
}

export type Picture = "clip" | "screenshot" | "art";

/**
 * What a panel shows: the clip only for the selected game (and never when the
 * browser asks for less motion, or after the clip failed), then the
 * screenshot, then the little picture from arcade.ts.
 */
export function pictureFor(
  media: GameMedia | undefined,
  o: { selected: boolean; reducedMotion: boolean; clipFailed: boolean },
): Picture {
  if (media?.clip && o.selected && !o.reducedMotion && !o.clipFailed) return "clip";
  return media?.screenshot ? "screenshot" : "art";
}
