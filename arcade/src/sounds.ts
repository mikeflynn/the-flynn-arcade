// 🛠️ ARCADE SOUNDS & MUSIC
//
// Put sound effects in public/assets/sounds/ and music in public/assets/music/,
// as .mp3 or .ogg, named after "file" below. Missing files are fine: the arcade
// just stays quiet for those.

import type { SoundDef } from "@web-games/audio";

export const soundEffects = {
  coin: { file: "coin", volume: 0.8 },
  move: { file: "move", volume: 0.5 },
  select: { file: "select", volume: 0.8 },
  nope: { file: "nope", volume: 0.6 },
} satisfies Record<string, SoundDef>;

export const musicTracks = {
  arcade: { file: "arcade", volume: 0.5 },
} satisfies Record<string, SoundDef>;
