import { mergeBindings, type InputManager } from "@web-games/input";
import { player1Controls, player2Controls } from "../controls";
import type { GameAudio } from "./audio";
import { saveProgress, unlockLevel, type Progress } from "./progress";
import type { Tileset } from "./tileset";
import type { Size } from "./types";

export type GameMode = "colin" | "ryan" | "coop";

/** Things every scene shares. BootScene creates them. */
export interface Services {
  input: InputManager;
  audio: GameAudio;
  progress: Progress;
  /** Size of each text drawing, by key. Sprites use it as their on-screen size. */
  artSizes: Map<string, Size>;
  tileset: Tileset;
}

let current: Services | null = null;

export function setServices(services: Services): void {
  current = services;
}

export function getServices(): Services {
  if (!current) throw new Error("BootScene hasn't finished setting up yet.");
  return current;
}

/**
 * Menus: anyone can drive. 1 player: player 1 can use either side of the
 * keyboard. Co-op: one side (and one gamepad) each.
 */
export function useControls(input: InputManager, mode: GameMode | "menu"): void {
  if (mode === "coop") {
    input.setBindings(1, player1Controls);
    input.setBindings(2, player2Controls);
  } else {
    input.setBindings(1, mergeBindings(player1Controls, player2Controls));
    if (mode === "menu") input.setBindings(2, player2Controls);
    else input.clearBindings(2);
  }
}

export function toggleMute(): void {
  const services = getServices();
  services.audio.toggleMute();
  services.progress = { ...services.progress, muted: services.audio.muted };
  saveProgress(services.progress);
}

/** Opens levels up to `levelNumber` (1-based) on the title screen. */
export function unlock(levelNumber: number): void {
  const services = getServices();
  services.progress = unlockLevel(services.progress, levelNumber);
  saveProgress(services.progress);
}

/** Runs every frame before the scenes: reads input, and handles keys that work everywhere. */
export function globalStep(): void {
  if (!current) return;
  current.input.update();
  if (current.input.anyJustPressed("mute")) toggleMute();
}
