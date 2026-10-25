import Phaser from "phaser";
import { animLength, shownFrame } from "@web-games/rig";
import { bakeFighter, type BakedFighter } from "@web-games/rig/canvas";
import { FighterSprite } from "@web-games/rig/phaser";
import { ANIMS } from "../animations";
import type { Fighter } from "../fighter";
import { KNOWN_MOVE_TYPES } from "../moves";
import { loadRoster } from "../roster";
import { FPS_CHOICES, settings, type Fps } from "../settings";

const FLOOR_Y = 420;
const NAMES = Object.keys(ANIMS);
/** A non-looping animation pauses on its last frame this long before it plays again. */
const REPLAY_PAUSE = 40;
const ZOOM = 3;

interface Entry {
  fighter: Fighter;
  baked: BakedFighter;
  sprite: FighterSprite;
}

let textureCounter = 0;
/** Every sprite needs its own texture name, or two fighters would erase each other's pictures. */
const newKey = (id: string) => `fighter-${id}-${textureCounter++}`;

/**
 * ?viewer: a lineup of every fighter, to check how they look and move.
 * N = next animation, C = close-up, F = change fps.
 * For screenshots: ?viewer&anim=st.HK starts on that animation, &frame=8 freezes it on frame 8,
 * and &close opens the close-up.
 */
export class ViewerScene extends Phaser.Scene {
  private entries: Entry[] = [];
  private fps: Fps = settings.animationFps;
  private frame = 0;
  private animIndex = 0;
  private frozenFrame?: number;
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

    const params = new URLSearchParams(window.location.search);
    this.animIndex = Math.max(0, NAMES.indexOf(params.get("anim") ?? ""));
    const frozen = Number(params.get("frame") ?? NaN);
    if (Number.isFinite(frozen)) this.frozenFrame = frozen;

    this.input.keyboard!.on("keydown-N", () => this.nextAnimation());
    this.input.keyboard!.on("keydown-C", () => this.toggleCloseUp());
    this.input.keyboard!.on("keydown-F", () => this.nextFps());
    this.events.once("shutdown", () => this.closeUp?.remove());
    if (params.has("close")) this.toggleCloseUp();

    void this.build();
  }

  private async build(): Promise<void> {
    const { fighters, problems } = await loadRoster(KNOWN_MOVE_TYPES);
    problems.forEach((p) => console.warn(`🥊 ${p}`));
    fighters.forEach((fighter, i) => {
      const baked = bakeFighter(fighter.look, ANIMS, { fps: this.fps });
      const sprite = new FighterSprite(this, newKey(fighter.id), baked).setPosition((960 * (i + 1)) / (fighters.length + 1), FLOOR_Y);
      this.entries.push({ fighter, baked, sprite });
    });
    this.printInfo(problems);
  }

  private nextFps(): void {
    this.fps = FPS_CHOICES[(FPS_CHOICES.indexOf(this.fps) + 1) % FPS_CHOICES.length]!;
    for (const e of this.entries) {
      e.baked = bakeFighter(e.fighter.look, ANIMS, { fps: this.fps });
      e.sprite.setBaked(newKey(e.fighter.id), e.baked);
    }
    this.printInfo([]);
  }

  private nextAnimation(): void {
    this.animIndex = (this.animIndex + 1) % NAMES.length;
    this.frame = 0;
    this.frozenFrame = undefined;
    this.printInfo([]);
  }

  private printInfo(problems: string[]): void {
    const anim = NAMES[this.animIndex]!;
    const lines = [
      `FPS ${this.fps}   [N] next animation   [C] close-up   [F] change fps`,
      `${anim} (${this.animIndex + 1}/${NAMES.length}), ${animLength(ANIMS[anim]!)} frames${this.frozenFrame === undefined ? "" : `, frozen at ${this.frozenFrame}`}`,
    ];
    for (const e of this.entries) {
      const frames = e.baked.frames.length;
      // Each page pixel takes 4 bytes (red, green, blue, alpha).
      const mb = e.baked.pages.reduce((sum, p) => sum + p.width * p.height * 4, 0) / 1e6;
      lines.push(`${e.fighter.name}: ${frames} frames, ${e.baked.colors} colors, baked in ${e.baked.ms} ms, ${e.baked.pages.length} pages ${mb.toFixed(1)} MB`);
    }
    problems.forEach((p) => lines.push(p));
    this.info.setText(lines);
  }

  update(): void {
    this.frame++;
    const anim = NAMES[this.animIndex]!;
    const a = ANIMS[anim]!;
    const local = this.frozenFrame ?? (a.loop ? this.frame : this.frame % (animLength(a) + REPLAY_PAUSE));
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
