import { fromGameId } from "@web-games/arcade";
import { audioCandidates, findAllAssets, GameAudio, htmlAudioBackend, makeHttpExists } from "@web-games/audio";
import { InputManager } from "@web-games/input";
import { arcadeControls, secondPadControls } from "./controls";
import { ArcadeController } from "./controller";
import { buildPoster } from "./poster/poster";
import { loadGames } from "./games";
import { mediaByGame } from "./media";
import { buildSlots, initialIndex } from "./selection";
import { settings } from "./settings";
import { musicTracks, soundEffects } from "./sounds";
import { loadArcadeSettings, saveArcadeSettings } from "./storage";

// Coming back with the browser's Back button can show a frozen copy of the
// page (mid "GAME START!"). Reload it so the arcade is fresh.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

// Every game's optional screenshot and clip, found automatically.
const mediaFiles = import.meta.glob<string>("../../*/arcade-media/*.{png,mp4}", { eager: true, query: "?url", import: "default" });

async function start(): Promise<void> {
  const [games, audioFiles] = await Promise.all([
    loadGames(),
    findAllAssets(audioCandidates(soundEffects, musicTracks), makeHttpExists()),
  ]);
  const slots = buildSlots(games, settings.comingSoonPanels);
  const view = buildPoster(document.getElementById("poster")!, {
    slots,
    media: mediaByGame(mediaFiles),
    gameCount: games.length,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });

  const input = new InputManager(window);
  input.setBindings(1, arcadeControls);
  input.setBindings(2, secondPadControls);
  const audio = new GameAudio(htmlAudioBackend(audioFiles), {
    sfx: soundEffects,
    music: musicTracks,
    available: new Set(audioFiles.keys()),
    sfxVolume: settings.sfxVolume,
    musicVolume: settings.musicVolume,
    muted: loadArcadeSettings().muted,
  });
  audio.reportMissing();

  const controller = new ArcadeController({
    view,
    slots,
    input,
    audio,
    startIndex: initialIndex(slots, fromGameId(window.location.search)),
    now: performance.now(),
    dev: import.meta.env.DEV,
    go: (url) => window.location.assign(url),
    saveMuted: (muted) => saveArcadeSettings({ muted }),
  });
  const loop = (time: number) => {
    controller.frame(time);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

void start();
