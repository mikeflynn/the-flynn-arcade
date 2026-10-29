// The engine tests' own settings, frozen at the starter values.
//
// src/settings.ts is a kid file (round time, damage, chip, dizzy, ...), so the
// engine tests use these numbers instead: a kid's edit there can never make
// them fail. Any setting added to settings.ts later comes along from mySettings.

import { mySettings, type Settings } from "../../src/settings";

export const testSettings: Settings = {
  ...mySettings,
  roundTime: 99,
  roundsToWin: 2,
  gameSpeed: 1,
  cpuDifficulty: 3,
  damageScale: 1,
  chipDamageFraction: 0.25,
  dizzyEnabled: true,
  throwTechEnabled: false,
  motionWindowFrames: 20,
  showHitboxes: false,
  animationFps: 20,
};
