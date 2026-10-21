// 🛠️ SUPER FLYNN BROS SETTINGS
//
// These numbers control how the game feels. Change one, save the file, and
// the game reloads with your change. Each one says what numbers to try.
//
// Picked a number that's way too big or too small? No problem: the game
// fixes it and tells you in the browser console (press F12 to see it).
//
// Want to change how Colin or Ryan run and jump? That's in heroes.ts.

import { clampSettings } from "@web-games/settings";
import { settingLimits } from "./engine/limits";

export const mySettings = {
  // How strong gravity is. Lower = floaty moon jumps!
  // Try 400 (moon) to 1500 (super heavy).
  gravity: 900,

  // The fastest you can fall. Try 300 to 800.
  maxFallSpeed: 500,

  // How quickly the heroes speed up when you press left or right.
  // Try 300 (slow start) to 2000 (instant).
  acceleration: 900,

  // How quickly the heroes stop when you let go.
  // Low numbers = slippery, like walking on ice! Try 200 to 2000.
  deceleration: 1100,

  // How much you can steer while you're in the air (1 = same as on the ground).
  // Try 0.3 to 1.
  airControl: 0.8,

  // Letting go of jump early makes a smaller hop. 1 = no small hops.
  // Try 0.2 to 1.
  jumpCut: 0.45,

  // Hearts each hero starts a level with. Try 1 (really hard!) to 10 (easy).
  hearts: 3,

  // The most hearts you can have. Burgers can't go past this. Try 1 to 10.
  maxHearts: 3,

  // After a bump, how long you blink and can't get hurt again.
  // In milliseconds: 1000 = 1 second. Try 500 to 4000.
  safeTimeMs: 1500,

  // How hard a bump pushes you back. Try 0 to 300.
  knockback: 140,

  // Co-op: how long until a brother who ran out of hearts pops back in.
  // In milliseconds. Try 0 to 5000.
  respawnDelayMs: 2000,

  // Music volume: 0 = off, 1 = loudest.
  musicVolume: 0.5,

  // Sound effects volume: 0 = off, 1 = loudest.
  sfxVolume: 0.7,

  // 🛠️ TRY THIS: forgiving jumps! For this many milliseconds after you run
  // off a ledge, you can still jump. Set it to 0 and see how much harder it gets.
  coyoteTimeMs: 80,

  // If you press jump a little before you land, the game remembers it for
  // this many milliseconds and jumps as soon as you touch the ground.
  jumpBufferMs: 100,
};

export const settings = clampSettings(mySettings, settingLimits);
