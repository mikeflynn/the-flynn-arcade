import Phaser from "phaser";
import { createBackground } from "../engine/backgrounds";
import { tileFrame } from "../engine/tileset";
import { addPicture } from "../engine/sprites";
import { getServices, useControls } from "../engine/services";
import { addText, blink } from "../engine/ui";

const GROUND_Y = 144;

/** Home sweet home! */
export class EndingScene extends Phaser.Scene {
  private ready = false;

  constructor() {
    super("Ending");
  }

  create({ score }: { score: number }): void {
    this.ready = false;
    const { width } = this.scale;
    const { tileset, artSizes, audio } = getServices();
    createBackground(this, "sunset", GROUND_Y)(0);
    this.add.tileSprite(0, GROUND_Y, width, 16, "tiles", tileFrame(tileset, "sidewalk", "art")).setOrigin(0);
    this.add.tileSprite(0, GROUND_Y + 16, width, 16, "tiles", tileFrame(tileset, "sidewalk", "under")).setOrigin(0);
    addPicture(this, "colin", 145, GROUND_Y, artSizes.get("colin")!);
    addPicture(this, "ryan", 175, GROUND_Y, artSizes.get("ryan")!).setFlipX(true);
    addText(this, width / 2, 32, "HOME SWEET HOME!", 24, "#f6d860");
    addText(this, width / 2, 58, `TOTAL SCORE ${score}`, 8);
    addText(this, width / 2, 70, "THANKS FOR PLAYING!", 8);
    blink(this, addText(this, width / 2, 92, "PRESS START", 8));
    audio.playMusic("ending");
    this.time.delayedCall(1000, () => {
      this.ready = true;
    });
  }

  update(): void {
    const { input } = getServices();
    if (this.ready && (input.anyJustPressed("confirm") || input.anyJustPressed("jump"))) {
      useControls(input, "menu");
      this.scene.start("Title");
    }
  }
}
