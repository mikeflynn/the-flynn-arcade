import { afterEach, describe, expect, it, vi } from "vitest";
import { audioCandidates, GameAudio, type AudioBackend, type GameAudioOptions } from "../src/engine/audio";

interface Played {
  key: string;
  volume: number;
  loop: boolean;
  stopped: boolean;
  volumeNow: number;
}

function fakeBackend() {
  const played: Played[] = [];
  const backend: AudioBackend = {
    play(key, { volume, loop }) {
      const entry: Played = { key, volume, loop, stopped: false, volumeNow: volume };
      played.push(entry);
      return {
        stop: () => {
          entry.stopped = true;
        },
        setVolume: (v) => {
          entry.volumeNow = v;
        },
      };
    },
  };
  return { backend, played };
}

const sfx = { jump: { file: "jump", volume: 0.5 }, donut: { file: "donut", volume: 1 } };
const music = { title: { file: "title", volume: 0.5 }, level1: { file: "level1", volume: 1 } };

function makeAudio(available: string[], extra: Partial<GameAudioOptions> = {}) {
  const fake = fakeBackend();
  const audio = new GameAudio(fake.backend, {
    sfx,
    music,
    available: new Set(available),
    sfxVolume: 0.8,
    musicVolume: 0.5,
    muted: false,
    fadeMs: 0,
    info: () => {},
    ...extra,
  });
  return { audio, ...fake };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("GameAudio sound effects", () => {
  it("plays a loaded sound at its volume times the effects volume", () => {
    const { audio, played } = makeAudio(["sfx:jump"]);
    audio.playSfx("jump");
    expect(played).toEqual([{ key: "sfx:jump", volume: 0.4, loop: false, stopped: false, volumeNow: 0.4 }]);
  });

  it("quietly skips a sound whose file is missing", () => {
    const { audio, played } = makeAudio([]);
    expect(() => audio.playSfx("jump")).not.toThrow();
    expect(() => audio.playSfx("not-a-sound")).not.toThrow();
    expect(played).toEqual([]);
  });

  it("plays nothing while muted", () => {
    const { audio, played } = makeAudio(["sfx:jump"], { muted: true });
    audio.playSfx("jump");
    expect(played).toEqual([]);
  });

  it("doesn't crash the game if the sound system throws", () => {
    const audio = new GameAudio(
      {
        play: () => {
          throw new Error("audio broke");
        },
      },
      { sfx, music, available: new Set(["sfx:jump", "music:title"]), sfxVolume: 1, musicVolume: 1, muted: false, fadeMs: 0 },
    );
    expect(() => audio.playSfx("jump")).not.toThrow();
    expect(() => audio.playMusic("title")).not.toThrow();
  });
});

describe("GameAudio music", () => {
  it("loops music and doesn't restart a track that's already playing", () => {
    const { audio, played } = makeAudio(["music:title"]);
    audio.playMusic("title");
    audio.playMusic("title");
    expect(played).toHaveLength(1);
    expect(played[0]).toMatchObject({ key: "music:title", loop: true, volumeNow: 0.25 });
  });

  it("stops the old track when switching", () => {
    const { audio, played } = makeAudio(["music:title", "music:level1"]);
    audio.playMusic("title");
    audio.playMusic("level1");
    expect(played[0].stopped).toBe(true);
    expect(played[1]).toMatchObject({ key: "music:level1", stopped: false });
  });

  it("stops music when muted and brings the same track back when unmuted", () => {
    const { audio, played } = makeAudio(["music:title"]);
    audio.playMusic("title");
    expect(audio.toggleMute()).toBe(true);
    expect(played[0].stopped).toBe(true);
    expect(audio.toggleMute()).toBe(false);
    expect(played).toHaveLength(2);
    expect(played[1]).toMatchObject({ key: "music:title", stopped: false });
  });

  it("skips a missing track but still plays the next one", () => {
    const { audio, played } = makeAudio(["music:level1"]);
    audio.playMusic("title");
    audio.playMusic("level1");
    expect(played.map((p) => p.key)).toEqual(["music:level1"]);
  });

  it("fades music in", () => {
    vi.useFakeTimers();
    const { audio, played } = makeAudio(["music:level1"], { fadeMs: 500 });
    audio.playMusic("level1");
    expect(played[0].volumeNow).toBe(0);
    vi.advanceTimersByTime(500);
    expect(played[0].volumeNow).toBeCloseTo(0.5);
  });
});

describe("GameAudio.reportMissing", () => {
  it("lists only the missing files, once", () => {
    const info = vi.fn();
    const { audio } = makeAudio(["sfx:jump", "music:title"], { info });
    const message = audio.reportMissing();
    expect(message).toContain("No sound for: donut.");
    expect(message).toContain("No music for: level1.");
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("says nothing when every file is there", () => {
    const info = vi.fn();
    const { audio } = makeAudio(["sfx:jump", "sfx:donut", "music:title", "music:level1"], { info });
    expect(audio.reportMissing()).toBeNull();
    expect(info).not.toHaveBeenCalled();
  });
});

describe("audioCandidates", () => {
  it("looks for .mp3 first, then .ogg", () => {
    expect(audioCandidates({ jump: { file: "jump", volume: 1 } }, { title: { file: "title", volume: 1 } })).toEqual([
      { key: "sfx:jump", urls: ["assets/sounds/jump.mp3", "assets/sounds/jump.ogg"] },
      { key: "music:title", urls: ["assets/music/title.mp3", "assets/music/title.ogg"] },
    ]);
  });
});
