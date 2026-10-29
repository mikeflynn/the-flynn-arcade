import { describe, expect, it } from "vitest";
import { htmlAudioBackend, type AudioFactory } from "../src/htmlAudio";

interface FakeAudio {
  url: string;
  volume: number;
  loop: boolean;
  paused: boolean;
  listeners: Record<string, () => void>;
}

function fakeFactory(playBehavior: "ok" | "reject" | "throw" = "ok") {
  const made: FakeAudio[] = [];
  const make: AudioFactory = (url) => {
    const a: FakeAudio = { url, volume: 1, loop: false, paused: true, listeners: {} };
    made.push(a);
    return {
      get volume() { return a.volume; },
      set volume(v: number) { a.volume = v; },
      get loop() { return a.loop; },
      set loop(v: boolean) { a.loop = v; },
      play: () => {
        if (playBehavior === "throw") throw new Error("nope");
        a.paused = false;
        return playBehavior === "reject" ? Promise.reject(new Error("blocked")) : Promise.resolve();
      },
      pause: () => { a.paused = true; },
      addEventListener: (type, fn) => { a.listeners[type] = fn; },
    };
  };
  return { made, make };
}

const files = new Map([["sfx:coin", ["assets/sounds/coin.mp3", "assets/sounds/coin.ogg"]]]);

describe("htmlAudioBackend", () => {
  it("plays the first file for a sound, with its volume and loop", () => {
    const { made, make } = fakeFactory();
    const handle = htmlAudioBackend(files, make).play("sfx:coin", { volume: 0.5, loop: false });
    expect(handle).not.toBeNull();
    expect(made[0]).toMatchObject({ url: "assets/sounds/coin.mp3", volume: 0.5, loop: false, paused: false });
  });

  it("returns null for a sound it has no file for", () => {
    expect(htmlAudioBackend(files, fakeFactory().make).play("sfx:boom", { volume: 1, loop: false })).toBeNull();
  });

  it("never throws when the browser refuses to play", () => {
    for (const behavior of ["reject", "throw"] as const) {
      const backend = htmlAudioBackend(files, fakeFactory(behavior).make);
      expect(() => backend.play("sfx:coin", { volume: 1, loop: true })).not.toThrow();
      expect(backend.play("sfx:coin", { volume: 1, loop: true })).not.toBeNull();
    }
  });

  it("stop pauses, and setVolume stays between 0 and 1", () => {
    const { made, make } = fakeFactory();
    const handle = htmlAudioBackend(files, make).play("sfx:coin", { volume: 0.5, loop: true })!;
    handle.setVolume(3);
    expect(made[0].volume).toBe(1);
    handle.setVolume(-1);
    expect(made[0].volume).toBe(0);
    handle.stop();
    expect(made[0].paused).toBe(true);
  });

  it("switches to the backup file after the first one fails", () => {
    const { made, make } = fakeFactory();
    const backend = htmlAudioBackend(files, make);
    backend.play("sfx:coin", { volume: 1, loop: false });
    made[0].listeners.error!();
    backend.play("sfx:coin", { volume: 1, loop: false });
    expect(made[1].url).toBe("assets/sounds/coin.ogg");
  });
});
