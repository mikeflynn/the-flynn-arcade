/** What the arcade remembers in this browser. */
export interface ArcadeSettings {
  muted: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "flynn-arcade:settings";

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadArcadeSettings(storage: StorageLike | null = browserStorage()): ArcadeSettings {
  try {
    const raw = storage?.getItem(KEY);
    return { muted: raw ? (JSON.parse(raw) as Partial<ArcadeSettings>).muted === true : false };
  } catch {
    return { muted: false };
  }
}

export function saveArcadeSettings(value: ArcadeSettings, storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(value));
  } catch {
    // Blocked storage: the setting just won't be remembered.
  }
}
