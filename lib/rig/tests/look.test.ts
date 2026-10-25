import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LOOK, alternateColors, normalizeLook } from "../src/look";

describe("normalizeLook", () => {
  it("gives Colin for nothing", () => {
    expect(normalizeLook(undefined)).toEqual(DEFAULT_LOOK);
    expect(DEFAULT_LOOK.height).toBe(1.08);
  });

  it("fixes an unknown hair style and lists the valid ones", () => {
    const warn = vi.fn();
    const look = normalizeLook({ hair: { style: "mohawk" } }, warn);
    expect(look.hair.style).toBe("short");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("mohawk");
    expect(warn.mock.calls[0]![0]).toContain("swoop");
  });

  it("falls back to the default for other unknown choices", () => {
    const warn = vi.fn();
    expect(normalizeLook({ build: "huge" }, warn).build).toBe("lean");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("clamps numbers and replaces non-numbers", () => {
    const warn = vi.fn();
    expect(normalizeLook({ height: 3 }, warn).height).toBe(1.15);
    expect(normalizeLook({ height: "tall" }, warn).height).toBe(1.08);
  });

  it("only accepts #rrggbb colors", () => {
    const warn = vi.fn();
    expect(normalizeLook({ skin: "pink-ish" }, warn).skin).toBe(DEFAULT_LOOK.skin);
    expect(normalizeLook({ skin: "#AABBCC" }, warn).skin).toBe("#AABBCC");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("drops unknown extras", () => {
    const warn = vi.fn();
    expect(normalizeLook({ extras: ["cap", "jetpack"] }, warn).extras).toEqual(["cap"]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("gives feminine frames lashes unless told otherwise", () => {
    expect(normalizeLook({ body: "feminine" }).face.lashes).toBe(true);
    expect(normalizeLook({ body: "feminine", face: { lashes: false } }).face.lashes).toBe(false);
    expect(normalizeLook({}).face.lashes).toBe(false);
  });

  it("survives garbage", () => {
    const warn = vi.fn();
    expect(normalizeLook("nope", warn)).toEqual(DEFAULT_LOOK);
    expect(normalizeLook({ face: 5, hair: null }, warn)).toEqual(DEFAULT_LOOK);
  });
});

describe("alternateColors", () => {
  it("swaps clothes but not skin or hair", () => {
    const alt = alternateColors(DEFAULT_LOOK);
    expect(alt.top).not.toBe(DEFAULT_LOOK.top);
    expect(alt.bottom).not.toBe(DEFAULT_LOOK.bottom);
    expect(alt.hair.color).toBe(DEFAULT_LOOK.hair.color);
    expect(alt.skin).toBe(DEFAULT_LOOK.skin);
    expect(alternateColors(alt).top).not.toBe(alt.top);
  });
});
