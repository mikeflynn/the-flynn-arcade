// 🕹️ HOW SUPER FLYNN BROS SHOWS UP IN THE FLYNN ARCADE
//
// The arcade reads this file to build this game's cabinet: the name on the
// marquee, the colors, the little picture on its screen, and the info at the
// bottom of the arcade screen.
//
// 🛠️ TRY THIS: change the cabinet colors, or redraw the picture on its screen
// (each letter is one pixel; up to 32 wide and 24 tall).

import type { GameInfo } from "@web-games/arcade";

export const arcadeInfo: GameInfo = {
  id: "super-flynn-bros",
  title: "SUPER FLYNN BROS",
  blurb: "Help Colin and Ryan get to school, practice, and back home! Dodge dogs, grab donuts!",
  players: { min: 1, max: 2, coop: true },
  colors: { primary: "#5ab0f0", secondary: "#f6d860" },
  devPort: 8001,
  order: 1,
  screenArt: {
    colors: {
      S: "#6cc4ff", // sky
      Y: "#fff4b0", // sun
      G: "#c9c3b5", // sidewalk
      D: "#8a5a32", // dirt
      H: "#f6d860", // Colin's hair
      h: "#7a4a2a", // Ryan's hair
      F: "#f3c294", // skin
      K: "#1d1d2b", // eyes
      B: "#3d7be0", // Colin's shirt
      g: "#3fae5a", // Ryan's shirt
      P: "#3a4466", // pants and shorts
      W: "#f2f2f2", // shoes
    },
    art: [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSYYSSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSYYYYSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSYYYYYYSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSYYYYSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSYYSSSS",
      "SSSSSSSSSSHHHSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSHHHHHSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSHFFFHSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSFKFKFSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSFFFFFSSSSShhhSSSSSSSSSS",
      "SSSSSSSSSSFFFSSSSShhhhhSSSSSSSSS",
      "SSSSSSSSSBBBBBSSSShFFFhSSSSSSSSS",
      "SSSSSSSSBBBBBBBSSSFKFKFSSSSSSSSS",
      "SSSSSSSSFBBBBBFSSSFFFFFSSSSSSSSS",
      "SSSSSSSSFBBBBBFSSSgggggSSSSSSSSS",
      "SSSSSSSSSBBBBBSSSFgggggFSSSSSSSS",
      "SSSSSSSSSPPSPPSSSSgggggSSSSSSSSS",
      "SSSSSSSSSPPSPPSSSSPPSPPSSSSSSSSS",
      "SSSSSSSSSPPSPPSSSSFFSFFSSSSSSSSS",
      "SSSSSSSSSWWSWWSSSSWWSWWSSSSSSSSS",
      "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
      "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
      "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
    ],
  },
};
