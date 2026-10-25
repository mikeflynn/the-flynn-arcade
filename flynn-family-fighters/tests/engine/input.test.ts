import { describe, expect, it } from "vitest";
import { B, InputHistory, matchMotion, toDir } from "../../src/engine/input";

type Dir = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Raw bits for a numpad direction when facing right (forward = RIGHT). */
function bitsFor(dir: Dir, facing: 1 | -1 = 1): number {
  const fwd = facing === 1 ? B.RIGHT : B.LEFT;
  const back = facing === 1 ? B.LEFT : B.RIGHT;
  let f = 0;
  if (dir === 1 || dir === 2 || dir === 3) f |= B.DOWN;
  if (dir === 7 || dir === 8 || dir === 9) f |= B.UP;
  if (dir === 1 || dir === 4 || dir === 7) f |= back;
  if (dir === 3 || dir === 6 || dir === 9) f |= fwd;
  return f;
}

function feed(dirs: Dir[], facing: 1 | -1 = 1): InputHistory {
  const h = new InputHistory();
  for (const d of dirs) h.push(bitsFor(d, facing), facing);
  return h;
}

const repeat = (d: Dir, n: number): Dir[] => Array<Dir>(n).fill(d);

describe("toDir", () => {
  it("reads directions relative to facing", () => {
    expect(toDir(B.LEFT | B.DOWN, 1)).toBe(1);
    expect(toDir(B.LEFT | B.DOWN, -1)).toBe(3);
    expect(toDir(0, 1)).toBe(5);
    expect(toDir(B.RIGHT, 1)).toBe(6);
    expect(toDir(B.UP | B.RIGHT, -1)).toBe(7);
  });
});

describe("motions", () => {
  it("reads qcf", () => {
    expect(matchMotion(feed([2, 3, 6]), "qcf", 20)).toBe(true);
  });
  it("reads qcf when facing left", () => {
    expect(matchMotion(feed([2, 3, 6], -1), "qcf", 20)).toBe(true);
  });
  it("allows extra directions in between", () => {
    expect(matchMotion(feed([2, 1, 2, 5, 3, 3, 6]), "qcf", 20)).toBe(true);
  });
  it("respects the window", () => {
    const h = feed([2, ...repeat(5, 25), 3, 6]);
    expect(matchMotion(h, "qcf", 20)).toBe(false);
    expect(matchMotion(h, "qcf", 40)).toBe(true);
  });
  it("tells qcb from qcf", () => {
    const h = feed([2, 1, 4]);
    expect(matchMotion(h, "qcb", 20)).toBe(true);
    expect(matchMotion(h, "qcf", 20)).toBe(false);
  });
  it("reads dp", () => {
    expect(matchMotion(feed([6, 2, 3]), "dp", 20)).toBe(true);
    expect(matchMotion(feed([2, 3, 6]), "dp", 20)).toBe(false);
  });
  it("reads chargeBF", () => {
    expect(matchMotion(feed([...repeat(4, 44), 6]), "chargeBF", 20)).toBe(false);
    expect(matchMotion(feed([...repeat(4, 45), 6]), "chargeBF", 20)).toBe(true);
    expect(matchMotion(feed([...repeat(1, 45), 3]), "chargeBF", 20)).toBe(true);
    expect(matchMotion(feed([...repeat(4, 45), ...repeat(5, 12), 6]), "chargeBF", 20)).toBe(false);
  });
  it("needs a forward direction now for chargeBF", () => {
    expect(matchMotion(feed([...repeat(4, 45), 5]), "chargeBF", 20)).toBe(false);
  });
  it("reads chargeDU", () => {
    expect(matchMotion(feed([...repeat(2, 45), 8]), "chargeDU", 20)).toBe(true);
    expect(matchMotion(feed([...repeat(2, 44), 8]), "chargeDU", 20)).toBe(false);
  });
  it("reads mash", () => {
    const mash = (n: number): InputHistory => {
      const h = new InputHistory();
      for (let i = 0; i < n; i++) {
        h.push(B.LP, 1);
        h.push(0, 1);
      }
      return h;
    };
    expect(matchMotion(mash(5), "mash", 20)).toBe(true);
    expect(matchMotion(mash(4), "mash", 20)).toBe(false);
  });
  it("reads 360", () => {
    expect(matchMotion(feed([4, 1, 2, 3, 6, 9, 8]), "360", 20)).toBe(true);
    expect(matchMotion(feed([4, 2, 6]), "360", 20)).toBe(false);
  });
});

describe("InputHistory", () => {
  it("pressed is true only on the first frame of a hold", () => {
    const h = new InputHistory();
    h.push(B.LP, 1);
    expect(h.pressed(B.LP)).toBe(true);
    h.push(B.LP, 1);
    expect(h.pressed(B.LP)).toBe(false);
  });
  it("newestPress finds the latest press within a few frames", () => {
    const h = new InputHistory();
    h.push(B.LP, 1);
    h.push(B.LP | B.HP, 1);
    h.push(0, 1);
    expect(h.newestPress(B.LP | B.MP | B.HP, 3)).toBe(B.HP);
    expect(h.newestPress(B.LK, 3)).toBe(0);
    h.push(0, 1);
    h.push(0, 1);
    expect(h.newestPress(B.HP, 3)).toBe(0);
  });
  it("dirAgo and heldFor count back from now", () => {
    const h = feed([2, 4, 4, 4]);
    expect(h.dirAgo(0)).toBe(4);
    expect(h.dirAgo(3)).toBe(2);
    expect(h.heldFor([4, 1, 7])).toBe(3);
  });
  it("keeps only its newest 90 frames", () => {
    const h = feed([...repeat(4, 200), 6]);
    expect(h.dirAgo(0)).toBe(6);
    expect(h.heldFor([4])).toBe(0);
    expect(h.dirAgo(95)).toBe(5);
  });
});
