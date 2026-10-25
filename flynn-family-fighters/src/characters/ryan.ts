// 🥊 RYAN — edit anything here and save to see it change!
// (Open http://localhost:8002/?viewer to see your fighter up close.)
import type { Fighter } from "../fighter";

export const fighter: Fighter = {
  id: "ryan", // the file's name; the game fills this in for you
  name: "RYAN",
  look: {
    body: "masculine",        // masculine | feminine (the body's frame)
    archetype: "brawler",     // martial | brawler (fighting style + outfit)
    height: 0.93,             // 0.85 (short) to 1.15 (tall)
    build: "medium",          // lean | medium | big
    muscle: 1.1,              // 0.8 (wiry) to 1.4 (HUGE)
    skin: "#f1c08f",
    eyes: "#6b4423",
    face: {
      expression: "grin",       // determined | grin
      jaw: "round",             // square | round | soft | pointed
      brows: "thin",            // heavy | thin | arched
      eyeShape: "round",        // narrow | round
      nose: "button",           // straight | button | wide
      freckles: false,
      lashes: false,
    },
    // 🛠️ TRY THIS: change the hair color, or try style "spiky" or "buzz"!
    hair: { style: "short", color: "#6e4022" },
    top: "#3fae5a",           // tank top color
    bottom: "#35558f",        // jeans color
    belt: "#6b3d1e",
    shoes: "#e04848",         // red sneakers
    extras: ["cap"],          // headband, cap, bow, earrings, glasses, sunglasses, wristbands
    accent: "#e04848",        // color for extras (the cap)
    weapon: "none",           // none | baseball-bat | tennis-racket | hockey-stick | lacrosse-stick | frying-pan
  },
  stats: { speed: 5, power: 6, health: 100, jump: 5 },   // 1–10 (health 50–150)
  specials: [
    { type: "fireball", name: "FASTBALL", color: "#7dff6a" },
    { type: "spin-kick", name: "BASE STEALER" },
  ],
  normals: {},                // 🛠️ TRY THIS: "st.HP": { damage: 18 }
  winQuote: "Too slow, bro!",
  stage: "ballfield",          // home stage in versus (optional)
};
