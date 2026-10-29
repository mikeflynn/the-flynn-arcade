import Phaser from "phaser";
import { arcadeUrl } from "@web-games/arcade";
import { addLogo, makeLogo } from "../render/logo";
import { label, Menu, useMenuControls } from "../render/menu";
import { drawStage, type StageView } from "../render/stageView";
import { stageById } from "../stages";
import { getServices } from "./BootScene";
import type { SelectData } from "./SelectScene";

const OPTIONS = ["1P ARCADE", "2P VERSUS", "QUIT TO ARCADE"] as const;

/** The title: the big logo over the track, and the main menu. */
export class TitleScene extends Phaser.Scene {
  private menu!: Menu;
  private stageView!: StageView;
  private logoKey = "";

  constructor() {
    super("title");
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    const { input, audio } = getServices();
    useMenuControls(input);
    audio.playMusic("title");

    this.stageView = drawStage(this, stageById("track"));
    // 🛠️ TRY THIS: change the words or the letter sizes (multiples of 8 stay crisp).
    this.logoKey = makeLogo(this, [
      { text: "FLYNN FAMILY", size: 32 },
      { text: "FIGHTERS", size: 48 },
    ]);
    addLogo(this, this.logoKey, 480, 40);

    // A dark strip behind the menu so it reads over the busy stage.
    this.add.rectangle(480, 420, 560, 200, 0x160c22).setDepth(9);
    this.menu = new Menu(this, OPTIONS, 480, 340, 56);
    label(this, "PUNCH OR START TO PICK", 480, 496, { size: 16, align: "center", color: "#fff6c8" }).setDepth(10);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stageView.destroy();
      this.textures.remove(this.logoKey);
    });
  }

  update(time: number): void {
    const { input, audio } = getServices();
    input.update();
    if (input.anyJustPressed("mute")) audio.toggleMute();
    this.stageView.update(time);

    const picked = this.menu.update(input, audio, time);
    if (picked === null) return;
    const choice = OPTIONS[picked];
    if (choice === "1P ARCADE") this.scene.start("select", { mode: "arcade" } satisfies SelectData);
    else if (choice === "2P VERSUS") this.scene.start("select", { mode: "versus" } satisfies SelectData);
    else window.location.assign(arcadeUrl("flynn-family-fighters", { dev: import.meta.env.DEV }));
  }
}
