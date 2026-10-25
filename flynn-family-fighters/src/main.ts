import Phaser from "phaser";
import { PlaceholderScene } from "./scenes/PlaceholderScene";
import { ViewerScene } from "./scenes/ViewerScene";

// The world is 960 x 540 units. Each scene zooms its camera to 0.5, so one
// unit is half a real pixel and fighters stay crisp.
const params = new URLSearchParams(window.location.search);

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  width: 480,
  height: 270,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#1a1c2c",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // ?viewer shows the fighter lineup. Everything else gets the placeholder.
  scene: [params.has("viewer") ? ViewerScene : PlaceholderScene],
});
