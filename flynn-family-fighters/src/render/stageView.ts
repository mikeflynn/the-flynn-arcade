import type Phaser from "phaser";
import { darken, hex, lighten, mix } from "@web-games/rig";
import type { StageDef } from "../stages";

// Draws a stage from its data block in stages.ts: flat bands of color (no
// gradients), so it looks like pixel art at 480 × 270.

/** Where the floor starts (world units). The fighters stand lower down, on stage.ground. */
const HORIZON = 340;
const SKY_BANDS = 7;
const BAND_H = 48;
const SKIN = 0xf1c08f;
const CROWD_COLORS = [0xff5d5d, 0x5dc7ff, 0xffd84a, 0x7dff6a, 0xff7ad9, 0xffffff, 0xb07aff];
/** How often the crowd bobs (ms per bob), and how far (world units). */
const CROWD_BOB_MS = 200;
const CROWD_BOB = 2;

/** Mountain outlines, farthest first. A stage with more layers reuses them, lower down. */
const RIDGES: [number, number][][] = [
  [[0, 230], [120, 180], [230, 220], [360, 160], [480, 215], [600, 175], [740, 225], [860, 170], [960, 205]],
  [[0, 270], [160, 240], [300, 275], [460, 235], [640, 280], [800, 245], [960, 270]],
  [[0, 300], [100, 284], [260, 306], [420, 280], [560, 304], [720, 286], [880, 308], [960, 296]],
];

type G = Phaser.GameObjects.Graphics;
const pts = (list: [number, number][]) => list.map(([x, y]) => ({ x, y }));

export interface StageView {
  /** Moves the crowd. Call every frame with the scene's time. */
  update(timeMs: number): void;
  destroy(): void;
  /** The color for the fighters' shadows on this floor. */
  shadowColor: number;
}

export function drawStage(scene: Phaser.Scene, stage: StageDef): StageView {
  const g = scene.add.graphics().setDepth(0);
  const floor = hex(stage.floor, 0xc4553a);

  // Sky: steps of color from the top color down to the horizon color.
  const top = hex(stage.sky[0], 0x4a2378), bottom = hex(stage.sky[1], 0xffa64a);
  for (let i = 0; i < SKY_BANDS; i++) {
    g.fillStyle(mix(top, bottom, i / (SKY_BANDS - 1)));
    g.fillRect(0, i * BAND_H, 960, BAND_H);
  }
  // The setting sun.
  g.fillStyle(0xffe08a).fillCircle(700, 250, 70);
  g.fillStyle(0xfff4c4).fillCircle(686, 236, 40);

  stage.mountains.forEach((color, i) => {
    const ridge = RIDGES[i % RIDGES.length]!;
    const drop = Math.floor(i / RIDGES.length) * 20;
    g.fillStyle(hex(color, 0x553877));
    g.fillPoints(pts([[0, HORIZON], ...ridge.map(([x, y]): [number, number] => [x, y + drop]), [960, HORIZON]]), true);
  });

  const props = new Set(stage.props);
  if (props.has("backstop")) drawBackstop(g);
  if (props.has("house")) drawHouse(g);
  if (props.has("palms")) for (const [x, h] of [[90, 190], [170, 150], [860, 200]] as const) drawPalm(g, x, h);
  if (props.has("bleachers")) drawBleachers(g);
  const crowd = props.has("crowd") ? drawCrowd(scene) : [];
  if (props.has("swings")) drawSwings(g);
  if (props.has("fence")) drawFence(g);

  // The floor: a darker edge, then painted stripes.
  g.fillStyle(floor).fillRect(0, HORIZON, 960, 200);
  g.fillStyle(darken(floor, 0.15)).fillRect(0, HORIZON, 960, 14);
  g.fillStyle(lighten(floor, 0.2));
  for (let i = 0; i < 4; i++) g.fillRect(0, 384 + i * 44, 960, 8);
  g.fillStyle(hex(stage.floorLines, 0xfff2e0));
  for (let i = 0; i < 4; i++) g.fillRect(0, 378 + i * 44, 960, 4);

  return {
    shadowColor: darken(floor, 0.45),
    update(timeMs) {
      // Each person bobs 2 units on their own beat, jumping (not gliding) between spots.
      crowd.forEach((c, i) => c.setY(c.getData("baseY") - (Math.floor(timeMs / CROWD_BOB_MS + i * 0.37) % 2) * CROWD_BOB));
    },
    destroy() {
      g.destroy();
      crowd.forEach((c) => c.destroy());
    },
  };
}

function drawPalm(g: G, x: number, h: number): void {
  g.fillStyle(0x2a1a3a);
  g.fillPoints(pts([[x - 6, HORIZON], [x + 6, HORIZON], [x + 12, HORIZON - h], [x + 4, HORIZON - h]]), true);
  const cx = x + 8, cy = HORIZON - h;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI;
    g.fillPoints(pts([[cx, cy], [cx + Math.cos(a) * 60, cy + Math.sin(a) * 26 + 18], [cx + Math.cos(a) * 30, cy + Math.sin(a) * 10 + 4]]), true);
  }
}

function drawBleachers(g: G): void {
  g.fillStyle(0x8c93a8).fillRect(230, 250, 520, 90);
  g.fillStyle(0x6c7388);
  for (let i = 0; i < 4; i++) g.fillRect(230, 262 + i * 22, 520, 4);
}

/** Four rows of people, each its own little picture so it can bob. */
function drawCrowd(scene: Phaser.Scene): Phaser.GameObjects.Graphics[] {
  const people: Phaser.GameObjects.Graphics[] = [];
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 26; i++) {
      const c = scene.add.graphics({ x: 242 + i * 20 + (row % 2) * 8, y: 258 + row * 22 }).setDepth(0);
      c.fillStyle(CROWD_COLORS[(i * 7 + row * 3) % CROWD_COLORS.length]!).fillRect(-6, -2, 12, 10);
      c.fillStyle(SKIN).fillRect(-4, -12, 8, 8);
      c.setData("baseY", c.y);
      people.push(c);
    }
  }
  return people;
}

/** A chain-link fence along the back of the floor. */
function drawFence(g: G): void {
  g.fillStyle(0x9aa0b4);
  for (let x = 0; x < 960; x += 24) g.fillRect(x, 268, 2, 72);
  for (let y = 276; y < HORIZON; y += 16) g.fillRect(0, y, 960, 2);
  g.fillStyle(0x6c7388);
  g.fillRect(0, 264, 960, 6);
  for (let x = 0; x <= 960; x += 120) g.fillRect(x - 3, 260, 6, 80);
}

/** The baseball backstop: tall posts with mesh between them. */
function drawBackstop(g: G): void {
  g.fillStyle(0x9aa0b4);
  for (let x = 380; x <= 580; x += 20) g.fillRect(x, 176, 2, 164);
  for (let y = 180; y < HORIZON; y += 20) g.fillRect(380, y, 202, 2);
  g.fillStyle(0x4a4f63);
  for (const x of [376, 478, 578]) g.fillRect(x, 168, 8, 172);
  g.fillRect(376, 168, 210, 8);
}

/** A house with a pointy roof, a door and lit-up windows. */
function drawHouse(g: G): void {
  g.fillStyle(0xd9c8a0).fillRect(640, 210, 220, 130);
  g.fillStyle(0x8a3a3a).fillPoints(pts([[620, 214], [750, 140], [880, 214]]), true);
  g.fillStyle(0x5a3a2a).fillRect(730, 270, 40, 70);
  g.fillStyle(0xffe08a);
  g.fillRect(664, 236, 44, 36);
  g.fillRect(792, 236, 44, 36);
  g.fillStyle(0x6a5a4a);
  g.fillRect(684, 236, 4, 36);
  g.fillRect(812, 236, 4, 36);
}

/** A swing set: an A-frame on each side, a top bar, and two swings. */
function drawSwings(g: G): void {
  g.fillStyle(0x3a4a8a);
  for (const x of [120, 300]) {
    g.fillPoints(pts([[x - 24, HORIZON], [x - 18, HORIZON], [x + 2, 216], [x - 2, 216]]), true);
    g.fillPoints(pts([[x + 18, HORIZON], [x + 24, HORIZON], [x + 2, 216], [x - 2, 216]]), true);
  }
  g.fillRect(116, 212, 188, 8);
  for (const x of [168, 244]) {
    g.fillStyle(0xb0b4c4).fillRect(x, 220, 2, 76).fillRect(x + 28, 220, 2, 76);
    g.fillStyle(0xe04848).fillRect(x - 4, 296, 38, 8);
  }
}
