// 🛠️ HAZARDS: things to jump over or get out of the way of
//
// They're all friendly. You can't beat them, you just avoid them! Touching
// one costs a heart.
//
// Each hazard has:
//   mapChar   the letter that puts it in a level map (see levels/)
//   colors    what color each letter in the drawing is
//   frames    the drawing (more than one frame = it animates)
//   behavior  how it moves. Pick one:
//     "patrol"     walks back and forth, turns at walls and edges (uses speed)
//     "slowWalk"   walks slowly, turns at walls only (uses speed)
//     "rollAcross" zooms one way and leaves the screen (uses speed, direction)
//     "bounce"     hops along (uses speed, bounceHeight)
//     "chase"      runs at the nearest hero once they're close (uses speed, range)
//     "toggle"     stays put and switches on and off (uses onMs, offMs)
//
// 🛠️ TRY THIS: make your own hazard! Copy one of the blocks below, give it a
// new key and an unused mapChar (like "Q"), draw it, pick a behavior, then
// put that letter in a level map.

import type { HazardDef } from "./engine/types";

// Dogs face left (toward you). The game flips them when they walk right.
const dogFrames = [
  [
    "................",
    "..bb............",
    ".bBBb...........",
    "bBEBBb.........b",
    "NBBBBBC........b",
    ".TBBBBCBBBBBBBb.",
    "..BBBBBBBBBBBBb.",
    "...BBBBBBBBBBB..",
    "...BB.BB..BB.BB.",
    "...BB.BB..BB.BB.",
    "...bb.bb..bb.bb.",
    "................",
  ],
  [
    "................",
    "..bb............",
    ".bBBb...........",
    "bBEBBb..........",
    "NBBBBBC.........",
    ".TBBBBCBBBBBBBbb",
    "..BBBBBBBBBBBBb.",
    "...BBBBBBBBBBB..",
    "....BBBB..BBBB..",
    "...BB..BBBB..BB.",
    "...bb..bbbb..bb.",
    "................",
  ],
];

const dog: HazardDef = {
  key: "dog",
  name: "Dog",
  mapChar: "D",
  colors: { B: "#a0642d", b: "#6e4119", E: "#1d1d2b", N: "#1d1d2b", T: "#e8607a", C: "#d83a3a" },
  frames: dogFrames,
  frameMs: 200,
  behavior: "patrol",
  speed: 40,
  hitbox: { width: 14, height: 9 },
};

const chaseDog: HazardDef = {
  key: "chaseDog",
  name: "Chasing Dog",
  mapChar: "H",
  colors: { B: "#3a3a3a", b: "#1e1e1e", E: "#f2f2f2", N: "#f2f2f2", T: "#e8607a", C: "#3d7be0" },
  frames: dogFrames,
  frameMs: 120,
  behavior: "chase",
  speed: 75,
  range: 140,
  hitbox: { width: 14, height: 9 },
};

const neighbor: HazardDef = {
  key: "neighbor",
  name: "Slow Neighbor",
  mapChar: "N",
  colors: { H: "#d0d0d0", S: "#e0ac7e", E: "#1d1d2b", G: "#e07ab0", Y: "#f6d860", P: "#b8a77a", K: "#3a2a1a" },
  frames: [
    [
      "......HHHH......",
      ".....HHHHHH.....",
      ".....SSSSSH.....",
      "....SESSSSH.....",
      "....SSSSSSH.....",
      ".....SSSSS......",
      "......SSS.......",
      "..S..GGGGGG.....",
      "..SGGGYGGGGG....",
      "...GGGGGGYGG....",
      "....GYGGGGGGG...",
      "....GGGGYGGSS...",
      "....GGGGGGG.....",
      "....PPPPPPP.....",
      "....PPPPPPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "...KKKK.KKK.....",
      "...KKKK.KKK.....",
    ],
    [
      "......HHHH......",
      ".....HHHHHH.....",
      ".....SSSSSH.....",
      "....SESSSSH.....",
      "....SSSSSSH.....",
      ".....SSSSS......",
      "......SSS.......",
      "......GGGGGG....",
      "....GGGYGGGGG...",
      "...SGGGGGGYGG...",
      "...SGYGGGGGGG...",
      "....GGGGYGGSS...",
      "....GGGGGGG.....",
      "....PPPPPPP.....",
      "....PPPPPPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "...KKKK.KKK.....",
      "...KKKK.KKK.....",
    ],
  ],
  frameMs: 500,
  behavior: "slowWalk",
  speed: 15,
  hitbox: { width: 10, height: 20 },
};

const skateboarder: HazardDef = {
  key: "skateboarder",
  name: "Skateboarder",
  mapChar: "K",
  colors: { C: "#d83a3a", S: "#c68a5a", E: "#1d1d2b", T: "#f0a030", P: "#3a4466", K: "#2b2b2b", D: "#6e4119", w: "#f2f2f2" },
  frames: [
    [
      "....CCCCC.......",
      "..CCCCCCCC......",
      "....SSSSS.......",
      "...SESSSS.......",
      "...SSSSSS.......",
      "....SSSS........",
      "...TTTTTTT......",
      "..STTTTTTTS.....",
      ".S.TTTTTTT.S....",
      "...TTTTTTT......",
      "...PPPPPPP......",
      "...PPP.PPP......",
      "..PPP...PPP.....",
      "..PPP...PPP.....",
      ".PPP.....PPP....",
      ".KKK.....KKK....",
      "DDDDDDDDDDDDD...",
      ".ww.......ww....",
    ],
  ],
  frameMs: 1000,
  behavior: "rollAcross",
  speed: 110,
  direction: -1,
  hitbox: { width: 12, height: 16 },
};

const sprinkler: HazardDef = {
  key: "sprinkler",
  name: "Sprinkler",
  mapChar: "S",
  colors: { G: "#4a4a4a", g: "#2e2e2e", W: "#bfe8ff", w: "#7cc8f0" },
  frames: [
    // off
    [
      "................",
      "................",
      "................",
      "......GGGG......",
      ".....gGGGGg.....",
      "....gggggggg....",
    ],
    // on
    [
      "................",
      ".......ww.......",
      ".....wWWWWw.....",
      "....wW.WW.Ww....",
      "...wW..WW..Ww...",
      "...W...WW...W...",
      "..wW...WW...Ww..",
      "..W....WW....W..",
      ".wW....WW....Ww.",
      ".W.....WW.....W.",
      ".W.....WW.....W.",
      "wW.....WW.....Ww",
      "W......WW......W",
      "W......WW......W",
      "W......WW......W",
      "w......WW......w",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      "......wWWw......",
      "......GGGG......",
      ".....gGGGGg.....",
      "....gggggggg....",
    ],
  ],
  frameMs: 1000,
  behavior: "toggle",
  onMs: 1500,
  offMs: 1500,
  hitbox: { width: 12, height: 28 },
};

const baseball: HazardDef = {
  key: "baseball",
  name: "Loose Baseball",
  mapChar: "L",
  colors: { W: "#f2f2f2", R: "#d83a3a" },
  frames: [
    [
      "..WWWW..",
      ".WRWWRW.",
      "WRWWWWRW",
      "WWWWWWWW",
      "WWWWWWWW",
      "WRWWWWRW",
      ".WRWWRW.",
      "..WWWW..",
    ],
  ],
  frameMs: 1000,
  behavior: "bounce",
  speed: 40,
  direction: -1,
  bounceHeight: 40,
  hitbox: { width: 7, height: 7 },
};

const mower: HazardDef = {
  key: "mower",
  name: "Lawn Mower",
  mapChar: "M",
  colors: { R: "#d83a3a", r: "#9e2f27", K: "#2b2b2b", G: "#58b04a", H: "#8a8a8a" },
  frames: [
    [
      "...........H....",
      "............H...",
      ".............H..",
      "..............H.",
      "...RRRRRRRRRRRH.",
      "..RRRRRRRRRRRRR.",
      ".RRRrrrrrrrrRRR.",
      ".RRRRRRRRRRRRRR.",
      "GrrrrrrrrrrrrrrG",
      ".KKK.......KKK..",
      "KKKKK.....KKKKK.",
      ".KKK.......KKK..",
    ],
    [
      "...........H....",
      "............H...",
      ".............H..",
      "..............H.",
      "...RRRRRRRRRRRH.",
      "..RRRRRRRRRRRRR.",
      ".RRRrrrrrrrrRRR.",
      ".RRRRRRRRRRRRRR.",
      ".rrrrrrrrrrrrrr.",
      "GKKK.......KKKG.",
      "KKKKK.....KKKKK.",
      ".KKK.......KKK..",
    ],
  ],
  frameMs: 100,
  behavior: "patrol",
  speed: 55,
  hitbox: { width: 14, height: 9 },
};

export const hazards: HazardDef[] = [dog, chaseDog, neighbor, skateboarder, sprinkler, baseball, mower];
