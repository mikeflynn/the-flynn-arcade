import type { AudioBackend } from "./audio";

/** The small piece of the browser's Audio element this backend uses (tests pass a fake). */
export type AudioFactory = (url: string) => {
  volume: number;
  loop: boolean;
  play(): Promise<void> | void;
  pause(): void;
  addEventListener(type: "ended" | "error", fn: () => void): void;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/**
 * Connects GameAudio to plain browser audio, for pages that don't use Phaser
 * (like the arcade poster). `files` maps each cache key to its file URLs,
 * .mp3 first: if a file won't play, the next one is used from then on.
 */
export function htmlAudioBackend(
  files: ReadonlyMap<string, string[]>,
  make: AudioFactory = (url) => new Audio(url),
): AudioBackend {
  const choice = new Map<string, number>();
  return {
    play(cacheKey, { volume, loop }) {
      const urls = files.get(cacheKey);
      const index = choice.get(cacheKey) ?? 0;
      const url = urls?.[index];
      if (!url) return null;
      let audio: ReturnType<AudioFactory>;
      try {
        audio = make(url);
        audio.volume = clamp01(volume);
        audio.loop = loop;
        audio.addEventListener("error", () => {
          if ((choice.get(cacheKey) ?? 0) === index) choice.set(cacheKey, index + 1);
        });
        // Browsers refuse to play before the first click or key press: that's fine, stay quiet.
        Promise.resolve(audio.play()).catch(() => {});
      } catch {
        return { stop: () => {}, setVolume: () => {} };
      }
      return {
        stop: () => {
          try {
            audio.pause();
          } catch {
            /* already gone */
          }
        },
        setVolume: (v) => {
          audio.volume = clamp01(v);
        },
      };
    },
  };
}
