import Phaser from "phaser";
import { playerBadges } from "../badges";
import type { Slot } from "../selection";
import { settings } from "../settings";
import { HEIGHT, outlined, toColor, WIDTH } from "./style";

const TOP = 130;
const BOTTOM = HEIGHT - 5;
const SLANT = 10;

/** The slanted comic-style panel at the bottom: title, player badges, and the typed-out blurb. */
export class InfoPanel {
  private readonly accent: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly blurb: Phaser.GameObjects.Text;
  private readonly badges: Phaser.GameObjects.Container;
  private typing: Phaser.Time.TimerEvent | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const panel = scene.add.graphics().setDepth(3);
    const points = [
      new Phaser.Geom.Point(4 + SLANT, TOP),
      new Phaser.Geom.Point(WIDTH - 4, TOP),
      new Phaser.Geom.Point(WIDTH - 4 - SLANT, BOTTOM),
      new Phaser.Geom.Point(4, BOTTOM),
    ];
    panel.fillStyle(0xffffff, 1);
    panel.fillPoints(points, true);
    panel.lineStyle(2, 0x000000, 1);
    panel.strokePoints(points, true);
    this.accent = scene.add.graphics().setDepth(3);
    this.title = outlined(scene, 22, TOP + 9, "", 12, "#fff35c").setOrigin(0, 0.5).setDepth(4);
    this.badges = scene.add.container(WIDTH - 22, TOP + 9).setDepth(4);
    this.blurb = scene.add
      .text(18, TOP + 16, "", { fontFamily: "monospace", fontSize: "8px", color: "#1b1464", wordWrap: { width: WIDTH - 44 } })
      .setDepth(4);
  }

  show(slot: Slot): void {
    const game = slot.kind === "game" ? slot.game : null;
    this.accent.clear();
    this.accent.fillStyle(toColor(game ? game.colors.primary : "#9aa3b5"), 1);
    this.accent.fillPoints(
      [
        new Phaser.Geom.Point(5 + SLANT, TOP + 1),
        new Phaser.Geom.Point(WIDTH - 5, TOP + 1),
        new Phaser.Geom.Point(WIDTH - 5 - 1, TOP + 4),
        new Phaser.Geom.Point(5 + SLANT - 1, TOP + 4),
      ],
      true,
    );
    this.title.setText(game ? game.title : "COMING SOON");
    this.showBadges(game ? playerBadges(game.players) : []);
    this.typeOut(game ? game.blurb : "A new game is being built! Want to make one?");
  }

  private showBadges(labels: { text: string; color: string }[]): void {
    this.badges.removeAll(true);
    let right = 0;
    for (const { text, color } of [...labels].reverse()) {
      const label = outlined(this.scene, 0, 0, text, 8);
      const width = label.width + 6;
      const box = this.scene.add.graphics();
      box.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
      box.fillRoundedRect(right - width, -6, width, 12, 3);
      box.lineStyle(1, 0x000000, 1);
      box.strokeRoundedRect(right - width, -6, width, 12, 3);
      label.setX(right - width / 2);
      this.badges.add([box, label]);
      right -= width + 3;
    }
  }

  private typeOut(text: string): void {
    this.typing?.remove();
    this.blurb.setText("");
    let shown = 0;
    this.typing = this.scene.time.addEvent({
      delay: 1000 / settings.typeLettersPerSecond,
      repeat: text.length - 1,
      callback: () => {
        shown++;
        this.blurb.setText(text.slice(0, shown));
      },
    });
  }
}
