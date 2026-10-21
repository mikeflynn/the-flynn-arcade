import Phaser from "phaser";
import { createBackground } from "../engine/backgrounds";
import { tileFrame } from "../engine/tileset";
import { addPicture } from "../engine/sprites";
import { getServices, useControls, type GameMode } from "../engine/services";
import { addText, blink, Menu } from "../engine/ui";
import { levels } from "../levels";

const GROUND_Y = 144;
const MODES: GameMode[] = ["colin", "ryan", "coop"];

export class TitleScene extends Phaser.Scene {
  private state: "press" | "menu" = "press";
  private menu: Menu | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  private mode: GameMode = "colin";

  constructor() {
    super("Title");
  }

  create(): void {
    this.state = "press";
    this.menu = null;
    const { width } = this.scale;
    const { tileset, artSizes, audio } = getServices();
    // Swap to the title music right away (after quitting or the ending). On the
    // very first visit the browser holds it until the first key press.
    audio.playMusic("title");

    createBackground(this, "morning", GROUND_Y)(0);
    this.add.tileSprite(0, GROUND_Y, width, 16, "tiles", tileFrame(tileset, "sidewalk", "art")).setOrigin(0);
    this.add.tileSprite(0, GROUND_Y + 16, width, 16, "tiles", tileFrame(tileset, "sidewalk", "under")).setOrigin(0);
    addPicture(this, "colin", 140, GROUND_Y, artSizes.get("colin")!);
    addPicture(this, "ryan", 180, GROUND_Y, artSizes.get("ryan")!).setFlipX(true);

    addText(this, width / 2, 30, "SUPER FLYNN BROS", 24, "#f6d860");
    addText(this, width / 2, 52, "WOODLAND HILLS, CA", 8);
    this.prompt = addText(this, width / 2, 92, "PRESS START", 8);
    blink(this, this.prompt);
    addText(this, width / 2, 168, "P1: ARROWS + SPACE   P2: A D W   M: MUTE", 8, "#d4f1ff");
  }

  update(): void {
    const { input, audio } = getServices();
    if (this.state === "press") {
      if (input.anyJustPressed("confirm") || input.anyJustPressed("jump") || input.anyJustPressed("pause")) {
        // Browsers only allow sound after a key press, so the music starts here.
        audio.playMusic("title");
        audio.playSfx("menuSelect");
        this.prompt?.destroy();
        this.showModeMenu();
      }
      return;
    }
    this.menu?.update(input);
  }

  private showModeMenu(): void {
    this.state = "menu";
    this.setMenu(76, () => ["1P COLIN", "1P RYAN", "2P CO-OP"], (i) => this.pickMode(MODES[i]));
  }

  private pickMode(mode: GameMode): void {
    this.mode = mode;
    const unlocked = Math.min(getServices().progress.unlockedLevels, levels.length);
    if (unlocked <= 1) {
      this.startGame(0);
      return;
    }
    this.setMenu(
      70,
      () => levels.slice(0, unlocked).map((level, i) => `${i + 1}. ${level.name.toUpperCase()}`),
      (i) => this.startGame(i),
    );
  }

  private setMenu(y: number, labels: () => string[], onPick: (index: number) => void): void {
    this.menu?.destroy();
    const { audio } = getServices();
    this.menu = new Menu(this, this.scale.width / 2, y, labels, onPick, (key) => audio.playSfx(key));
  }

  private startGame(levelIndex: number): void {
    useControls(getServices().input, this.mode);
    this.scene.start("Play", { mode: this.mode, levelIndex, score: 0 });
  }
}
