// 🛠️ THEMES: the colors and scenery behind each level
//
// A level picks a theme by name (theme: "morning"). The background is drawn
// by the game from these colors, in layers that scroll at different speeds:
// sky, then mountains (the Santa Monica Mountains!), then buildings and palm
// trees, then hedges.
//
// scenery can be "houses" (ranch houses), "shops" (a strip mall), or "park".
//
// 🛠️ TRY THIS: make a night theme! Copy "sunset", call it "night", make the
// sky dark blue, and set a level's theme to "night".

export interface Theme {
  skyTop: string;
  skyBottom: string;
  sun: { x: number; y: number; radius: number; color: string };
  mountainsFar: string;
  mountains: string;
  scenery: "houses" | "shops" | "park";
  buildingColors: string[];
  roof: string;
  trim: string;
  palmTrunk: string;
  leaves: string;
  hedge: string;
  hedgeDark: string;
}

export const themes = {
  morning: {
    skyTop: "#6cc4ff",
    skyBottom: "#d4f1ff",
    sun: { x: 250, y: 28, radius: 12, color: "#fff4b0" },
    mountainsFar: "#b3c6bd",
    mountains: "#8fa89a",
    scenery: "houses",
    buildingColors: ["#f2e3c6", "#e8d0b0", "#dfe8e0", "#f6efe0"],
    roof: "#9a5a3a",
    trim: "#ffffff",
    palmTrunk: "#8a6a4a",
    leaves: "#3f8f3a",
    hedge: "#3f8f3a",
    hedgeDark: "#2e6e2a",
  },
  midday: {
    skyTop: "#4fb0f0",
    skyBottom: "#e6f4ff",
    sun: { x: 160, y: 16, radius: 10, color: "#ffffe0" },
    mountainsFar: "#c2cbc0",
    mountains: "#a3b39f",
    scenery: "shops",
    buildingColors: ["#e9d8b8", "#d8c0a0", "#f0e6d2", "#cfd8dc"],
    roof: "#8a8a8a",
    trim: "#d83a3a",
    palmTrunk: "#8a6a4a",
    leaves: "#4a9a3a",
    hedge: "#4a9a3a",
    hedgeDark: "#357a2a",
  },
  afternoon: {
    skyTop: "#5ab4f0",
    skyBottom: "#fbe9c8",
    sun: { x: 70, y: 36, radius: 12, color: "#fff0a0" },
    mountainsFar: "#c8c0a8",
    mountains: "#a8a088",
    scenery: "park",
    buildingColors: ["#58b04a", "#3f8f3a", "#6cc05a"],
    roof: "#c8a060",
    trim: "#ffffff",
    palmTrunk: "#8a6a4a",
    leaves: "#3f8f3a",
    hedge: "#58b04a",
    hedgeDark: "#3f8f3a",
  },
  sunset: {
    skyTop: "#3a2a6a",
    skyBottom: "#f89a5a",
    sun: { x: 230, y: 92, radius: 20, color: "#ffb050" },
    mountainsFar: "#8a5a8a",
    mountains: "#5a3a6a",
    scenery: "houses",
    buildingColors: ["#e0b090", "#d0a080", "#e8c0a0", "#c89878"],
    roof: "#6a3a3a",
    trim: "#ffe0b0",
    palmTrunk: "#4a3a3a",
    leaves: "#2a4a3a",
    hedge: "#2e5a3a",
    hedgeDark: "#1e3a2a",
  },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof themes;
