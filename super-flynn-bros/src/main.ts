import Phaser from "phaser";
import { InputManager } from "@web-games/input";
import { findAllAssets, findAssets, makeHttpExists } from "./engine/assets";
import { audioCandidates } from "./engine/audio";
import { spriteOverrideCandidates } from "./engine/catalog";
import { loadProgress } from "./engine/progress";
import { globalStep, type GameMode } from "./engine/services";
import { levels } from "./levels";
import { settings } from "./settings";
import { musicTracks, soundEffects } from "./sounds";
import { BootScene, type BootData } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { PlayScene } from "./scenes/PlayScene";
import { HudScene } from "./scenes/HudScene";
import { PauseScene } from "./scenes/PauseScene";
import { LevelCompleteScene } from "./scenes/LevelCompleteScene";
import { EndingScene } from "./scenes/EndingScene";

/** ?level=2&mode=coop jumps straight into a level. Handy for testing a level you're building! */
function readQuickStart(params: URLSearchParams): BootData["quickStart"] {
  const level = Number(params.get("level"));
  if (!Number.isInteger(level) || level < 1 || level > levels.length) return null;
  const modes: GameMode[] = ["colin", "ryan", "coop"];
  const mode = params.get("mode") as GameMode | null;
  return { levelIndex: level - 1, mode: mode && modes.includes(mode) ? mode : "colin" };
}

async function start(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const exists = makeHttpExists();
  const [overrides, audioFiles] = await Promise.all([
    findAssets(spriteOverrideCandidates(), exists),
    findAllAssets(audioCandidates(soundEffects, musicTracks), exists),
  ]);
  const boot: BootData = {
    input: new InputManager(window),
    progress: loadProgress(),
    overrides,
    audioFiles,
    quickStart: readQuickStart(params),
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 320,
    height: 176,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#1a1c2c",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: "arcade",
      // ?debug=1 draws every hitbox
      arcade: { gravity: { x: 0, y: settings.gravity }, debug: params.has("debug") },
    },
    scene: [BootScene, TitleScene, PlayScene, HudScene, PauseScene, LevelCompleteScene, EndingScene],
    callbacks: {
      preBoot: (g) => {
        g.registry.set("boot", boot);
      },
    },
  });
  game.events.on(Phaser.Core.Events.PRE_STEP, globalStep);
  // ?debug=1 also exposes the game in the browser console as `game`, for poking around.
  if (params.has("debug")) (window as unknown as { game: Phaser.Game }).game = game;
}

void start();
