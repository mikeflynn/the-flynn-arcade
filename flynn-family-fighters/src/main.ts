import Phaser from "phaser";
import { AfterMatchScene } from "./scenes/AfterMatchScene";
import { BootScene, type BootRequest } from "./scenes/BootScene";
import { ChampScene } from "./scenes/ChampScene";
import { FightScene } from "./scenes/FightScene";
import { HelpScene } from "./scenes/HelpScene";
import { SelectScene } from "./scenes/SelectScene";
import { TitleScene } from "./scenes/TitleScene";
import { VersusScene } from "./scenes/VersusScene";
import { ViewerScene } from "./scenes/ViewerScene";

// Coming back with the browser's Back button can show a frozen copy of the
// page. Reload it so the game starts fresh.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

// The world is 960 x 540 units. Each scene zooms its camera to 0.5, so one
// unit is half a real pixel and fighters stay crisp.
const params = new URLSearchParams(window.location.search);

/**
 * For testing:
 *   ?viewer                    the fighter lineup
 *   ?fight=colin,ryan          you (Colin) against the computer (Ryan)
 *   ?fight=colin,ryan&cpu2     the computer plays both sides, so you can just watch
 *   &stage=backyard            pick the stage (otherwise player 1's home stage)
 */
function readRequest(): BootRequest {
  const fight = params.get("fight");
  if (fight === null) return {};
  const [p1 = "", p2 = ""] = fight.split(",").map((s) => s.trim());
  const stage = params.get("stage") ?? undefined;
  return { fight: { p1, p2, cpu: [params.has("cpu2"), true], ...(stage && { stage }) } };
}

const request = readRequest();
// Boot runs first. The after-match menu and help come after the fight so they draw on top.
const scenes = params.has("viewer")
  ? [ViewerScene]
  : [BootScene, TitleScene, SelectScene, VersusScene, FightScene, AfterMatchScene, HelpScene, ChampScene];

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  width: 480,
  height: 270,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#1a1c2c",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: scenes,
  callbacks: {
    preBoot: (game) => {
      game.registry.set("boot", request);
    },
  },
});
