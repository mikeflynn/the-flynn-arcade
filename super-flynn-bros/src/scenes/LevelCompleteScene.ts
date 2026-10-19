import Phaser from "phaser";
import { getServices, type GameMode } from "../engine/services";
import { addText, blink, formatTime } from "../engine/ui";
import { levels } from "../levels";

export interface LevelCompleteData {
  mode: GameMode;
  levelIndex: number;
  score: number;
  donuts: number;
  timeMs: number;
}

/** "You made it!" Then on to the next level (or the ending). */
export class LevelCompleteScene extends Phaser.Scene {
  private result!: LevelCompleteData;
  private ready = false;
  private leaving = false;

  constructor() {
    super("LevelComplete");
  }

  create(result: LevelCompleteData): void {
    this.result = result;
    this.ready = false;
    this.leaving = false;
    const { width, height } = this.scale;
    const level = levels[result.levelIndex];
    this.add.rectangle(0, 0, width, height, 0x1a1c2c).setOrigin(0);
    addText(this, width / 2, 36, "YOU MADE IT!", 24, "#f6d860");
    addText(this, width / 2, 62, `LEVEL ${result.levelIndex + 1}: ${level.name.toUpperCase()}`, 8);
    addText(this, width / 2, 88, `DONUTS  x${result.donuts}`, 8);
    addText(this, width / 2, 100, `TIME    ${formatTime(result.timeMs)}`, 8);
    addText(this, width / 2, 112, `SCORE   ${result.score}`, 8);
    blink(this, addText(this, width / 2, 146, "PRESS START", 8));
    getServices().audio.playMusic("levelComplete");
    this.time.delayedCall(800, () => {
      this.ready = true;
    });
    this.time.delayedCall(8000, () => this.next());
  }

  update(): void {
    const { input } = getServices();
    if (this.ready && (input.anyJustPressed("confirm") || input.anyJustPressed("jump"))) this.next();
  }

  private next(): void {
    if (this.leaving) return;
    this.leaving = true;
    const { mode, levelIndex, score } = this.result;
    if (levelIndex + 1 < levels.length) this.scene.start("Play", { mode, levelIndex: levelIndex + 1, score });
    else this.scene.start("Ending", { score });
  }
}
