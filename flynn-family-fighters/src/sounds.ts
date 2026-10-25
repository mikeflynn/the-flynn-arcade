// 🔊 SOUNDS & MUSIC
//
// The game looks for these files. If one isn't there yet, the game just stays
// quiet for that sound. Nothing breaks.
//
//   Sound effects go in:  public/assets/sounds/
//   Music goes in:        public/assets/music/
//
// Each file can be .mp3 or .ogg. Name it after the "file" below, e.g.
// hit.mp3 or fight.ogg.
//
// 🛠️ TRY THIS: record your own "FIGHT!" Shout it into a phone or computer,
// save it as fight.mp3, put it in public/assets/sounds/, and start a match.
//
// "volume" goes from 0 (silent) to 1 (loudest). Press M in a fight to mute.

import type { SoundDef } from "@web-games/audio";

export const soundEffects = {
  hit: { file: "hit", volume: 0.6 }, // a light or medium hit lands
  heavyHit: { file: "heavy-hit", volume: 0.8 }, // a heavy hit (or a special) lands
  block: { file: "block", volume: 0.5 }, // an attack is blocked
  whoosh: { file: "whoosh", volume: 0.3 }, // an attack misses
  special: { file: "special", volume: 0.7 }, // a special move starts
  ko: { file: "ko", volume: 0.9 }, // knocked out!
  round: { file: "round", volume: 0.8 }, // "ROUND 1"
  fight: { file: "fight", volume: 0.8 }, // "FIGHT!"
  youWin: { file: "you-win", volume: 0.8 }, // the match is won
  menuMove: { file: "menu-move", volume: 0.4 },
  menuSelect: { file: "menu-select", volume: 0.6 },
} satisfies Record<string, SoundDef>;

export const musicTracks = {
  title: { file: "title", volume: 0.5 },
  select: { file: "select", volume: 0.5 },
  fight: { file: "fight", volume: 0.5 },
} satisfies Record<string, SoundDef>;

export type SoundKey = keyof typeof soundEffects;
export type MusicKey = keyof typeof musicTracks;
