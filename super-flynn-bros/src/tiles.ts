// 🛠️ TILES: the blocks that levels are built from
//
// Each tile is 16 x 16 pixels. "mapChar" is the letter you type in a level
// map to place it. "solid: true" means heroes can stand on it and bump into it.
//
// Some tiles have extra drawings:
//   under  used when the same tile is right above (dirt under the sidewalk)
//   left   used on the left end of a row (the front of a car)
//   right  used on the right end of a row (the back of a car)
//
// 🛠️ TRY THIS: change the sidewalk color, or turn the trash bin blue
// (LA has green, blue, and black bins!).

import type { TileDef } from "./engine/types";

/** Flips a drawing left-to-right. */
const mirror = (rows: string[]): string[] => rows.map((row) => [...row].reverse().join(""));

const sidewalk: TileDef = {
  key: "sidewalk",
  name: "Sidewalk",
  mapChar: "#",
  solid: true,
  colors: { L: "#e2ddd0", C: "#c9c3b5", c: "#a49e90", D: "#8a5a32", d: "#6b4423" },
  art: [
    "LLLLLLLLLLLLLLLL",
    "CCCCCCCCCCCCCCCC",
    "CCCCCCCcCCCCCCCC",
    "CCCCCCCcCCCCCCCC",
    "CCCCCCCcCCCCCCCC",
    "CCCCCCCcCCCCCCCC",
    "cccccccccccccccc",
    "DDDDDDDDDDDDDDDD",
    "DDDdDDDDDDDdDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDDDdDDDDDDDdD",
    "DDDDDDDDDDDDDDDD",
    "DdDDDDDDDDdDDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDdDDDDDDDDdDD",
    "DDDDDDDDDDDDDDDD",
  ],
  under: [
    "DDDDDDDDDDDDDDDD",
    "DDDdDDDDDDDdDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDDDdDDDDDDDdD",
    "DDDDDDDDDDDDDDDD",
    "DdDDDDDDDDdDDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDdDDDDDDDDdDD",
    "DDDDDDDDDDDDDDDD",
    "DDDdDDDDDDDdDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDDDdDDDDDDDdD",
    "DDDDDDDDDDDDDDDD",
    "DdDDDDDDDDdDDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDdDDDDDDDDdDD",
  ],
};

const brick: TileDef = {
  key: "brick",
  name: "Brick Planter",
  mapChar: "=",
  solid: true,
  colors: { R: "#b5543a", M: "#d8c8b0" },
  art: [
    "MMMMMMMMMMMMMMMM",
    "RRRRRRRMRRRRRRRM",
    "RRRRRRRMRRRRRRRM",
    "RRRRRRRMRRRRRRRM",
    "MMMMMMMMMMMMMMMM",
    "RRRMRRRRRRRMRRRR",
    "RRRMRRRRRRRMRRRR",
    "RRRMRRRRRRRMRRRR",
    "MMMMMMMMMMMMMMMM",
    "RRRRRRRMRRRRRRRM",
    "RRRRRRRMRRRRRRRM",
    "RRRRRRRMRRRRRRRM",
    "MMMMMMMMMMMMMMMM",
    "RRRMRRRRRRRMRRRR",
    "RRRMRRRRRRRMRRRR",
    "RRRMRRRRRRRMRRRR",
  ],
};

const trashBin: TileDef = {
  key: "trashBin",
  name: "Trash Bin",
  mapChar: "B",
  solid: true,
  colors: { L: "#2e2e2e", G: "#3a7a4a", g: "#285a36", W: "#e8e8e8", K: "#1a1a1a" },
  art: [
    ".LLLLLLLLLLLLLL.",
    "LLLLLLLLLLLLLLLL",
    ".GGGGGGGGGGGGGG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGWWWWGGGgG.",
    ".GgGGGWWWWGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GGGGGGGGGGGGGG.",
    "..KK........KK..",
    "..KK........KK..",
  ],
};

const carFront = [
  "......ssssssssss",
  ".....sWWWWWWWsWW",
  "....sWWWWWWWWsWW",
  "...sWWWWWWWWWsWW",
  "..sSSSSSSSSSSSSS",
  ".sSSSSSSSSSSSSSS",
  "sSSSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSS",
  "ssssssssssssssss",
  "SSSSSSSSSSSSSSSS",
  "..KKKK..........",
  ".KKHHKK.........",
  ".KKHHKK.........",
  "..KKKK..........",
];

const car: TileDef = {
  key: "car",
  name: "Parked Car",
  mapChar: "c",
  solid: true,
  colors: { S: "#c0c6d0", s: "#8a909a", W: "#7ac0e8", K: "#222222", H: "#888888" },
  art: [
    "ssssssssssssssss",
    "WWWWWWsWWWWWWWWW",
    "WWWWWWsWWWWWWWWW",
    "WWWWWWsWWWWWWWWW",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "ssssssssssssssss",
    "SSSSSSSSSSSSSSSS",
    "................",
    "................",
    "................",
    "................",
  ],
  left: carFront,
  right: mirror(carFront),
};

const fence: TileDef = {
  key: "fence",
  name: "Picket Fence",
  mapChar: "F",
  solid: true,
  colors: { W: "#f2efe6", w: "#c8c2b0" },
  art: [
    ".W...W...W...W..",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWWWWWWWWWWWWWWW",
    "wwwwwwwwwwwwwwww",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWWWWWWWWWWWWWWW",
    "wwwwwwwwwwwwwwww",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
  ],
};

export const tiles: TileDef[] = [sidewalk, brick, trashBin, car, fence];

// The sign at the end of each level. The level's goalLabel is written on it.
export const goalArt = {
  colors: { G: "#2a7a3a", W: "#f2f2f2", P: "#8a8a8a" },
  art: [
    ".GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.",
    "GWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWG",
    ".GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
  ],
};
