import { describe, expect, it } from "vitest";
import { animLength, flatFeet, heldFrames, samplePose, shownFrame, type Animation } from "../src/pose";

const move: Animation = {
  loop: false,
  keys: [
    { pose: { a: 0 }, frames: 1, ease: "linear" },
    { pose: { a: 10 }, frames: 10, ease: "linear" },
  ],
};

describe("animLength", () => {
  it("sums key frames", () => {
    expect(animLength({ loop: false, keys: [{ pose: {}, frames: 3, ease: "linear" }, { pose: {}, frames: 5, ease: "linear" }] })).toBe(8);
  });
});

describe("samplePose", () => {
  it("eases linearly from the previous key", () => {
    // frame 1 is the start of key 1 (key 0 lasts one frame); halfway is frame 6
    expect(samplePose(move, 6, { a: 0 }).a).toBe(5);
  });
  it("matches the brief's 2-key example", () => {
    const a: Animation = { loop: false, keys: [{ pose: { a: 0 }, frames: 0, ease: "linear" }, { pose: { a: 10 }, frames: 10, ease: "linear" }] };
    expect(samplePose(a, 5, { a: 0 }).a).toBe(5);
  });
  it("snap returns the target from the key's first frame", () => {
    const a: Animation = { loop: false, keys: [{ pose: { a: 7 }, frames: 4, ease: "snap" }] };
    expect(samplePose(a, 0, { a: 0 }).a).toBe(7);
  });
  it("loops and eases key 0 from the last key", () => {
    const a: Animation = {
      loop: true,
      keys: [{ pose: { a: 0 }, frames: 4, ease: "linear" }, { pose: { a: 10 }, frames: 4, ease: "linear" }],
    };
    expect(samplePose(a, 8, { a: 99 })).toEqual(samplePose(a, 0, { a: 99 }));
    expect(samplePose(a, 0, { a: 99 }).a).toBe(10);
    expect(samplePose(a, 2, { a: 99 }).a).toBe(5);
  });
  it("takes strings from the current key", () => {
    const a: Animation = { loop: false, keys: [{ pose: { a: 0, hand: "palm" }, frames: 4, ease: "linear" }] };
    expect(samplePose(a, 1, { a: 0, hand: "fist" }).hand).toBe("palm");
  });
  it("holds the last pose after a non-looping animation ends", () => {
    expect(samplePose(move, 500, { a: 0 }).a).toBe(10);
  });
});

describe("flatFeet", () => {
  it("fills missing feet and keeps existing ones", () => {
    const p = flatFeet({ fTh: -30, fSh: 40, bTh: 20, bSh: 10 });
    expect(p.fFt).toBe(-10);
    expect(p.bFt).toBe(-30);
    expect(flatFeet({ fTh: 1, fSh: 1, fFt: 5 }).fFt).toBe(5);
  });
});

describe("heldFrames / shownFrame", () => {
  const a: Animation = {
    loop: false,
    keys: [4, 2, 6].map((frames) => ({ pose: {}, frames, ease: "linear" as const })),
  };
  it("bakes every 60/fps frame plus each key start", () => {
    expect(heldFrames(a, 20)).toEqual([0, 3, 4, 6, 9, 12]);
    expect(heldFrames(a, 15)).toEqual([0, 4, 6, 8, 12]);
  });
  it("shows the latest held frame at or before the frame", () => {
    const held = heldFrames(a, 20);
    expect(shownFrame(a, held, 5)).toBe(4);
    expect(shownFrame(a, held, 11)).toBe(9);
    expect(shownFrame(a, held, 12)).toBe(12);
    expect(shownFrame(a, held, 40)).toBe(12);
  });
  it("shows the baked final pose once a non-looping animation ends", () => {
    const b: Animation = { loop: false, keys: [{ pose: { a: 0 }, frames: 4, ease: "sine" }, { pose: { a: 10 }, frames: 8, ease: "out" }] };
    const held = heldFrames(b, 20), from = { a: 3 };
    for (const f of [12, 17, 100]) expect(samplePose(b, shownFrame(b, held, f), from)).toEqual(samplePose(b, f, from));
  });
  it("does not bake len for looping animations", () => {
    const l: Animation = { ...a, loop: true };
    expect(heldFrames(l, 20)).toEqual([0, 3, 4, 6, 9]);
  });
  it("wraps looping animations", () => {
    const l: Animation = { ...a, loop: true };
    expect(shownFrame(l, heldFrames(l, 20), 17)).toBe(4);
  });
});
