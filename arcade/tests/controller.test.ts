import { describe, expect, it } from "vitest";
import type { GameInfo } from "@web-games/arcade";
import { ArcadeController, START_DELAY_MS } from "../src/controller";
import type { PosterView } from "../src/poster/poster";
import { buildSlots } from "../src/selection";
import { settings } from "../src/settings";

const game = (id: string, devPort: number): GameInfo => ({
  id,
  title: id.toUpperCase(),
  blurb: "",
  players: { min: 1, max: 1, coop: false },
  devPort,
  screenArt: { colors: {}, art: [] },
});

function setup(startIndex = 0) {
  const calls: string[] = [];
  let hover: (i: number) => void = () => {};
  let click: (i: number) => void = () => {};
  let columns = 3;
  const view: PosterView = {
    select: (i) => calls.push(`select ${i}`),
    columns: () => columns,
    onHover: (fn) => (hover = fn),
    onClick: (fn) => (click = fn),
    setCredit: (t) => calls.push(`credit ${t}`),
    notYet: (i) => calls.push(`notYet ${i}`),
    showGameStart: () => calls.push("gameStart"),
    fadeOut: () => {
      calls.push("fadeOut");
      return Promise.resolve();
    },
  };
  let pressed = new Set<string>();
  const input = { update: () => {}, anyJustPressed: (a: string) => pressed.has(a) };
  const audio = {
    muted: false,
    playSfx: (k: string) => calls.push(`sfx ${k}`),
    playMusic: (k: string) => calls.push(`music ${k}`),
    stopMusic: () => calls.push("stopMusic"),
    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    },
  };
  const went: string[] = [];
  const saved: boolean[] = [];
  const slots = buildSlots([game("a", 8001), game("b", 8002)], 1);
  const c = new ArcadeController({
    view, slots, input, audio, startIndex, now: 0, dev: true,
    go: (url) => went.push(url),
    saveMuted: (m) => saved.push(m),
  });
  const frame = (now: number, ...actions: string[]) => {
    pressed = new Set(actions);
    c.frame(now);
    pressed = new Set();
  };
  return { c, calls, went, saved, frame, hover: (i: number) => hover(i), click: (i: number) => click(i), setColumns: (n: number) => (columns = n) };
}

describe("ArcadeController", () => {
  it("moves with right and down, with a sound", () => {
    const t = setup();
    t.frame(10, "right");
    expect(t.c.selected).toBe(1);
    expect(t.calls).toContain("select 1");
    expect(t.calls).toContain("sfx move");
    t.setColumns(1);
    t.frame(20, "down");
    expect(t.c.selected).toBe(2);
  });

  it("starts a game: coin, CREDIT 1, then leaves for the game once", () => {
    const t = setup();
    t.frame(100, "start");
    expect(t.calls).toContain("sfx coin");
    expect(t.calls).toContain("credit CREDIT 1");
    expect(t.c.starting).toBe(true);
    t.frame(100 + START_DELAY_MS - 1);
    expect(t.went).toEqual([]);
    t.frame(100 + START_DELAY_MS + 1, "right");
    t.frame(100 + START_DELAY_MS + 50);
    expect(t.calls).toContain("gameStart");
    expect(t.calls).toContain("stopMusic");
    expect(t.went).toEqual(["http://localhost:8001/"]);
    expect(t.c.selected).toBe(0);
  });

  it("says nope on a coming-soon panel", () => {
    const t = setup(2);
    t.frame(10, "start");
    expect(t.calls).toContain("sfx nope");
    expect(t.calls).toContain("notYet 2");
    t.frame(10 + START_DELAY_MS * 2);
    expect(t.went).toEqual([]);
  });

  it("mutes, and remembers it", () => {
    const t = setup();
    t.frame(10, "mute");
    expect(t.saved).toEqual([true]);
  });

  it("hovering selects without starting; clicking starts", () => {
    const t = setup();
    t.hover(1);
    t.frame(10);
    expect(t.c.selected).toBe(1);
    expect(t.c.starting).toBe(false);
    t.click(0);
    t.frame(20);
    expect(t.c.selected).toBe(0);
    expect(t.c.starting).toBe(true);
  });

  it("shows off the games by itself after a while, quietly, and a press just wakes it up", () => {
    const t = setup();
    t.frame(settings.attractDelayMs + 1);
    expect(t.c.selected).toBe(1);
    t.frame(settings.attractDelayMs + 1 + settings.attractStepMs + 1);
    expect(t.c.selected).toBe(0); // skips the coming-soon panel
    expect(t.calls).not.toContain("sfx move");
    const before = t.c.selected;
    t.frame(settings.attractDelayMs * 2, "start");
    expect(t.c.selected).toBe(before);
    expect(t.c.starting).toBe(false);
  });
});
