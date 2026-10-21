import { describe, expect, it } from "vitest";
import { parseFrames } from "@web-games/pixel-art";
import { buildCharLookup } from "../src/engine/levelLoader";
import { catalog, heroList } from "../src/engine/catalog";
import { colin, ryan } from "../src/heroes";
import { hazards } from "../src/hazards";
import { heartArt, items } from "../src/items";
import { goalArt, tiles } from "../src/tiles";
import { soundEffects } from "../src/sounds";
import { player1Controls, player2Controls } from "../src/controls";

const noWarnings = (frames: string[][], colors: Record<string, string>, name: string) =>
  expect(parseFrames(frames, colors, name).warnings).toEqual([]);

describe("game art", () => {
  it.each(heroList.map((h) => [h.name, h]))("%s's drawings are all the same size with known colors", (_, hero) => {
    const { idle, walk1, walk2, jump } = hero.frames;
    noWarnings([idle, walk1, walk2, jump], hero.colors, hero.key);
  });

  it.each(hazards.map((h) => [h.name, h]))("%s's drawing is clean", (_, hazard) => {
    noWarnings(hazard.frames, hazard.colors, hazard.key);
  });

  it.each(items.map((i) => [i.name, i]))("%s's drawing is clean", (_, item) => {
    noWarnings(item.frames, item.colors, item.key);
  });

  it.each(tiles.map((t) => [t.name, t]))("%s tile is 16 x 16 with known colors", (_, tile) => {
    for (const art of [tile.art, tile.under, tile.left, tile.right]) {
      if (!art) continue;
      const sheet = parseFrames([art], tile.colors, tile.key);
      expect(sheet.warnings).toEqual([]);
      expect([sheet.width, sheet.height]).toEqual([16, 16]);
    }
  });

  it("hearts and the goal sign are clean", () => {
    noWarnings(heartArt.frames, heartArt.colors, "heart");
    noWarnings([goalArt.art], goalArt.colors, "goal");
  });
});

describe("game data", () => {
  it("every map letter is used only once", () => {
    expect(buildCharLookup(catalog).warnings).toEqual([]);
  });

  it("every key is unique", () => {
    const keys = [...heroList, ...hazards, ...items, ...tiles].map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("hitboxes fit inside the drawings", () => {
    for (const hero of heroList) {
      const sheet = parseFrames([hero.frames.idle], hero.colors, hero.key);
      expect(hero.hitbox.width).toBeLessThanOrEqual(sheet.width);
      expect(hero.hitbox.height).toBeLessThanOrEqual(sheet.height);
    }
    for (const hazard of hazards) {
      if (!hazard.hitbox) continue;
      const sheet = parseFrames(hazard.frames, hazard.colors, hazard.key);
      expect(hazard.hitbox.width).toBeLessThanOrEqual(sheet.width);
      expect(hazard.hitbox.height).toBeLessThanOrEqual(sheet.height);
    }
  });

  it("Colin is taller and jumps higher; Ryan is faster", () => {
    expect(colin.frames.idle.length).toBeGreaterThan(ryan.frames.idle.length);
    expect(colin.jumpPower).toBeGreaterThan(ryan.jumpPower);
    expect(ryan.runSpeed).toBeGreaterThan(colin.runSpeed);
  });

  it("both players have a key to pick menu items", () => {
    expect(player1Controls.keys.confirm.length).toBeGreaterThan(0);
    expect(player2Controls.keys.confirm.length).toBeGreaterThan(0);
  });

  it("every item plays a sound that exists", () => {
    for (const item of items) expect(Object.keys(soundEffects)).toContain(item.sound);
  });
});
