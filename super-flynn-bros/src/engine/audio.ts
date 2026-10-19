import type { AssetCandidate } from "./assets";

export interface SoundDef {
  /** File name without .mp3/.ogg. */
  file: string;
  /** 0 to 1. Multiplied by the music or sound effects volume in settings.ts. */
  volume: number;
  /** Music only: keep repeating? (default: yes) */
  loop?: boolean;
}

export interface PlayingSound {
  stop(): void;
  setVolume(volume: number): void;
}

/** The small piece of a sound system that GameAudio needs. Phaser provides it in the game; tests use a fake. */
export interface AudioBackend {
  play(cacheKey: string, options: { volume: number; loop: boolean }): PlayingSound | null;
}

export interface GameAudioOptions {
  sfx: Record<string, SoundDef>;
  music: Record<string, SoundDef>;
  /** Cache keys of the files that actually loaded. */
  available: ReadonlySet<string>;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  /** How long music fades in and out, in milliseconds. */
  fadeMs?: number;
  info?: (message: string) => void;
}

export const sfxCacheKey = (key: string): string => `sfx:${key}`;
export const musicCacheKey = (key: string): string => `music:${key}`;

/** Every sound and music file the game could use: .mp3 first, then .ogg. */
export function audioCandidates(sfx: Record<string, SoundDef>, music: Record<string, SoundDef>): AssetCandidate[] {
  const list = (defs: Record<string, SoundDef>, folder: string, cacheKey: (key: string) => string) =>
    Object.entries(defs).map(([key, def]) => ({
      key: cacheKey(key),
      urls: [`assets/${folder}/${def.file}.mp3`, `assets/${folder}/${def.file}.ogg`],
    }));
  return [...list(sfx, "sounds", sfxCacheKey), ...list(music, "music", musicCacheKey)];
}

/**
 * Plays sound effects and music. Anything that isn't loaded (because the file
 * hasn't been added yet) is quietly skipped. This class never throws.
 */
export class GameAudio {
  private current: { key: string; sound: PlayingSound; volume: number } | null = null;
  private wantedMusic: string | null = null;
  private isMuted: boolean;

  constructor(
    private readonly backend: AudioBackend,
    private readonly options: GameAudioOptions,
  ) {
    this.isMuted = options.muted;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  /** Logs which files haven't been added yet. Returns the message, or null if nothing is missing. */
  reportMissing(): string | null {
    const missing = (defs: Record<string, SoundDef>, cacheKey: (key: string) => string) =>
      Object.keys(defs).filter((key) => !this.options.available.has(cacheKey(key)));
    const sfx = missing(this.options.sfx, sfxCacheKey);
    const music = missing(this.options.music, musicCacheKey);
    if (sfx.length === 0 && music.length === 0) return null;
    const parts: string[] = [];
    if (sfx.length) parts.push(`No sound for: ${sfx.join(", ")}. Add files to public/assets/sounds/ to hear them!`);
    if (music.length) parts.push(`No music for: ${music.join(", ")}. Add files to public/assets/music/ to hear them!`);
    const message = parts.join("\n");
    (this.options.info ?? console.info)(message);
    return message;
  }

  playSfx(key: string): void {
    const def = this.options.sfx[key];
    const cacheKey = sfxCacheKey(key);
    if (this.isMuted || !def || !this.options.available.has(cacheKey)) return;
    this.safely(() => this.backend.play(cacheKey, { volume: def.volume * this.options.sfxVolume, loop: false }));
  }

  playMusic(key: string): void {
    if (this.wantedMusic === key) return;
    this.wantedMusic = key;
    this.fadeOutCurrent();
    if (!this.isMuted) this.startWanted();
  }

  stopMusic(): void {
    this.wantedMusic = null;
    this.fadeOutCurrent();
  }

  setMuted(muted: boolean): void {
    if (muted === this.isMuted) return;
    this.isMuted = muted;
    if (muted) this.fadeOutCurrent(0);
    else this.startWanted();
  }

  toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private startWanted(): void {
    const key = this.wantedMusic;
    if (!key) return;
    const def = this.options.music[key];
    const cacheKey = musicCacheKey(key);
    if (!def || !this.options.available.has(cacheKey)) return;
    const volume = def.volume * this.options.musicVolume;
    const fadeMs = this.options.fadeMs ?? 500;
    const sound = this.safely(() =>
      this.backend.play(cacheKey, { volume: fadeMs > 0 ? 0 : volume, loop: def.loop ?? true }),
    );
    if (!sound) return;
    this.current = { key, sound, volume };
    this.fade(sound, 0, volume, fadeMs);
  }

  private fadeOutCurrent(ms = this.options.fadeMs ?? 500): void {
    const old = this.current;
    this.current = null;
    if (!old) return;
    this.fade(old.sound, old.volume, 0, ms, () => this.safely(() => old.sound.stop()));
  }

  private fade(sound: PlayingSound, from: number, to: number, ms: number, done?: () => void): void {
    if (ms <= 0) {
      this.safely(() => sound.setVolume(to));
      done?.();
      return;
    }
    const steps = Math.max(1, Math.round(ms / 50));
    let step = 0;
    const timer = setInterval(() => {
      step++;
      this.safely(() => sound.setVolume(from + (to - from) * (step / steps)));
      if (step >= steps) {
        clearInterval(timer);
        done?.();
      }
    }, ms / steps);
  }

  private safely<T>(fn: () => T): T | null {
    try {
      return fn();
    } catch {
      return null;
    }
  }
}
