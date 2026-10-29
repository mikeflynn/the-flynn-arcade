// 🕹️ HOW FLYNN FAMILY FIGHTERS SHOWS UP IN THE FLYNN ARCADE
//
// The arcade reads this file to build this game's cabinet: the name on the
// marquee, the colors, the little picture on its screen, and the info at the
// bottom of the arcade screen.
//
// 🛠️ TRY THIS: change the cabinet colors, or redraw the picture on its screen
// (each letter is one pixel; up to 32 wide and 24 tall).

import type { GameInfo } from "@web-games/arcade";

export const arcadeInfo: GameInfo = {
  id: "flynn-family-fighters",
  title: "FLYNN FAMILY FIGHTERS",
  blurb: "Street-fighter style showdowns! Pick a Flynn, throw fireballs, and win the tournament!",
  players: { min: 1, max: 2, coop: false },
  colors: { primary: "#ff4040", secondary: "#ffe14a" },
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
};
