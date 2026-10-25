import { describe, expect, it, vi } from "vitest";
import { collectRoster } from "../src/roster";

const known = ["fireball"];
const ok = (name: string) => () => Promise.resolve({ fighter: { name, look: {} } });

describe("collectRoster", () => {
  it("skips broken and empty files and reports them", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { fighters, problems } = await collectRoster(
      [
        ["./characters/colin.ts", ok("COLIN")],
        ["./characters/broken.ts", () => Promise.reject(new Error("Unexpected token"))],
        ["./characters/empty.ts", () => Promise.resolve({})],
      ],
      known,
    );
    expect(fighters).toHaveLength(1);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("broken.ts");
    expect(problems[0]).toContain("Unexpected token");
    expect(problems[1]).toContain("empty.ts");
  });

  it("keeps two fighters with the same name, numbering the second", async () => {
    const { fighters } = await collectRoster(
      [["./characters/a.ts", ok("RYAN")], ["./characters/b.ts", ok("RYAN")]],
      known,
    );
    expect(fighters.map((f) => f.name)).toEqual(["RYAN", "RYAN 2"]);
  });
});
