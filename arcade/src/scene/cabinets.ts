import Phaser from "phaser";
import { makeSpriteSheet } from "@web-games/pixel-art";
import { cabinetArt } from "../cabinet";
import { cabinetPalette, findRegion, type Region } from "../layout";
import type { Slot } from "../selection";
import { colors } from "../settings";
import { CABINET_BASE_Y, outlined, toColor, WIDTH } from "./style";

const SPACING = 64;
const SELECTED_SCALE = 1.1;
const OTHER_SCALE = 0.9;

const fallback = (width: number, height: number): Region => ({ x: 0, y: 0, width, height });

/** The row of arcade cabinets, with the glowing outline and "1P"/"2P" tags on the selected one. */
export class CabinetRow {
  private readonly row: Phaser.GameObjects.Container;
  private readonly cabinets: Phaser.GameObjects.Container[] = [];
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly tags: Phaser.GameObjects.Container;
  private readonly screen: Region;
  private readonly marquee: Region;
  private readonly width: number;
  private readonly height: number;
  private index = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly slots: Slot[],
  ) {
    this.width = Math.max(...cabinetArt.map((row) => row.length));
    this.height = cabinetArt.length;
    this.screen = findRegion(cabinetArt, "G") ?? fallback(this.width, this.height);
    this.marquee = findRegion(cabinetArt, "M") ?? fallback(this.width, 8);
    this.row = scene.add.container(0, CABINET_BASE_Y).setDepth(2);
    slots.forEach((slot, i) => this.cabinets.push(this.buildCabinet(slot, i)));

    this.highlight = scene.add.graphics();
    this.highlight.lineStyle(3, toColor(colors.highlight), 1);
    this.highlight.strokeRect(-this.width / 2 - 2, -this.height - 2, this.width + 4, this.height + 2);
    scene.tweens.add({ targets: this.highlight, alpha: 0.3, duration: 250, yoyo: true, repeat: -1 });
    this.tags = scene.add.container(0, 0);
  }

  get selected(): number {
    return this.index;
  }

  /** Selects a cabinet: slides the row so it's centered, grows it, and moves the tags onto it. */
  select(index: number, animate = true): void {
    this.index = index;
    const duration = animate ? 150 : 0;
    this.scene.tweens.add({ targets: this.row, x: WIDTH / 2 - index * SPACING, duration, ease: "Quad.easeOut" });
    this.cabinets.forEach((cabinet, i) => {
      this.scene.tweens.add({ targets: cabinet, scale: i === index ? SELECTED_SCALE : OTHER_SCALE, duration });
    });
    const cabinet = this.cabinets[index];
    cabinet.add([this.highlight, this.tags]);
    this.row.bringToTop(cabinet);
    this.buildTags(this.slots[index]);
  }

  /** A "COMING SOON" cabinet was picked: spin its "?" and pop up "NOT YET!". */
  notYet(): void {
    const cabinet = this.cabinets[this.index];
    const question = cabinet.getByName("question") as Phaser.GameObjects.Text | null;
    if (question) this.scene.tweens.add({ targets: question, angle: 360, duration: 400, onComplete: () => question.setAngle(0) });
    const pop = outlined(this.scene, this.screenX(), this.screenY() + 8, "NOT YET!", 10, "#ff2a2a");
    cabinet.add(pop);
    this.scene.tweens.add({ targets: pop, y: pop.y - 8, duration: 200, yoyo: true, hold: 300, onComplete: () => pop.destroy() });
  }

  /** The selected cabinet's screen flashes white (when a game starts). */
  flashScreen(): void {
    const cabinet = this.cabinets[this.index];
    const flash = this.scene.add
      .rectangle(this.screenX(), this.screenY(), this.screen.width, this.screen.height, 0xffffff)
      .setAlpha(1);
    cabinet.add(flash);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
  }

  private screenX(): number {
    return -this.width / 2 + this.screen.x + this.screen.width / 2;
  }

  private screenY(): number {
    return -this.height + this.screen.y + this.screen.height / 2;
  }

  private buildCabinet(slot: Slot, i: number): Phaser.GameObjects.Container {
    const cabinet = this.scene.add.container(i * SPACING, 0).setScale(OTHER_SCALE);
    this.row.add(cabinet);
    const look = slot.kind === "game" ? slot.game.colors : colors.comingSoon;
    const key = slot.kind === "game" ? `cabinet-${slot.game.id}` : "cabinet-soon";
    makeSpriteSheet(this.scene, key, [cabinetArt], cabinetPalette(look.primary, look.secondary));
    cabinet.add(this.scene.add.image(0, 0, key, 0).setOrigin(0.5, 1));

    if (slot.kind === "game") {
      const screenKey = `screen-${slot.game.id}`;
      makeSpriteSheet(this.scene, screenKey, [slot.game.screenArt.art], slot.game.screenArt.colors);
      cabinet.add(this.scene.add.image(this.screenX(), this.screenY(), screenKey, 0));
    } else {
      const question = outlined(this.scene, this.screenX(), this.screenY(), "?", 16, "#fff35c").setName("question");
      cabinet.add(question);
      this.scene.tweens.add({ targets: question, y: question.y - 3, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    cabinet.add(this.chaseLights(look.primary, look.secondary));
    return cabinet;
  }

  /** Two rows of bulbs on the marquee that take turns lighting up, like a real arcade sign. */
  private chaseLights(primary: string, secondary: string): Phaser.GameObjects.Graphics {
    const lights = this.scene.add.graphics();
    const left = -this.width / 2 + this.marquee.x + 1;
    const top = -this.height + this.marquee.y + 1;
    const columns = Math.floor((this.marquee.width - 1) / 4);
    const rows = Math.max(1, Math.floor((this.marquee.height - 1) / 4));
    let phase = 0;
    const draw = () => {
      lights.clear();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const on = (col + row + phase) % 2 === 0;
          lights.fillStyle(toColor(on ? secondary : primary), 1);
          lights.fillRect(left + col * 4, top + row * 4, 3, 3);
        }
      }
      phase = (phase + 1) % 2;
    };
    draw();
    this.scene.time.addEvent({ delay: 250, loop: true, callback: draw });
    return lights;
  }

  private buildTags(slot: Slot): void {
    this.tags.removeAll(true);
    const tag = (x: number, label: string, color: string) => {
      const box = this.scene.add.rectangle(x, 0, 18, 11, toColor(color)).setStrokeStyle(2, 0x000000);
      this.tags.add([box, outlined(this.scene, x, 0, label, 8)]);
    };
    const twoPlayers = slot.kind === "game" && slot.game.players.max >= 2;
    tag(twoPlayers ? -11 : 0, "1P", colors.player1);
    if (twoPlayers) tag(11, "2P", colors.player2);
    this.tags.setY(-this.height - 9);
    this.scene.tweens.killTweensOf(this.tags);
    this.scene.tweens.add({ targets: this.tags, y: this.tags.y - 3, duration: 300, yoyo: true, repeat: -1 });
  }
}
