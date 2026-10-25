import Phaser from "phaser";
import { BootScene, type BootRequest } from "./scenes/BootScene";
import { FightScene } from "./scenes/FightScene";
import { PlaceholderScene } from "./scenes/PlaceholderScene";
import { ViewerScene } from "./scenes/ViewerScene";

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
const scenes = params.has("viewer") ? [ViewerScene] : request.fight ? [BootScene, FightScene] : [PlaceholderScene];

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
