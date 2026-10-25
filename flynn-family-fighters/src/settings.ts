// 🛠️ FLYNN FAMILY FIGHTERS SETTINGS
//
// These numbers control how the fights feel. Change one, save the file, and
// the game reloads with your change. Each one says what numbers to try.
//
// Picked a number that's way too big or too small? No problem: the game
// fixes it and tells you in the browser console (press F12 to see it).
//
// Want to change how a fighter looks or what moves they have? That's in the
// characters folder (src/characters/).

import { clampSettings, type Limits } from "@web-games/settings";

export const mySettings = {
  // How many seconds a round lasts. Try 30 (quick!) to 99.
  roundTime: 99,

  // How many rounds you must win to win the match. Try 1 to 3.
  roundsToWin: 2,

  // How fast the whole game runs. 1 = normal, 4 = super speed! Try 1 to 4.
  gameSpeed: 1,

  // How smart the computer fighter is. Try 1 (gentle) to 8 (tough!).
  cpuDifficulty: 3,

  // How much every hit hurts. 1 = normal, 0.25 = tickles, 3 = ouch!
  damageScale: 1,

  // How much of a hit still hurts when it's blocked. 0 = nothing, 0.5 = half.
  chipDamageFraction: 0.25,

  // Do fighters see stars and get dizzy after lots of hits? true or false.
  dizzyEnabled: true,

  // Can you press a throw button just as you're grabbed to break free?
  // true or false.
  throwTechEnabled: false,

  // How many frames you get to finish a special-move combo (60 frames = 1 second).
  // Try 10 (tricky) to 40 (easy).
  motionWindowFrames: 20,

  // Show the hit boxes (where punches can hurt)? Great for learning! true or false.
  showHitboxes: false,

  // How many pictures per second the fighters' animations use.
  // Pick 15 (chunky and retro), 20 or 30 (smooth). Other numbers snap to the closest.
  animationFps: 20,
};

export type Settings = typeof mySettings;

export const settingLimits: Limits<Settings> = {
  roundTime: { min: 30, max: 99 },
  roundsToWin: { min: 1, max: 3 },
  gameSpeed: { min: 1, max: 4 },
  cpuDifficulty: { min: 1, max: 8 },
  damageScale: { min: 0.25, max: 3 },
  chipDamageFraction: { min: 0, max: 0.5 },
  motionWindowFrames: { min: 10, max: 40 },
};

export const FPS_CHOICES = [15, 20, 30] as const;
export type Fps = (typeof FPS_CHOICES)[number];

/** Snaps any number to the nearest of 15, 20 or 30 (the rig only bakes those). */
export function snapFps(value: unknown): Fps {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 20;
  return FPS_CHOICES.reduce((best, f) => (Math.abs(f - n) < Math.abs(best - n) ? f : best));
}

const clamped = clampSettings(mySettings, settingLimits);

/** The safe numbers the game really uses. */
export const settings: Settings & { animationFps: Fps } = { ...clamped, animationFps: snapFps(clamped.animationFps) };
