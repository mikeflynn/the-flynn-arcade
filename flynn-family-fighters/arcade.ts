// 🕹️ HOW FLYNN FAMILY FIGHTERS SHOWS UP IN THE FLYNN ARCADE
//
// The arcade reads this file to build this game's panel on the arcade
// poster: the title, the short tagline under it, the blurb in the info bar,
// and the little picture shown when the game has no screenshot yet.
//
// 🛠️ TRY THIS: change the tagline, or redraw the little picture (each letter
// is one pixel; up to 32 wide and 24 tall).

import type { GameInfo } from "@web-games/arcade";

export const arcadeInfo: GameInfo = {
  id: "flynn-family-fighters",
  title: "FLYNN FAMILY FIGHTERS",
  // The short line under the title on the arcade poster (up to 40 letters).
  tagline: "Pick a Flynn, throw fireballs!",
  blurb: "Street-fighter style showdowns! Pick a Flynn, throw fireballs, and win the tournament!",
  players: { min: 1, max: 2, coop: false },
  devPort: 8002,
  order: 2,
  screenArt: {
    colors: {
      S: "#4a2378", // sky, top
      s: "#ff8c52", // sky, near the horizon
      Y: "#ffd27a", // setting sun
      R: "#c4553a", // the track
      L: "#fff2e0", // lane lines
      H: "#f7d35c", // Colin's hair
      h: "#7a4a2a", // Ryan's hair
      F: "#f1c08f", // skin
      K: "#1d1d2b", // eyes
      B: "#2f6fd6", // Colin's gi
      g: "#3fae5a", // Ryan's tank top
      P: "#3a4466", // Ryan's shorts
      W: "#f2f2f2", // shoes and headband
      O: "#ff7ad9", // fireball
    },
    art: [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "ssssssssssssssssssssssssssssssss",
      "ssssssssssssssYYYYssssssssssssss",
      "ssssssssssssYYYYYYYYssssssssssss",
      "ssssssssssssYYYYYYYYssssssssssss",
      "ssssssssssssssYYYYssssssssssssss",
      "ssssssssssssssssssssssssssssssss",
      "sssssHHHHssssssssssssssshhhhssss",
      "sssssHHHHHsssssssssssshhhhhhssss",
      "sssssFFFFFssssssssssssFFFFFhssss",
      "sssssFKFFFsssssssssssFFFFKFsssss",
      "ssssWWWWWWsssssssssssssFFFFFssss",
      "sssssBBBBBFFFsssOOsssssggggFFsss",
      "sssssBBBBBBFFOOOOOOsssgggggsssss",
      "sssssBBBBBssssOOsssssFgggggsssss",
      "ssssssBBBBsssssssssssssPPPPsssss",
      "ssssssBBBBssssssssssssPPssPPssss",
      "ssssssWWsWWssssssssssssWWsWWssss",
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
      "RLLLLLLLRRRRRRRRRLLLLLLLRRRRRRRR",
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
    ],
  },
  // How the arcade's capture script plays this game to record its clip
  // (npm run capture -w arcade -- flynn-family-fighters). The computer plays
  // both sides, so nobody has to press anything.
  capture: { query: "?fight=colin,ryan&cpu2", warmupMs: 6000, clipMs: 7000 },
};
