import { describe, expect, it, vi } from "vitest";
import { checkHazard, checkHero } from "../src/engine/checkDefs";
import { hazards } from "../src/hazards";
import { colin, ryan } from "../src/heroes";
import type { HazardDef } from "../src/engine/types";

describe("checkHero", () => {
  it("fixes a negative speed or jump so the hero still runs both ways and jumps", () => {
    const warn = vi.fn();
    const fixed = checkHero({ ...colin, runSpeed: -100, jumpPower: -300 }, warn);
    expect(fixed.runSpeed).toBeGreaterThan(0);
    expect(fixed.jumpPower).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain("Colin");
  });

  it("fixes a hitbox with no size", () => {
    const fixed = checkHero({ ...ryan, hitbox: { width: 0, height: 22 } }, () => {});
    expect(fixed.hitbox.width).toBeGreaterThan(0);
  });
});

describe("checkHazard", () => {
  const dog = hazards.find((h) => h.key === "dog") as HazardDef;

  it("fixes a zero animation speed so the drawing doesn't break", () => {
    const warn = vi.fn();
    expect(checkHazard({ ...dog, frameMs: 0 }, warn).frameMs).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("leaves out settings a hazard doesn't use", () => {
    const warn = vi.fn();
    const fixed = checkHazard(dog, warn);
    expect(fixed.onMs).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("the shipped heroes and hazards", () => {
  it("are all inside the safe ranges", () => {
    const warn = vi.fn();
    [colin, ryan].forEach((hero) => checkHero(hero, warn));
    hazards.forEach((hazard) => checkHazard(hazard, warn));
    expect(warn).not.toHaveBeenCalled();
  });
});
