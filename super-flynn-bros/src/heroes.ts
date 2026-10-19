// 🛠️ THE HEROES: Colin and Ryan
//
// Each hero is drawn with letters. Every letter is one pixel, and "colors"
// says what color each letter is. A "." is see-through.
//
// 🛠️ TRY THIS: make a hero look like YOU!
//   - Change "H" in colors to your hair color (search "hex color picker").
//   - Change "T" to your favorite shirt color.
//   - Redraw the rows to change the shape. Keep every row the same length!
//   - Or draw a picture and save it as public/assets/colin.png (or ryan.png).
//     It replaces the drawing below. See the README for sizes.
//
// runSpeed: how fast they run. jumpPower: how high they jump.

import type { HeroDef } from "./engine/types";

// Colin: older, taller, blonde. Jumps a little higher.
const colinHead = [
  "......HHHHH.....",
  "....hHHHHHHH....",
  "...hHHHHHHHHH...",
  "...hHHHHHHHHHH..",
  "...hHHHSSSSSH...",
  "...hHHSSSSESS...",
  "...hHHSSSSESS...",
  "....hHSSSSSSSs..",
  ".....SSSSSSS....",
  "......sSSs......",
];
const colinBody = [
  "....rRRTTTTT....",
  "...rRRRTTTTTT...",
  "...rRRRTTTTTT...",
  "...rRRRTTtTTT...",
  "...rRRRTTtTTT...",
  "...rRRRTTtTTT...",
  "...rRRRTTtTTT...",
  "....rRRTTSSTT...",
  "....TTTTTTTTT...",
  "....PPPPPPPP....",
];

export const colin: HeroDef = {
  key: "colin",
  name: "Colin",
  colors: {
    H: "#f6d860", // hair (blonde)
    h: "#d9a93a", // hair shadow
    S: "#f3c294", // skin
    s: "#d89b6a", // skin shadow
    E: "#1d1d2b", // eye
    T: "#3d7be0", // shirt
    t: "#2a57a8", // shirt shadow (arm)
    R: "#d84a3c", // backpack
    r: "#9e2f27", // backpack shadow
    P: "#3a4466", // pants
    W: "#f2f2f2", // shoes
    K: "#2b2b2b", // shoe soles
  },
  frames: {
    idle: [
      ...colinHead,
      ...colinBody,
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....WWW..WWWW...",
      "....KKK..KKKK...",
    ],
    walk1: [
      ...colinHead,
      ...colinBody,
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      "...PPPP.PPPP....",
      "...PPP...PPP....",
      "..PPP.....PPP...",
      "..PPP.....PPP...",
      "..PPP......PPP..",
      ".PPP.......PPP..",
      ".PPP.......PPP..",
      ".PPP.......PPP..",
      "WWWW.......WWWW.",
      "KKKK.......KKKK.",
    ],
    walk2: [
      ...colinHead,
      ...colinBody,
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      ".....PPPPPP.....",
      ".....PPPPPP.....",
      ".....PPPPP......",
      ".....PPPPP......",
      ".....PPPPP......",
      ".....PPPPPP.....",
      ".....PPP.PPP....",
      ".....PPP.PPP....",
      ".....WWW.WWWW...",
      ".....KKK.KKKK...",
    ],
    jump: [
      ...colinHead,
      ...colinBody,
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      "....PPPP.PPPP...",
      "....PPP...PPPP..",
      "...PPP.....PPP..",
      "...PPP....WWWW..",
      "...PPP....KKKK..",
      "..WWWW..........",
      "..KKKK..........",
      "................",
      "................",
      "................",
    ],
  },
  runSpeed: 135,
  jumpPower: 360,
  hitbox: { width: 10, height: 30 },
};

// Ryan: shorter, brown hair. Runs a little faster.
const ryanHead = [
  "......HHHH......",
  "....hHHHHHH.....",
  "...hHHHHHHHH....",
  "...hHHHHHHHHH...",
  "...hHHSSSSSH....",
  "...hHSSSSESS....",
  "...hHSSSSESS....",
  "....hSSSSSSSs...",
  ".....SSSSSS.....",
];
const ryanBody = [
  "....rRRTTTT.....",
  "...rRRRTTTTT....",
  "...rRRRTTtTT....",
  "...rRRRTTtTT....",
  "...rRRRTTtTT....",
  "....rRRTSSTT....",
  "....PPPPPPPP....",
];

export const ryan: HeroDef = {
  key: "ryan",
  name: "Ryan",
  colors: {
    H: "#7a4a2a", // hair (brown)
    h: "#563219", // hair shadow
    S: "#f3c294", // skin
    s: "#d89b6a", // skin shadow
    E: "#1d1d2b", // eye
    T: "#3fae5a", // shirt
    t: "#2b7f40", // shirt shadow (arm)
    R: "#f0a030", // backpack
    r: "#b8741c", // backpack shadow
    P: "#4a5a8a", // shorts
    W: "#f2f2f2", // socks and shoes
    K: "#2b2b2b", // shoe soles
  },
  frames: {
    idle: [
      ...ryanHead,
      ...ryanBody,
      "....PPPPPPPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....SSS..SSS....",
      "....SSS..SSS....",
      "....WWW..WWW....",
      "....WWW..WWWW...",
      "....KKK..KKKK...",
    ],
    walk1: [
      ...ryanHead,
      ...ryanBody,
      "....PPPPPPPP....",
      "...PPP...PPP....",
      "..PPP.....PPP...",
      "..SSS......SSS..",
      ".SSS.......SSS..",
      ".WWW........WWW.",
      "WWWW........WWWW",
      "KKKK........KKKK",
    ],
    walk2: [
      ...ryanHead,
      ...ryanBody,
      "....PPPPPPPP....",
      ".....PPPPPP.....",
      ".....PPPPP......",
      ".....SSSSS......",
      ".....SSSSS......",
      ".....SSS.SSS....",
      ".....WWW.WWWW...",
      ".....KKK.KKKK...",
    ],
    jump: [
      ...ryanHead,
      ...ryanBody,
      "....PPPPPPPP....",
      "....PPP..PPPP...",
      "...PPP....SSSS..",
      "...SSS....WWWW..",
      "..SSS.....KKKK..",
      "..WWWW..........",
      "..KKKK..........",
      "................",
    ],
  },
  runSpeed: 150,
  jumpPower: 330,
  hitbox: { width: 10, height: 22 },
};

export const heroes = { colin, ryan };
