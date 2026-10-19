/** What we remember between visits. It lives in this browser's localStorage. */
export interface Progress {
  /** How many levels can be picked on the title screen (1 = just the first). */
  unlockedLevels: number;
  muted: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_PROGRESS: Progress = { unlockedLevels: 1, muted: false };
const STORAGE_KEY = "super-flynn-bros:progress";

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null; // no window (tests) or storage blocked
  }
}

export function loadProgress(storage: StorageLike | null = browserStorage()): Progress {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const data = JSON.parse(raw) as Partial<Progress>;
    const unlocked = data.unlockedLevels;
    return {
      unlockedLevels: typeof unlocked === "number" && Number.isInteger(unlocked) && unlocked >= 1 ? unlocked : 1,
      muted: data.muted === true,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: Progress, storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private window or blocked storage: progress just won't be remembered.
  }
}

/** Unlocks up to `levelNumber` (1-based). Never locks a level that was already open. */
export function unlockLevel(progress: Progress, levelNumber: number): Progress {
  return { ...progress, unlockedLevels: Math.max(progress.unlockedLevels, levelNumber) };
}
