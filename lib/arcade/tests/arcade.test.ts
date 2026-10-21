import { describe, expect, it, vi } from "vitest";
import { arcadeUrl, fromGameId, gameUrl, validateGames, type GameInfo } from "../src/index";

const game = (overrides: Partial<GameInfo> = {}): GameInfo => ({
  id: "space-pong",
  title: "SPACE PONG",
  blurb: "Bounce the ball past your friend!",
  players: { min: 1, max: 2, coop: false },
  colors: { primary: "#ff0000", secondary: "#00ff00" },
  devPort: 8002,
  screenArt: { colors: { W: "#ffffff" }, art: ["W.W", ".W."] },
  ...overrides,
});

describe("validateGames", () => {
  it("keeps good registrations", () => {
    const warn = vi.fn();
    expect(validateGames([{ folder: "space-pong", info: game() }], warn)).toEqual([game()]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("skips registrations that are missing or broken, with a friendly message", () => {
    const warn = vi.fn();
    const games = validateGames(
      [
        { folder: "no-info", info: undefined },
        { folder: "Bad Name", info: game({ id: "Bad Name" }) },
        { folder: "space-pong", info: game({ id: "other-game" }) },
        { folder: "space-pong", info: game({ players: { min: 3, max: 2, coop: false } }) },
      ],
      warn,
    );
    expect(games).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(4);
    expect(warn.mock.calls[0][0]).toContain("no-info");
    expect(warn.mock.calls[1][0]).toContain("kebab-case");
    expect(warn.mock.calls[2][0]).toContain('should be "space-pong"');
    expect(warn.mock.calls[3][0]).toContain("players");
  });

  it("skips screen art that's too big for the cabinet", () => {
    const warn = vi.fn();
    const tooWide = game({ screenArt: { colors: {}, art: ["x".repeat(33)] } });
    const tooTall = game({ screenArt: { colors: {}, art: Array<string>(25).fill("x") } });
    expect(validateGames([{ folder: "space-pong", info: tooWide }], warn)).toEqual([]);
    expect(validateGames([{ folder: "space-pong", info: tooTall }], warn)).toEqual([]);
    expect(warn.mock.calls[0][0]).toContain("32 x 24");
  });

  it("keeps only the first of two games with the same id", () => {
    const warn = vi.fn();
    const games = validateGames(
      [
        { folder: "space-pong", info: game() },
        { folder: "space-pong", info: game({ title: "COPY" }) },
      ],
      warn,
    );
    expect(games.map((g) => g.title)).toEqual(["SPACE PONG"]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("sorts by order, then by title", () => {
    const games = validateGames(
      [
        { folder: "zebra", info: game({ id: "zebra", title: "ZEBRA" }) },
        { folder: "apple", info: game({ id: "apple", title: "APPLE" }) },
        { folder: "last", info: game({ id: "last", title: "AAA", order: 9 }) },
        { folder: "first", info: game({ id: "first", title: "ZZZ", order: 1 }) },
      ],
      () => {},
    );
    expect(games.map((g) => g.id)).toEqual(["first", "last", "apple", "zebra"]);
  });
});

describe("gameUrl", () => {
  it("uses the game's own dev server while developing", () => {
    expect(gameUrl(game(), { dev: true })).toBe("http://localhost:8002/");
  });

  it("uses the game's path behind the arcade in production", () => {
    expect(gameUrl(game(), { dev: false })).toBe("/space-pong/");
  });
});

describe("arcadeUrl", () => {
  it("points back at the arcade and says which game you came from", () => {
    expect(arcadeUrl("space-pong", { dev: true })).toBe("http://localhost:8000/?from=space-pong");
    expect(arcadeUrl("space-pong", { dev: false })).toBe("/?from=space-pong");
  });
});

describe("fromGameId", () => {
  it("reads the game you came back from", () => {
    expect(fromGameId("?from=space-pong")).toBe("space-pong");
    expect(fromGameId("")).toBeNull();
    expect(fromGameId("?from=")).toBeNull();
  });
});
