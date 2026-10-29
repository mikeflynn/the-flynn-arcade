// 🕹️ HOW SUPER FLYNN BROS SHOWS UP IN THE FLYNN ARCADE
//
// The arcade reads this file to build this game's panel on the arcade
// poster: the title, the short tagline under it, the blurb in the info bar,
// and the little picture shown when the game has no screenshot yet.
//
// 🛠️ TRY THIS: change the tagline, or redraw the little picture (each letter
// is one pixel; up to 32 wide and 24 tall).

import type { GameInfo } from "@web-games/arcade";

export const arcadeInfo: GameInfo = {
  id: "super-flynn-bros",
  title: "SUPER FLYNN BROS",
  // The short line under the title on the arcade poster (up to 40 letters).
  tagline: "Dodge dogs, grab donuts!",
  blurb: "Help Colin and Ryan get to school, practice, and back home! Dodge dogs, grab donuts!",
  players: { min: 1, max: 2, coop: true },
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
  // How the arcade's capture script plays this game to record its clip
  // (npm run capture -w arcade -- super-flynn-bros). Keys are held or tapped,
  // step by step, over and over until the clip is done.
  capture: {
    query: "?level=1&mode=colin",
    warmupMs: 2500,
    clipMs: 7000,
    steps: [
      { hold: ["ArrowRight"], ms: 900 },
      { hold: ["ArrowRight"], press: ["Space"], ms: 700 },
      { hold: ["ArrowRight"], ms: 1200 },
      { press: ["Space"], ms: 600 },
      { hold: ["ArrowRight"], press: ["Space"], ms: 900 },
    ],
  },
};
