import Phaser from "phaser";
import type { FlowState } from "../flow";
import { label, Menu, useMenuControls } from "../render/menu";
import { getServices } from "./BootScene";
import type { SelectData } from "./SelectScene";

/** Arcade mode after a loss: try that fight again, or stop. */
const ARCADE_OPTIONS = ["CONTINUE", "QUIT TO TITLE"] as const;
/** Versus mode after any match. */
const VERSUS_OPTIONS = ["REMATCH", "CHARACTER SELECT", "QUIT TO TITLE"] as const;

/** The menu after a match, shown over the finished (paused) fight. */
export class AfterMatchScene extends Phaser.Scene {
  private flow!: FlowState;
  private options: readonly string[] = [];
  private menu!: Menu;

  constructor() {
    super("aftermatch");
  }

  init(data: FlowState): void {
    this.flow = data;
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    useMenuControls(getServices().input);
    const arcade = this.flow.mode === "arcade";
    this.options = arcade ? ARCADE_OPTIONS : VERSUS_OPTIONS;

    const h = 112 + this.options.length * 56;
    const top = Math.round((540 - h) / 4) * 2;
    this.add.rectangle(480, top + h / 2, 600, h, 0x160c22).setStrokeStyle(8, 0xffd23b);
    label(this, arcade ? "CONTINUE?" : "WHAT NEXT?", 480, top + 32, { align: "center", color: "#ffd23b" });
    this.menu = new Menu(this, this.options, 480, top + 96);
  }

  update(time: number): void {
    const { input, audio } = getServices();
    input.update();
    if (input.anyJustPressed("mute")) audio.toggleMute();
    const picked = this.menu.update(input, audio, time);
    if (picked === null) return;

    const choice = this.options[picked];
    this.scene.stop("fight");
    if (choice === "CONTINUE" || choice === "REMATCH") this.scene.start("versus", this.flow);
    else if (choice === "CHARACTER SELECT") {
      this.scene.start("select", { mode: "versus", p1Id: this.flow.p1.id, p2Id: this.flow.p2?.id } satisfies SelectData);
    } else this.scene.start("title");
  }
}
