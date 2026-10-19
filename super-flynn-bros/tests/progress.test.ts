import { describe, expect, it } from "vitest";
import { DEFAULT_PROGRESS, loadProgress, saveProgress, unlockLevel, type StorageLike } from "../src/engine/progress";

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const KEY = "super-flynn-bros:progress";

describe("progress", () => {
  it("starts fresh when nothing is saved", () => {
    expect(loadProgress(memoryStorage())).toEqual(DEFAULT_PROGRESS);
  });

  it("remembers what was saved", () => {
    const storage = memoryStorage();
    saveProgress({ unlockedLevels: 3, muted: true }, storage);
    expect(loadProgress(storage)).toEqual({ unlockedLevels: 3, muted: true });
  });

  it("ignores junk data", () => {
    expect(loadProgress(memoryStorage({ [KEY]: "not json" }))).toEqual(DEFAULT_PROGRESS);
    expect(loadProgress(memoryStorage({ [KEY]: '{"unlockedLevels":-3,"muted":"yes"}' }))).toEqual(DEFAULT_PROGRESS);
    expect(loadProgress(memoryStorage({ [KEY]: '{"unlockedLevels":2.5}' }))).toEqual(DEFAULT_PROGRESS);
  });

  it("never throws when storage is blocked or missing", () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadProgress(blocked)).toEqual(DEFAULT_PROGRESS);
    expect(() => saveProgress(DEFAULT_PROGRESS, blocked)).not.toThrow();
    expect(loadProgress(null)).toEqual(DEFAULT_PROGRESS);
    expect(() => saveProgress(DEFAULT_PROGRESS, null)).not.toThrow();
  });

  it("only unlocks forward", () => {
    expect(unlockLevel({ unlockedLevels: 3, muted: false }, 2).unlockedLevels).toBe(3);
    expect(unlockLevel({ unlockedLevels: 1, muted: false }, 2).unlockedLevels).toBe(2);
  });
});
