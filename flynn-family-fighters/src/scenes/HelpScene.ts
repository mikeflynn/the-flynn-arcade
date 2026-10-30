import Phaser from "phaser";
import { player1Controls, player2Controls } from "../controls";
import { controlRows } from "../help";
import { backPressed, label, pickPressed } from "../render/menu";
import { getServices } from "./BootScene";

export interface HelpData {
  /** Where to go back to: the title screen, or the paused fight underneath. */
  back: "title" | "fight";
}

const COLUMNS = [
  { title: "PLAYER 1", key: "p1", x: 400, color: "#bcd6ff" },
  { title: "PLAYER 2", key: "p2", x: 620, color: "#ffc4c4" },
  { title: "GAMEPAD", key: "pad", x: 844, color: "#fff6c8" },
] as const;
const ROW_TOP = 128;
const ROW_SPACING = 38;

/** The controls, straight from controls.ts: change a key there and it shows up here. */
export class HelpScene extends Phaser.Scene {
  private back: HelpData["back"] = "title";

  constructor() {
    super("help");
  }

  init(data: HelpData): void {
    this.back = data.back ?? "title";
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    this.add.rectangle(480, 270, 960, 540, 0x160c22);
    label(this, "CONTROLS", 480, 24, { align: "center", color: "#ffd23b" });

    COLUMNS.forEach((c) => label(this, c.title, c.x, 88, { size: 16, align: "center", color: c.color }));
    controlRows(player1Controls, player2Controls).forEach((row, i) => {
      const y = ROW_TOP + i * ROW_SPACING;
      label(this, row.label, 40, y, { size: 16, color: "#ffd23b" });
      COLUMNS.forEach((c) => label(this, row[c.key], c.x, y, { size: 16, align: "center" }));
    });

    label(this, "Change them in src/controls.ts", 480, 472, { size: 16, align: "center", color: "#9a8fb0" });
    label(this, "PUNCH, KICK OR START TO GO BACK", 480, 508, { size: 16, align: "center", color: "#fff6c8" });
  }

  update(): void {
    const { input, audio } = getServices();
    input.update();
    if (input.anyJustPressed("mute")) audio.toggleMute();
    if (!pickPressed(input) && !backPressed(input)) return;
    audio.playSfx("menuSelect");
    if (this.back === "fight") {
      // Back to the pause menu, right where the fight stopped.
      this.scene.resume("fight");
      this.scene.stop();
    } else {
      this.scene.start("title");
    }
  }
}
