import Phaser from "phaser";
import { fromGameId } from "@web-games/arcade";
import { audioCandidates, findAllAssets, makeHttpExists } from "@web-games/audio";
import { InputManager } from "@web-games/input";
import { arcadeControls, secondPadControls } from "./controls";
import { loadGames } from "./games";
import { musicTracks, soundEffects } from "./sounds";
import { loadArcadeSettings } from "./storage";
import { ArcadeScene, type ArcadeBoot } from "./scene/ArcadeScene";
import { HEIGHT, WIDTH } from "./scene/style";

// Coming back with the browser's Back button can show a frozen copy of the
// page (mid "GAME START!"). Reload it so the arcade is fresh.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

async function start(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const input = new InputManager(window);
  input.setBindings(1, arcadeControls);
  input.setBindings(2, secondPadControls);

  const boot: ArcadeBoot = {
    input,
    games: await loadGames(),
    audioFiles: await findAllAssets(audioCandidates(soundEffects, musicTracks), makeHttpExists()),
    fromId: fromGameId(window.location.search),
    muted: loadArcadeSettings().muted,
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: WIDTH,
    height: HEIGHT,
    pixelArt: true,
    backgroundColor: "#1b1464",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [ArcadeScene],
    callbacks: {
      preBoot: (g) => {
        g.registry.set("boot", boot);
      },
    },
  });
  game.events.on(Phaser.Core.Events.PRE_STEP, () => input.update());
  // ?debug=1 exposes the arcade in the browser console as `game`.
  if (params.has("debug")) (window as unknown as { game: Phaser.Game }).game = game;
}

void start();
