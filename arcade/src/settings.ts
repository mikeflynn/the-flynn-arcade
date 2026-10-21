// 🛠️ THE FLYNN ARCADE SETTINGS
//
// Change these, save, and the arcade reloads with your change.
// Colors are "#rrggbb" codes (search "hex color picker" to find any color).

import { clampSettings } from "@web-games/settings";
import { settingLimits } from "./limits";

// The words in the big logo at the top.
export const logoText = "THE FLYNN ARCADE";

export const colors = {
  // The giant spinning sunburst behind everything (two colors that take turns).
  sunburst: ["#2a5cff", "#8a2be2"],
  // The streaks that zoom across the top and bottom.
  speedLines: ["#ff8a00", "#ffd200"],
  sparkle: "#ffffff",
  // The floor the cabinets stand on, and its glowing lines.
  floor: "#1b1464",
  floorLines: "#ff2bd6",
  // The logo's colors, top to bottom.
  logo: ["#fff35c", "#ff9d00", "#ff2a2a"],
  // "COMING SOON" cabinets.
  comingSoon: { primary: "#9aa3b5", secondary: "#d6dbe6" },
  // The selected cabinet's glowing outline.
  highlight: "#fff35c",
  // The "1P" and "2P" tags.
  player1: "#e8334a",
  player2: "#2a5cff",
};

export const mySettings = {
  // How many seconds the sunburst takes to spin all the way around. Try 10 (fast!) to 300.
  sunburstSecondsPerTurn: 60,
  // How fast the speed lines zoom, in pixels per second. Try 10 to 300.
  speedLineSpeed: 60,
  // How often a sparkle pops up, in milliseconds. Try 100 (lots!) to 3000.
  sparkleEveryMs: 500,
  // 🛠️ TRY THIS: how long (in milliseconds) the arcade waits with nobody
  // pressing anything before it starts showing off the games by itself.
  attractDelayMs: 30000,
  // In show-off mode, how long it stays on each cabinet (milliseconds).
  attractStepMs: 2500,
  // How many "COMING SOON" cabinets to show after the real games.
  comingSoonCabinets: 2,
  // How fast the game description types out, in letters per second.
  typeLettersPerSecond: 40,
  // Music volume: 0 = off, 1 = loudest.
  musicVolume: 0.5,
  // Sound effects volume: 0 = off, 1 = loudest.
  sfxVolume: 0.7,
};

export const settings = clampSettings(mySettings, settingLimits);
