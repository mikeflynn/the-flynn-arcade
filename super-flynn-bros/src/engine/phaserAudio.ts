import type Phaser from "phaser";
import type { AudioBackend } from "./audio";

type VolumeSound = Phaser.Sound.BaseSound & { setVolume(value: number): unknown };

/** Connects GameAudio to Phaser's sound system. */
export function phaserAudioBackend(manager: Phaser.Sound.BaseSoundManager): AudioBackend {
  return {
    play(cacheKey, { volume, loop }) {
      const sound = manager.add(cacheKey, { volume, loop }) as VolumeSound;
      let gone = false;
      const cleanUp = () => {
        if (gone) return;
        gone = true;
        sound.destroy();
      };
      if (!loop) sound.once("complete", cleanUp);
      sound.play();
      return {
        stop: () => {
          if (gone) return;
          sound.stop();
          cleanUp();
        },
        setVolume: (value) => {
          if (!gone) sound.setVolume(value);
        },
      };
    },
  };
}
