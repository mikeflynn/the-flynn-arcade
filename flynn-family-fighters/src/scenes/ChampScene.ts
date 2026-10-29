import Phaser from "phaser";
import { FighterSprite } from "@web-games/rig/phaser";
import type { FlowState } from "../flow";
import { bakedFighter } from "../render/bakeCache";
import { addLogo, makeLogo } from "../render/logo";
import { flashOn, label, pickPressed, useMenuControls } from "../render/menu";
import { drawStage, type StageView } from "../render/stageView";
import { settings } from "../settings";
import { stageById } from "../stages";
import { getServices } from "./BootScene";

/** Wait this long before a button press goes back to the title (ms), so a mashed punch doesn't skip it. */
const HOLD_MS = 2000;

let champCount = 0;

/** You beat everyone! The winner in their win pose, their win quote, and "YOU'RE THE CHAMP!". */
export class ChampScene extends Phaser.Scene {
  private flow!: FlowState;
  private sprite: FighterSprite | null = null;
  private stageView!: StageView;
  private logoKey = "";
  private prompt!: Phaser.GameObjects.Text;
  private shownAt = 0;

  constructor() {
    super("champ");
  }

  init(data: FlowState): void {
    this.flow = data;
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    const { input, audio, parts } = getServices();
    useMenuControls(input);
    audio.playMusic("title");
    audio.playSfx("youWin");
    const champ = this.flow.p1;

    this.stageView = drawStage(this, stageById(champ.stage));
    const baked = bakedFighter(champ.id, champ.look, settings.animationFps, parts.get(champ.id)); // already baked for the last fight
    this.sprite = new FighterSprite(this, `champ-${champCount++}`, baked).setPosition(480, 488);
    this.sprite.image.setDepth(5);

    this.logoKey = makeLogo(this, [{ text: "YOU'RE THE CHAMP!", size: 24 }]);
    addLogo(this, this.logoKey, 480, 24);
    if (champ.winQuote) label(this, `"${champ.winQuote}"`, 480, 112, { align: "center", wrap: 880 }).setDepth(10);
    this.prompt = label(this, "PRESS START", 480, 512, { size: 16, align: "center", color: "#ffd23b" }).setDepth(10).setVisible(false);

    this.shownAt = this.game.loop.time; // the same clock update() is given
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sprite?.destroy();
      this.sprite = null;
      this.stageView.destroy();
      this.textures.remove(this.logoKey);
    });
  }

  update(time: number): void {
    const { input, audio } = getServices();
    input.update();
    if (input.anyJustPressed("mute")) audio.toggleMute();
    this.stageView.update(time);
    this.sprite?.show("win", Math.floor(((time - this.shownAt) * 60) / 1000));

    const ready = time - this.shownAt >= HOLD_MS;
    this.prompt.setVisible(ready && flashOn(time, 800));
    if (ready && pickPressed(input)) this.scene.start("title");
  }
}
