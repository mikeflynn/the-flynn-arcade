import type Phaser from "phaser";
import { themes, type Theme, type ThemeName } from "../levels/themes";

/** Background layers, back to front. factor = how fast it scrolls compared to the ground. */
const LAYERS = [
  { name: "sky", factor: 0 },
  { name: "mountains", factor: 0.1 },
  { name: "scenery", factor: 0.3 },
  { name: "hedges", factor: 0.6 },
] as const;

type LayerName = (typeof LAYERS)[number]["name"];

interface Painter {
  px(x: number, y: number, w: number, h: number, color: string): void;
  random(): number;
  width: number;
  height: number;
  groundY: number;
  theme: Theme;
}

/**
 * Adds the scrolling background for a theme. Every layer repeats seamlessly
 * every screen-width. Returns a function to call each frame with the camera's scrollX.
 */
export function createBackground(scene: Phaser.Scene, themeName: ThemeName, groundY: number): (scrollX: number) => void {
  const theme: Theme = themes[themeName] ?? themes.morning;
  const { width, height } = scene.scale;
  const layers = LAYERS.map(({ name, factor }, i) => {
    const key = `bg-${themeName}-${name}`;
    if (!scene.textures.exists(key)) drawLayer(scene, key, name, theme, width, height, groundY, i + 1);
    const sprite = scene.add.tileSprite(0, 0, width, height, key).setOrigin(0, 0).setScrollFactor(0);
    return { sprite, factor };
  });
  return (scrollX) => {
    for (const { sprite, factor } of layers) sprite.tilePositionX = Math.round(scrollX * factor);
  };
}

function drawLayer(
  scene: Phaser.Scene,
  key: string,
  name: LayerName,
  theme: Theme,
  width: number,
  height: number,
  groundY: number,
  seed: number,
): void {
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  const ctx = texture.getContext();
  const painter: Painter = {
    px: (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    },
    random: seeded(seed * 7919),
    width,
    height,
    groundY,
    theme,
  };
  ({ sky: drawSky, mountains: drawMountains, scenery: drawScenery, hedges: drawHedges })[name](painter);
  texture.refresh();
}

function drawSky({ px, width, height, theme }: Painter): void {
  // Bands of color instead of a smooth fade: it looks more 8-bit.
  for (let y = 0; y < height; y += 4) px(0, y, width, 4, mix(theme.skyTop, theme.skyBottom, y / height));
  const { x, y, radius, color } = theme.sun;
  fillCircle(px, x, y, radius, color);
}

/** A wavy line that repeats exactly every `width` pixels. */
function ridge(width: number, base: number, amps: number[], phase: number): (x: number) => number {
  return (x) =>
    base - amps.reduce((sum, amp, i) => sum + amp * Math.sin((2 * Math.PI * (2 * i + 1) * x) / width + phase * (i + 1)), 0);
}

function drawMountains({ px, width, height, theme }: Painter): void {
  const far = ridge(width, 92, [10, 6, 3], 0.5);
  const near = ridge(width, 110, [8, 5, 2], 2.1);
  for (let x = 0; x < width; x++) {
    const top = Math.round(far(x));
    px(x, top, 1, height - top, theme.mountainsFar);
  }
  for (let x = 0; x < width; x++) {
    const top = Math.round(near(x));
    px(x, top, 1, height - top, theme.mountains);
  }
}

function drawScenery(p: Painter): void {
  if (p.theme.scenery === "shops") drawShops(p);
  else if (p.theme.scenery === "park") drawPark(p);
  else drawHouses(p);
}

function drawHouses(p: Painter): void {
  const { px, random, width, groundY, theme } = p;
  const slots = 4;
  const slot = width / slots;
  for (let i = 0; i < slots; i++) {
    const x = Math.round(i * slot + 4 + random() * 6);
    const w = 44 + Math.round(random() * 6);
    const h = 20 + Math.round(random() * 6);
    const top = groundY - h;
    // Low, wide ranch-house roof
    for (let r = 0; r < 6; r++) {
      const inset = 5 - r;
      px(x - 3 + inset, top - 6 + r, w + 6 - inset * 2, 1, theme.roof);
    }
    px(x, top, w, h, theme.buildingColors[i % theme.buildingColors.length]);
    // Garage door with stripes, front door, window
    px(x + 3, groundY - 14, 16, 14, theme.trim);
    for (let g = 0; g < 4; g++) px(x + 3, groundY - 12 + g * 3, 16, 1, mix(theme.trim, "#000000", 0.15));
    px(x + 24, groundY - 13, 6, 13, theme.roof);
    px(x + 33, top + 5, 9, 7, "#7ac0e8");
    px(x + 37, top + 5, 1, 7, theme.trim);
    drawPalm(p, Math.round((i + 1) * slot - 16), 70 + Math.round(random() * 25));
  }
}

function drawShops(p: Painter): void {
  const { px, random, width, groundY, theme } = p;
  const slots = 3;
  const slot = width / slots;
  for (let i = 0; i < slots; i++) {
    const x = Math.round(i * slot + 4);
    const w = Math.round(slot - 10 - random() * 6);
    const h = 34 + Math.round(random() * 6);
    const top = groundY - h;
    px(x, top, w, h, theme.buildingColors[i % theme.buildingColors.length]);
    px(x, top, w, 3, theme.roof);
    px(x + 6, top + 5, w - 12, 6, theme.trim); // store sign
    for (let s = 0; s < w; s += 4) {
      px(x + s, top + 13, 2, 4, theme.trim); // striped awning
      px(x + s + 2, top + 13, 2, 4, "#ffffff");
    }
    const windowTop = top + 19;
    px(x + 4, windowTop, Math.round(w * 0.4), groundY - windowTop, "#7ac0e8");
    px(x + Math.round(w * 0.55), windowTop, 8, groundY - windowTop, theme.roof);
    px(x + Math.round(w * 0.7), windowTop, Math.round(w * 0.25), groundY - windowTop, "#7ac0e8");
    if (i < slots - 1) drawPalm(p, Math.round((i + 1) * slot - 4), 90);
  }
}

function drawPark(p: Painter): void {
  const { px, random, groundY, theme } = p;
  // A baseball backstop
  const left = 16;
  for (let x = left; x <= left + 40; x += 4) px(x, groundY - 40, 1, 40, "#9aa0a8");
  for (let y = groundY - 40; y < groundY; y += 4) px(left, y, 41, 1, "#9aa0a8");
  // Round shade trees
  for (let i = 0; i < 4; i++) {
    const cx = Math.round(90 + i * 60 + random() * 10);
    const radius = 11 + Math.round(random() * 4);
    px(cx - 1, groundY - 18, 3, 18, theme.palmTrunk);
    fillCircle(px, cx, groundY - 18 - radius + 4, radius, theme.buildingColors[i % theme.buildingColors.length]);
  }
}

function drawPalm({ px, groundY, theme }: Painter, x: number, height: number): void {
  const topY = groundY - height;
  const bendAt = (y: number) => Math.round(Math.sin(((groundY - y) / height) * 1.6) * 4);
  for (let y = topY; y < groundY; y++) px(x + bendAt(y), y, 2, 1, theme.palmTrunk);
  const crownX = x + bendAt(topY);
  const fronds = [[-1, -0.3], [1, -0.3], [-1, 0.2], [1, 0.2], [-0.5, -0.8], [0.5, -0.8], [0, -1]];
  for (const [dx, dy] of fronds) {
    for (let t = 0; t < 12; t++) {
      const droop = dx !== 0 ? (t * t) / 24 : 0;
      px(crownX + dx * t, topY + dy * t + droop, 2, 1, theme.leaves);
    }
  }
}

function drawHedges({ px, random, width, groundY, theme }: Painter): void {
  let x = 4;
  while (x < width - 30) {
    const w = Math.min(24 + Math.round(random() * 24), width - 4 - x);
    const h = 8 + Math.round(random() * 6);
    for (let i = 0; i < w; i++) {
      const bump = Math.round(Math.sin(i * 0.7) * 1.5 + random());
      const top = groundY - h - bump;
      px(x + i, top, 1, groundY - top, theme.hedge);
      px(x + i, groundY - 3, 1, 3, theme.hedgeDark);
    }
    x += w + 14 + Math.round(random() * 20);
  }
}

function fillCircle(px: Painter["px"], cx: number, cy: number, radius: number, color: string): void {
  for (let dy = -radius; dy <= radius; dy++) {
    const half = Math.round(Math.sqrt(radius * radius - dy * dy));
    px(cx - half, cy + dy, half * 2, 1, color);
  }
}

/** Blends two "#rrggbb" colors. t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

/** A tiny random number generator that gives the same numbers every time (so backgrounds don't change). */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
