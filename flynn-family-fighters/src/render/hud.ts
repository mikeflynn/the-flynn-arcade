import type Phaser from "phaser";
import type { MatchState } from "../engine/types";

// The SF2-style heads-up display: health bars, the round clock, names,
// round-win markers, the combo counter and the big banners. It is pixel art
// on the same camera as the fight: bars sit on even world units and text uses
// a pixel font at multiples of 16 units (8 real pixels), so nothing blurs.

export const FONT_FAMILY = '"Press Start 2P", monospace';
const FONT_URL = "assets/fonts/PressStart2P-Regular.ttf";
const FONT_WAIT_MS = 2500;

/**
 * Loads the pixel font. Gives up after 2.5 seconds (or if the file is missing):
 * the text then uses the browser's monospace font instead.
 */
export async function loadPixelFont(): Promise<void> {
  try {
    const face = new FontFace("Press Start 2P", `url(${FONT_URL})`);
    const loaded = face.load().then((f) => {
      document.fonts.add(f);
    });
    await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))]);
  } catch {
    console.info("The pixel font didn't load, so the text uses monospace.");
  }
}

const INK = "#160c22";
const INK_N = 0x160c22;
const BAR_EMPTY = 0xd22b2b;
const BAR_FULL = 0xffd23b;
const BAR_SHINE = 0xfff2a0;
const MARKER_WON = 0xffd23b;
const MARKER_EMPTY = 0x3a2a56;
/** The bars' left edges (world units). Each bar is 372 wide, inside a 4-unit border. */
const BAR_X = [44, 544] as const;
const BAR_W = 372;
/** How long banners and callouts stay up, in game steps (60 = 1 second). */
const BANNER_STEPS = 80;
const CALLOUT_STEPS = 54;
const COMBO_STEPS = 60;

type Align = "left" | "center" | "right";
const even = (n: number) => Math.round(n / 2) * 2;

/** Puts text with its left, middle or right edge at x and its top at y, on even world units so the pixels line up. */
function place(t: Phaser.GameObjects.Text, x: number, y: number, align: Align): void {
  const left = align === "left" ? x : align === "center" ? x - t.width / 2 : x - t.width;
  t.setPosition(even(left), even(y));
}

interface Timed {
  text: Phaser.GameObjects.Text;
  steps: number;
  x: number;
  y: number;
  align: Align;
}

export class Hud {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly names: Phaser.GameObjects.Text[];
  private readonly timer: Phaser.GameObjects.Text;
  private readonly banner: Timed;
  private readonly callout: Timed;
  private readonly combos: Timed[];
  private readonly all: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, names: [string, string]) {
    this.g = scene.add.graphics().setDepth(9);
    const text = (size: number, color: string, stroke: number, depth = 9) => {
      const t = scene.add
        .text(0, 0, "", { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, stroke: INK, strokeThickness: stroke })
        .setDepth(depth);
      this.all.push(t);
      return t;
    };
    this.names = [text(16, "#ffffff", 4), text(16, "#ffffff", 4)];
    this.names[0]!.setText(names[0]);
    this.names[1]!.setText(names[1]);
    place(this.names[0]!, 48, 60, "left");
    place(this.names[1]!, 912, 60, "right");
    const ko = text(16, "#ff4040", 4).setText("KO");
    place(ko, 480, 20, "center");
    this.timer = text(32, "#ffe14a", 4);
    this.banner = { text: text(64, "#ffe14a", 8, 10), steps: 0, x: 480, y: 168, align: "center" };
    this.callout = { text: text(32, "#ffffff", 6, 10), steps: 0, x: 480, y: 128, align: "center" };
    this.combos = [
      { text: text(32, "#ffe14a", 6), steps: 0, x: 48, y: 104, align: "left" },
      { text: text(32, "#ffe14a", 6), steps: 0, x: 912, y: 104, align: "right" },
    ];
  }

  /** A big message in the middle: "ROUND 1", "FIGHT!", "K.O.!" ... */
  showBanner(message: string, steps = BANNER_STEPS): void {
    this.show(this.banner, message, steps);
  }

  /** A smaller shout above the banner, like a special move's name. */
  showCallout(message: string, steps = CALLOUT_STEPS): void {
    this.show(this.callout, message, steps);
  }

  /** "N HITS!" on the attacker's side. */
  showCombo(player: 0 | 1, hits: number): void {
    this.show(this.combos[player]!, `${hits} HITS!`, COMBO_STEPS);
  }

  /** Called once per game step: messages count down and disappear. */
  step(): void {
    for (const t of [this.banner, this.callout, ...this.combos]) {
      if (t.steps > 0 && --t.steps === 0) t.text.setText("");
    }
  }

  draw(s: MatchState): void {
    const g = this.g;
    g.clear();
    s.fighters.forEach((f, i) => {
      const x = BAR_X[i]!;
      const fill = f.maxHealth > 0 ? Math.max(0, Math.min(1, f.health / f.maxHealth)) : 0;
      // Widths in steps of 2 world units (1 real pixel). The bars drain toward the outside edges.
      const w = Math.round((BAR_W / 2) * fill) * 2;
      const left = i === 0 ? x : x + BAR_W - w;
      g.fillStyle(INK_N).fillRect(x - 4, 16, BAR_W + 8, 36);
      g.fillStyle(BAR_EMPTY).fillRect(x, 20, BAR_W, 28);
      g.fillStyle(BAR_FULL).fillRect(left, 20, w, 28);
      g.fillStyle(BAR_SHINE).fillRect(left, 22, w, 6);
      // Round wins: a gold square for each round won, next to the clock.
      for (let r = 0; r < s.settings.roundsToWin; r++) {
        const mx = i === 0 ? 400 - r * 24 : 544 + r * 24;
        g.fillStyle(INK_N).fillRect(mx - 2, 58, 20, 20);
        g.fillStyle(r < f.roundWins ? MARKER_WON : MARKER_EMPTY).fillRect(mx, 60, 16, 16);
      }
    });
    const seconds = String(Math.ceil(s.timerFrames / 60));
    if (this.timer.text !== seconds) this.timer.setText(seconds);
    place(this.timer, 480, 60, "center");
  }

  destroy(): void {
    this.g.destroy();
    this.all.forEach((t) => t.destroy());
  }

  private show(t: Timed, message: string, steps: number): void {
    t.text.setText(message);
    t.steps = steps;
    place(t.text, t.x, t.y, t.align);
  }
}
