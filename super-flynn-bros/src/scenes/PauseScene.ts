import Phaser from "phaser";
import { getServices, goToArcade, toggleMute, useControls } from "../engine/services";
import { addText, Menu } from "../engine/ui";

export class PauseScene extends Phaser.Scene {
  private menu!: Menu;

  constructor() {
    super("Pause");
  }

  create(): void {
    const { width, height } = this.scale;
    const { audio } = getServices();
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    addText(this, width / 2, 50, "PAUSED", 16, "#f6d860");
    this.menu = new Menu(
      this,
      width / 2,
      82,
      () => ["RESUME", `SOUND: ${getServices().audio.muted ? "OFF" : "ON"}`, "QUIT TO TITLE", "QUIT TO ARCADE"],
      (i) => this.pick(i),
      (key) => audio.playSfx(key),
    );
  }

  update(): void {
    const { input } = getServices();
    if (input.anyJustPressed("pause")) {
      this.resume();
      return;
    }
    this.menu.update(input);
  }

  private pick(index: number): void {
    if (index === 0) this.resume();
    else if (index === 1) toggleMute();
    else if (index === 2) this.quit();
    else goToArcade();
  }

  private resume(): void {
    this.scene.resume("Play");
    this.scene.stop();
  }

  private quit(): void {
    this.scene.stop("Hud");
    this.scene.stop("Play");
    useControls(getServices().input, "menu");
    this.scene.start("Title");
  }
}
