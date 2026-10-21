import { describe, expect, it, vi } from "vitest";
import { clampSettings } from "@web-games/settings";
import { parseFrames } from "@web-games/pixel-art";
import type { GameInfo } from "@web-games/arcade";
import { mySettings } from "../src/settings";
import { settingLimits } from "../src/limits";
import { cabinetArt } from "../src/cabinet";
import { cabinetPalette, findRegion, shade } from "../src/layout";
import { buildSlots, initialIndex, nextAttractIndex, wrap } from "../src/selection";
import { loadArcadeSettings, saveArcadeSettings, type StorageLike } from "../src/storage";
import { collectRegistrations, folderOf, loadGames } from "../src/games";
import { playerBadges } from "../src/badges";

const game = (id: string): GameInfo => ({
  id,
  title: id.toUpperCase(),
  blurb: "",
  players: { min: 1, max: 1, coop: false },
  colors: { primary: "#ff0000", secondary: "#00ff00" },
  devPort: 8009,
  screenArt: { colors: {}, art: [] },
});

describe("settings.ts", () => {
  it("ships with every value in its safe range, and a limit for each", () => {
    const warn = vi.fn();
    clampSettings(mySettings, settingLimits, warn);
    expect(warn).not.toHaveBeenCalled();
    expect(Object.keys(settingLimits).sort()).toEqual(Object.keys(mySettings).sort());
  });
});

describe("cabinet art", () => {
  it("is clean with a game's colors", () => {
    expect(parseFrames([cabinetArt], cabinetPalette("#5ab0f0", "#f6d860"), "cabinet").warnings).toEqual([]);
  });

  it("has a screen big enough for a 32 x 24 picture, and a marquee", () => {
    const screen = findRegion(cabinetArt, "G");
    expect(screen && screen.width >= 32 && screen.height >= 24).toBe(true);
    expect(findRegion(cabinetArt, "M")).not.toBeNull();
  });
});

describe("layout helpers", () => {
  it("findRegion boxes in a letter", () => {
    expect(findRegion(["....", ".GG.", ".GG."], "G")).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(findRegion(["...."], "G")).toBeNull();
  });

  it("shade makes colors darker", () => {
    expect(shade("#ffffff", 0.5)).toBe("#808080");
    expect(shade("#ff0000", 0)).toBe("#ff0000");
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

describe("player badges", () => {
  it("shows the player count, and CO-OP when players team up", () => {
    expect(playerBadges({ min: 1, max: 1, coop: false }).map((b) => b.text)).toEqual(["1P"]);
    expect(playerBadges({ min: 1, max: 2, coop: true }).map((b) => b.text)).toEqual(["1-2P", "CO-OP"]);
  });
});
