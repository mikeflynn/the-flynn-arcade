import { fromGameId } from "@web-games/arcade";
import { buildPoster } from "./poster/poster";
import { loadGames } from "./games";
import { mediaByGame } from "./media";
import { buildSlots, initialIndex } from "./selection";
import { settings } from "./settings";

// Coming back with the browser's Back button can show a frozen copy of the
// page (mid "GAME START!"). Reload it so the arcade is fresh.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

// Every game's optional screenshot and clip, found automatically.
const mediaFiles = import.meta.glob<string>("../../*/arcade-media/*.{png,mp4}", { eager: true, query: "?url", import: "default" });

async function start(): Promise<void> {
  const games = await loadGames();
  const slots = buildSlots(games, settings.comingSoonPanels);
  const view = buildPoster(document.getElementById("poster")!, {
    slots,
    media: mediaByGame(mediaFiles),
    gameCount: games.length,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
  view.select(initialIndex(slots, fromGameId(window.location.search)));
}

void start();
