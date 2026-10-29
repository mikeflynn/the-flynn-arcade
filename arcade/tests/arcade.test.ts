import { describe, expect, it, vi } from "vitest";
import type { GameInfo } from "@web-games/arcade";
import { mySettings } from "../src/settings";
import { settingLimits } from "../src/limits";
import { buildSlots, initialIndex, moveSelection, nextAttractIndex, wrap } from "../src/selection";
import { AttractClock } from "../src/attract";
import { mediaByGame, pictureFor } from "../src/media";
import { drawScreenArt } from "../src/screenArt";
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

describe("moveSelection", () => {
  it("left and right wrap around every panel", () => {
    expect(moveSelection(4, "right", 3, 5)).toBe(0);
    expect(moveSelection(0, "left", 3, 5)).toBe(4);
  });
  it("up and down move a whole row, and stay put when there's nothing there", () => {
    expect(moveSelection(1, "down", 3, 5)).toBe(4);
    expect(moveSelection(2, "down", 3, 5)).toBe(2);
    expect(moveSelection(4, "up", 3, 5)).toBe(1);
    expect(moveSelection(0, "up", 3, 5)).toBe(0);
  });
  it("treats one column (or a broken count) as a single column", () => {
    expect(moveSelection(0, "down", 1, 5)).toBe(1);
    expect(moveSelection(0, "down", 0, 5)).toBe(1);
  });
  it("is 0 with no panels", () => {
    expect(moveSelection(0, "right", 3, 0)).toBe(0);
  });
});

describe("AttractClock", () => {
  it("starts after the wait, then steps every stepMs", () => {
    const clock = new AttractClock(30000, 6000, 0);
    expect(clock.tick(29999)).toBe(false);
    expect(clock.active).toBe(false);
    expect(clock.tick(30001)).toBe(true);
    expect(clock.active).toBe(true);
    expect(clock.tick(30002)).toBe(false);
    expect(clock.tick(36001)).toBe(true);
  });
  it("stops when someone presses something, and waits again", () => {
    const clock = new AttractClock(30000, 6000, 0);
    clock.tick(30001);
    clock.poke(40000);
    expect(clock.active).toBe(false);
    expect(clock.tick(69999)).toBe(false);
  });
});

describe("media", () => {
  it("finds each game's screenshot and clip", () => {
    const media = mediaByGame({
      "../../a/arcade-media/screenshot.png": "/s.png",
      "../../a/arcade-media/clip.mp4": "/c.mp4",
      "../../b/arcade-media/notes.txt": "/n",
    });
    expect(media.get("a")).toEqual({ screenshot: "/s.png", clip: "/c.mp4" });
    expect(media.has("b")).toBe(false);
  });

  it("picks the clip, the screenshot or the little picture", () => {
    const both = { screenshot: "/s.png", clip: "/c.mp4" };
    const o = { selected: true, reducedMotion: false, clipFailed: false };
    expect(pictureFor(both, o)).toBe("clip");
    expect(pictureFor(both, { ...o, selected: false })).toBe("screenshot");
    expect(pictureFor(both, { ...o, reducedMotion: true })).toBe("screenshot");
    expect(pictureFor(both, { ...o, clipFailed: true })).toBe("screenshot");
    expect(pictureFor({ clip: "/c.mp4" }, { ...o, selected: false })).toBe("art");
    expect(pictureFor(undefined, o)).toBe("art");
  });
});

describe("drawScreenArt", () => {
  it("draws one square per letter it knows, and says how big the picture is", () => {
    const calls: [string, number, number, number, number][] = [];
    const ctx = { fillStyle: "" as string, fillRect(x: number, y: number, w: number, h: number) { calls.push([this.fillStyle, x, y, w, h]); } };
    const size = drawScreenArt(ctx, { colors: { A: "#ff0000", B: "#00ff00" }, art: ["AB", "BZ"] });
    expect(size).toEqual({ width: 2, height: 2 });
    expect(calls).toEqual([["#ff0000", 0, 0, 1, 1], ["#00ff00", 1, 0, 1, 1], ["#00ff00", 0, 1, 1, 1]]);
  });
});
