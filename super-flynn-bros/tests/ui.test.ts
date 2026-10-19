import { describe, expect, it } from "vitest";
import { formatTime } from "../src/engine/ui";

describe("formatTime", () => {
  it("shows minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(9_999)).toBe("0:09");
    expect(formatTime(83_000)).toBe("1:23");
  });

  it("never shows negative time", () => {
    expect(formatTime(-500)).toBe("0:00");
  });
});
