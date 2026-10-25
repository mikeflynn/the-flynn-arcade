// 🥊 COLIN — edit anything here and save to see it change!
// (Open http://localhost:8002/?viewer to see your fighter up close.)
import type { Fighter } from "../fighter";

export const fighter: Fighter = {
  id: "colin", // the file's name; the game fills this in for you
  name: "COLIN",
  look: {
    body: "masculine",        // masculine | feminine (the body's frame)
    archetype: "martial",     // martial | brawler (fighting style + outfit)
    height: 1.08,             // 0.85 (short) to 1.15 (tall)
    build: "lean",            // lean | medium | big
    muscle: 1.15,             // 0.8 (wiry) to 1.4 (HUGE)
    skin: "#f1c08f",
    eyes: "#3b6fb6",
    face: {
      expression: "determined", // determined | grin
      jaw: "square",            // square | round | soft | pointed
      brows: "heavy",           // heavy | thin | arched
      eyeShape: "narrow",       // narrow | round
      nose: "straight",         // straight | button | wide
      freckles: false,
      lashes: false,
    },
    // 🛠️ TRY THIS: change the hair color, or try style "spiky" or "buzz"!
    hair: { style: "swoop", color: "#f7d35c" },
    top: "#2f6fd6",           // gi jacket / tank top color
    bottom: "#2f6fd6",        // gi pants / jeans / leggings color
    belt: "#1d1d1d",
    shoes: "#ffffff",         // bare feet for martial artists
    extras: ["headband"],     // headband, cap, bow, earrings, glasses, sunglasses, wristbands
    accent: "#e8e8e8",        // color for extras
    weapon: "none",           // none | baseball-bat | tennis-racket | hockey-stick | lacrosse-stick | frying-pan
  },
  stats: { speed: 6, power: 5, health: 100, jump: 6 },   // 1–10 (health 50–150)
  specials: [
    { type: "fireball", name: "DONUT BLAST", color: "#ff7ad9" },
    { type: "uppercut", name: "HOME RUN SWING" },
  ],
  normals: {},                // 🛠️ TRY THIS: "st.HK": { damage: 20, reach: 1.2 }
  winQuote: "Race you home!",
  stage: "track",             // home stage in versus (optional)
};
