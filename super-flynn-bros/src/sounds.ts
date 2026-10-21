// 🛠️ SOUNDS & MUSIC
//
// The game looks for these files. If one isn't there yet, the game just stays
// quiet for that sound. Nothing breaks.
//
//   Sound effects go in:  public/assets/sounds/
//   Music goes in:        public/assets/music/
//
// Each file can be .mp3 or .ogg. Name it after the "file" below, e.g.
// jump.mp3 or level1.ogg.
//
// 🛠️ TRY THIS: record your own jump sound! Say "boing" into a phone or
// computer, save it as jump.mp3, put it in public/assets/sounds/, and play.
//
// "volume" goes from 0 (silent) to 1 (loudest).

import type { SoundDef } from "@web-games/audio";

export const soundEffects = {
  jump: { file: "jump", volume: 0.6 },
  land: { file: "land", volume: 0.3 },
  donut: { file: "donut", volume: 0.5 },
  burger: { file: "burger", volume: 0.7 },
  hurt: { file: "hurt", volume: 0.7 },
  fall: { file: "fall", volume: 0.7 },
  respawn: { file: "respawn", volume: 0.6 },
  levelRestart: { file: "level-restart", volume: 0.7 },
  goal: { file: "goal", volume: 0.8 },
  menuMove: { file: "menu-move", volume: 0.4 },
  menuSelect: { file: "menu-select", volume: 0.6 },
  pause: { file: "pause", volume: 0.5 },
  bark: { file: "bark", volume: 0.6 },
} satisfies Record<string, SoundDef>;

export const musicTracks = {
  title: { file: "title", volume: 0.5 },
  level1: { file: "level1", volume: 0.5 },
  level2: { file: "level2", volume: 0.5 },
  level3: { file: "level3", volume: 0.5 },
  level4: { file: "level4", volume: 0.5 },
  levelComplete: { file: "level-complete", volume: 0.6, loop: false },
  ending: { file: "ending", volume: 0.5 },
} satisfies Record<string, SoundDef>;

export type SoundKey = keyof typeof soundEffects;
export type MusicKey = keyof typeof musicTracks;
