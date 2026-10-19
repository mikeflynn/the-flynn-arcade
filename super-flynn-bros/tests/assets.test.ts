import { describe, expect, it } from "vitest";
import { findAssets, makeHttpExists } from "../src/engine/assets";

describe("findAssets", () => {
  it("picks the first address that exists and leaves out missing files", async () => {
    const files = new Set(["assets/sounds/jump.ogg", "assets/sounds/donut.mp3"]);
    const found = await findAssets(
      [
        { key: "jump", urls: ["assets/sounds/jump.mp3", "assets/sounds/jump.ogg"] },
        { key: "donut", urls: ["assets/sounds/donut.mp3", "assets/sounds/donut.ogg"] },
        { key: "bark", urls: ["assets/sounds/bark.mp3"] },
      ],
      async (url) => files.has(url),
    );
    expect(found).toEqual(
      new Map([
        ["jump", "assets/sounds/jump.ogg"],
        ["donut", "assets/sounds/donut.mp3"],
      ]),
    );
  });

  it("treats a check that blows up as missing", async () => {
    const found = await findAssets([{ key: "jump", urls: ["x.mp3"] }], async () => {
      throw new Error("offline");
    });
    expect(found.size).toBe(0);
  });
});

describe("makeHttpExists", () => {
  const respond = (status: number, type: string) => async () =>
    new Response(null, { status, headers: { "content-type": type } });

  it("says yes to a real file", async () => {
    expect(await makeHttpExists(respond(200, "audio/mpeg"))("jump.mp3")).toBe(true);
  });

  it("says no to a 404", async () => {
    expect(await makeHttpExists(respond(404, "text/plain"))("jump.mp3")).toBe(false);
  });

  it("says no when the server answers with a web page instead of the file", async () => {
    expect(await makeHttpExists(respond(200, "text/html; charset=utf-8"))("jump.mp3")).toBe(false);
  });

  it("says no when the request fails", async () => {
    const failing = async () => {
      throw new Error("offline");
    };
    expect(await makeHttpExists(failing)("jump.mp3")).toBe(false);
  });
});
