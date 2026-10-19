// 🛠️ ITEMS: things to grab
//
//   score   points for grabbing it
//   hearts  hearts it gives back (you can't go past maxHearts in settings.ts)
//   sound   which sound plays (from sounds.ts)
//
// 🛠️ TRY THIS: make donuts worth 100 points, or make the burger give back 3 hearts.

import type { ItemDef } from "./engine/types";

const donut: ItemDef = {
  key: "donut",
  name: "Donut",
  mapChar: "o",
  colors: { D: "#e0a35a", F: "#f070b0", s: "#f6f6f6", Y: "#f6d860", B: "#5ab0f0" },
  frames: [
    [
      "...DDDD...",
      ".DFFFFFFD.",
      "DFFsFFBFFD",
      "DFYF..FFsD",
      "DFF....FFD",
      "DFB....YFD",
      "DFsF..FBFD",
      "DFFFsFFFFD",
      ".DDFFFFDD.",
      "...DDDD...",
    ],
  ],
  score: 10,
  hearts: 0,
  sound: "donut",
};

// A double-double with a red and yellow wrapper.
const burger: ItemDef = {
  key: "burger",
  name: "Burger",
  mapChar: "b",
  colors: {
    B: "#e0a040", // bun
    s: "#fff4d0", // sesame seeds
    L: "#58b04a", // lettuce
    T: "#e03a2a", // tomato
    M: "#6e3a1a", // patty
    C: "#f6d020", // cheese
    R: "#d83a3a", // wrapper red
    Y: "#f6d020", // wrapper yellow
  },
  frames: [
    [
      "...BBBBBB...",
      ".BBsBBBBsBB.",
      "BBBBBBsBBBBB",
      "LLLLLLLLLLLL",
      "TTTTTTTTTTTT",
      "MMMMMMMMMMMM",
      "CCCCCCCCCCCC",
      "MMMMMMMMMMMM",
      "CCCCCCCCCCCC",
      "RYYRRYYRRYYR",
      "RYYRRYYRRYYR",
      ".RRRRRRRRRR.",
    ],
  ],
  score: 50,
  hearts: 1,
  sound: "burger",
};

export const items: ItemDef[] = [donut, burger];

// The hearts at the top of the screen: frame 1 is full, frame 2 is empty.
export const heartArt = {
  colors: { R: "#e8334a", W: "#ffd0d8", K: "#5a5a6a", k: "#2e2e3a" },
  frames: [
    [
      ".RR..RR.",
      "RWRRRRRR",
      "RRRRRRRR",
      "RRRRRRRR",
      ".RRRRRR.",
      "..RRRR..",
      "...RR...",
    ],
    [
      ".KK..KK.",
      "KkkKKkkK",
      "KkkkkkkK",
      "KkkkkkkK",
      ".KkkkkK.",
      "..KkkK..",
      "...KK...",
    ],
  ],
};
