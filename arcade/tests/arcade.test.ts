import { describe, expect, it, vi } from "vitest";
import type { GameInfo } from "@web-games/arcade";
import { mySettings } from "../src/settings";
import { settingLimits } from "../src/limits";
import { buildSlots, initialIndex, nextAttractIndex, wrap } from "../src/selection";
import { loadArcadeSettings, saveArcadeSettings, type StorageLike } from "../src/storage";
import { collectRegistrations, folderOf, loadGames } from "../src/games";
import { playerLabel } from "../src/badges";
import { safeColor } from "../src/colors";
import { tickerLine } from "../src/ticker";
import { logoLines, settings, tickerBottom, tickerTop } from "../src/settings";

const game = (id: string): GameInfo => ({
  id,
  title: id.toUpperCase(),
  blurb: "",
  players: { min: 1, max: 1, coop: false },
  devPort: 8009,
  screenArt: { colors: {}, art: [] },
});

describe("settings.ts", () => {
  // Only shape checks here: kids are invited to change these values (CLAUDE.md §7).
  it("has a safe range for every number, and every number stays inside it", () => {
    const numbers = Object.entries(mySettings).filter(([, v]) => typeof v === "number").map(([k]) => k);
    expect(Object.keys(settingLimits).sort()).toEqual(numbers.sort());
    for (const [key, range] of Object.entries(settingLimits)) {
      const value = settings[key as keyof typeof settings] as number;
      expect(value).toBeGreaterThanOrEqual(range.min);
      expect(value).toBeLessThanOrEqual(range.max);
    }
  });

  it("has words for the logo and both tickers", () => {
    for (const list of [logoLines, tickerTop, tickerBottom]) {
      expect(Array.isArray(list)).toBe(true);
      expect(list.every((s) => typeof s === "string")).toBe(true);
    }
  });
});

describe("colors", () => {
  it("keeps a good #rrggbb color", () => {
    expect(safeColor("#AbCdEf", "#000000")).toBe("#AbCdEf");
  });
  it("falls back when a color isn't a #rrggbb code", () => {
    expect(safeColor("red", "#18171b")).toBe("#18171b");
    expect(safeColor(undefined, "#18171b")).toBe("#18171b");
    expect(safeColor("#fff", "#18171b")).toBe("#18171b");
  });
});

describe("ticker", () => {
  it("joins the messages with stars and fills in the game count", () => {
    expect(tickerLine(["INSERT COIN", "{games} ON THE FLOOR"], 2)).toBe("INSERT COIN ✦ 2 GAMES ON THE FLOOR ✦ ");
  });
  it("says GAME for just one", () => {
    expect(tickerLine(["{games} ON THE FLOOR"], 1)).toBe("1 GAME ON THE FLOOR ✦ ");
  });
  it("is empty with no messages", () => {
    expect(tickerLine([], 3)).toBe("");
  });
});

describe("selection", () => {
  const slots = buildSlots([game("a"), game("b")], 2);

  it("adds coming-soon cabinets after the games", () => {
    expect(slots.map((s) => s.kind)).toEqual(["game", "game", "soon", "soon"]);
  });

  it("always has at least one cabinet, even with no games and no coming-soon cabinets", () => {
    expect(buildSlots([], 0).map((s) => s.kind)).toEqual(["soon"]);
    expect(buildSlots([game("a")], 0).map((s) => s.kind)).toEqual(["game"]);
  });

  it("wraps around both ends", () => {
    expect(wrap(-1, 4)).toBe(3);
    expect(wrap(4, 4)).toBe(0);
    expect(wrap(0, 0)).toBe(0);
  });

  it("starts on the game you came back from", () => {
    expect(initialIndex(slots, "b")).toBe(1);
    expect(initialIndex(slots, "nope")).toBe(0);
    expect(initialIndex(slots, null)).toBe(0);
  });

  it("show-off mode skips coming-soon cabinets when there are several games", () => {
    expect(nextAttractIndex(1, slots)).toBe(0);
  });

  it("show-off mode wanders everywhere when there's only one game", () => {
    const one = buildSlots([game("a")], 2);
    expect(nextAttractIndex(0, one)).toBe(1);
    expect(nextAttractIndex(2, one)).toBe(0);
  });
});

describe("storage", () => {
  const memory = (): StorageLike => {
    const data: Record<string, string> = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
  };

  it("remembers mute", () => {
    const storage = memory();
    expect(loadArcadeSettings(storage)).toEqual({ muted: false });
    saveArcadeSettings({ muted: true }, storage);
    expect(loadArcadeSettings(storage)).toEqual({ muted: true });
  });

  it("never throws when storage is blocked", () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadArcadeSettings(blocked)).toEqual({ muted: false });
    expect(() => saveArcadeSettings({ muted: true }, blocked)).not.toThrow();
  });
});

describe("games.ts", () => {
  it("gets the folder name from a path", () => {
    expect(folderOf("../../super-flynn-bros/arcade.ts")).toBe("super-flynn-bros");
  });

  it("finds Super Flynn Bros", async () => {
    expect((await loadGames()).map((g) => g.id)).toContain("super-flynn-bros");
  });

  it("leaves out a game whose arcade.ts can't even be loaded, and says so", async () => {
    const warn = vi.fn();
    const registrations = await collectRegistrations(
      [
        ["../../good-game/arcade.ts", async () => ({ arcadeInfo: { id: "good-game" } })],
        ["../../broken-game/arcade.ts", async () => Promise.reject(new SyntaxError("Unexpected string"))],
        ["../../arcade/arcade.ts", async () => ({ arcadeInfo: {} })],
      ],
      warn,
    );
    expect(registrations).toEqual([{ folder: "good-game", info: { id: "good-game" } }]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("broken-game/arcade.ts");
    expect(warn.mock.calls[0][0]).toContain("Unexpected string");
  });
});

describe("player label", () => {
  it("shows the player count, and CO-OP or VS for two players", () => {
    expect(playerLabel({ min: 1, max: 2, coop: true })).toBe("1–2P CO-OP");
    expect(playerLabel({ min: 1, max: 2, coop: false })).toBe("1–2P VS");
    expect(playerLabel({ min: 1, max: 1, coop: false })).toBe("1P");
  });
});
