import Phaser from "phaser";
import { shownFrame } from "@web-games/rig";
import { bakeFighter, type BakedFighter } from "@web-games/rig/canvas";
import { FighterSprite } from "@web-games/rig/phaser";
import { animations } from "../animations";
import type { Fighter } from "../fighter";
import { loadRoster } from "../roster";
import { FPS_CHOICES, settings, type Fps } from "../settings";

const FLOOR_Y = 420;
const SHOW = ["stance", "idle", "walk"];
const FRAMES_PER_ANIMATION = 150; // 2.5 seconds each
const ZOOM = 3;

interface Entry {
  fighter: Fighter;
  baked: BakedFighter;
  sprite: FighterSprite;
}

let textureCounter = 0;
/** Every sprite needs its own texture name, or two fighters would erase each other's pictures. */
const newKey = (id: string) => `fighter-${id}-${textureCounter++}`;

/** ?viewer: a lineup of every fighter, to check how they look and move. C = close-up, F = change fps. */
export class ViewerScene extends Phaser.Scene {
  private entries: Entry[] = [];
  private fps: Fps = settings.animationFps;
  private frame = 0;
  private info!: Phaser.GameObjects.Text;
  private closeUp?: HTMLCanvasElement;

  constructor() {
    super("viewer");
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    this.add.rectangle(480, 270, 960, 540, 0x2a2f45);
    this.add.rectangle(480, FLOOR_Y + 60, 960, 120, 0x4a3f36);
    this.add.rectangle(480, FLOOR_Y, 960, 4, 0x1a1c2c);
    this.info = this.add.text(16, 12, "loading...", { fontFamily: "monospace", fontSize: "20px", color: "#ffffff" });

    this.input.keyboard!.on("keydown-C", () => this.toggleCloseUp());
    this.input.keyboard!.on("keydown-F", () => this.nextFps());
    this.events.once("shutdown", () => this.closeUp?.remove());

    void this.build();
  }

  private async build(): Promise<void> {
    const { fighters, problems } = await loadRoster();
    problems.forEach((p) => console.warn(`🥊 ${p}`));
    fighters.forEach((fighter, i) => {
      const baked = bakeFighter(fighter.look, animations, { fps: this.fps });
      const sprite = new FighterSprite(this, newKey(fighter.id), baked).setPosition((960 * (i + 1)) / (fighters.length + 1), FLOOR_Y);
      this.entries.push({ fighter, baked, sprite });
    });
    this.printInfo(problems);
  }

  private nextFps(): void {
    this.fps = FPS_CHOICES[(FPS_CHOICES.indexOf(this.fps) + 1) % FPS_CHOICES.length]!;
    for (const e of this.entries) {
      e.baked = bakeFighter(e.fighter.look, animations, { fps: this.fps });
      e.sprite.setBaked(newKey(e.fighter.id), e.baked);
    }
    this.printInfo([]);
  }

  private printInfo(problems: string[]): void {
    const lines = [`FPS ${this.fps}   [C] close-up   [F] change fps`];
    for (const e of this.entries) {
      const frames = e.baked.frames.length;
      lines.push(`${e.fighter.name}: ${frames} frames, ${e.baked.colors} colors, baked in ${e.baked.ms} ms`);
    }
    problems.forEach((p) => lines.push(p));
    this.info.setText(lines);
  }

  update(): void {
    this.frame++;
    const anim = SHOW[Math.floor(this.frame / FRAMES_PER_ANIMATION) % SHOW.length]!;
    const local = this.frame % FRAMES_PER_ANIMATION;
    for (const e of this.entries) e.sprite.show(anim, local);
    if (this.closeUp) this.drawCloseUp(anim, local);
  }

  private toggleCloseUp(): void {
    if (this.closeUp) {
      this.closeUp.remove();
      this.closeUp = undefined;
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#101420;border:2px solid #fff;image-rendering:pixelated;";
    document.body.appendChild(canvas);
    this.closeUp = canvas;
  }

  /** Copies each fighter's current baked picture onto one canvas, 3× bigger, with no smoothing. */
  private drawCloseUp(anim: string, frame: number): void {
    const canvas = this.closeUp!;
    const shown = this.entries.map((e) => {
      const list = e.baked.index[anim] ?? [];
      const held = list.map((x) => x.frame);
      const entry = list[held.indexOf(shownFrame(e.baked.anims[anim]!, held, frame))];
      return entry ? e.baked.frames[entry.job] : undefined;
    });
    const cellW = Math.max(1, ...shown.map((f) => (f ? f.w : 0))) * ZOOM;
    const cellH = Math.max(1, ...shown.map((f) => (f ? f.h : 0))) * ZOOM;
    canvas.width = cellW * Math.max(1, shown.length);
    canvas.height = cellH;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    shown.forEach((f, i) => {
      if (!f) return;
      const page = this.entries[i]!.baked.pages[f.page]!;
      // Feet sit on a shared line near the bottom of each cell.
      const dx = i * cellW + (cellW - f.w * ZOOM) / 2;
      const dy = cellH - f.h * ZOOM;
      ctx.drawImage(page, f.x, f.y, f.w, f.h, dx, dy, f.w * ZOOM, f.h * ZOOM);
    });
  }
}
