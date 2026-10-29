// 🛠️ THE FLYNN ARCADE SETTINGS
//
// The arcade's front page is a poster. Change these, save, and the poster
// reloads with your change.
// Colors are "#rrggbb" codes (search "hex color picker" to find any color).

import { clampSettings } from "@web-games/settings";
import { settingLimits } from "./limits";

// The giant words at the top of the poster, one line each.
// 🛠️ TRY THIS: put your own name up there, like ["MAYA'S", "ARCADE"]!
export const logoLines = ["FLYNN", "ARCADE"];

// The words that scroll across the top strip. "{games}" turns into how many
// games there are, like "2 GAMES".
export const tickerTop = ["INSERT COIN", "{games} ON THE FLOOR", "PRESS START", "FREE PLAY", "THE FLYNN ARCADE"];

// The words that scroll across the bottom strip (how to play).
export const tickerBottom = ["← → CHOOSE", "ENTER TO PLAY", "M FOR SOUND"];

// The poster is just two colors, so the games' pictures pop out.
// 🛠️ TRY THIS: a navy background ("#101a3a") with white ink ("#ffffff").
export const colors = {
  // Behind everything.
  background: "#18171b",
  // The letters and the thin outlines.
  ink: "#efe6cf",
  // The glow around the game you picked.
  highlight: "#ffd23b",
};

export const mySettings = {
  // How many seconds the scrolling strips take to go around once. Try 5 (zoom!) to 120.
  tickerSecondsPerLoop: 22,
  // 🛠️ TRY THIS: how long (in milliseconds) the arcade waits with nobody
  // pressing anything before it starts showing off the games by itself.
  attractDelayMs: 30000,
  // In show-off mode, how long it stays on each game (milliseconds).
  attractStepMs: 6000,
  // How many "COMING SOON" panels to show after the real games. Try 0 to 5.
  comingSoonPanels: 1,
  // How fast the game description types out, in letters per second.
  typeLettersPerSecond: 40,
  // Music volume: 0 = off, 1 = loudest.
  musicVolume: 0.5,
  // Sound effects volume: 0 = off, 1 = loudest.
  sfxVolume: 0.7,
  // Faint TV lines over the whole poster: true or false.
  showScanlines: true,
};

export const settings = clampSettings(mySettings, settingLimits);
