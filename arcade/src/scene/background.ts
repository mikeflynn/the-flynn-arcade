import Phaser from "phaser";
import { colors, settings } from "../settings";
import { drawTwinkle, FLOOR_Y, HEIGHT, toColor, WIDTH } from "./style";

/** Draws a small tile of diagonal streaks that repeats across the screen. */
function speedLineTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const tile = scene.textures.createCanvas(key, 32, 8);
  if (!tile) return;
  const ctx = tile.getContext();
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 32; x++) {
      const band = (x + y) % 16;
      if (band < 6) {
        ctx.fillStyle = colors.speedLines[(x + y) % 32 < 16 ? 0 : 1];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  tile.refresh();
}

/**
 * The always-moving background: a spinning sunburst, a glowing floor, speed
 * lines zooming across the top and bottom, and sparkles. Returns a function to
 * call every frame with the milliseconds since the last frame.
 */
export function createBackground(scene: Phaser.Scene): (deltaMs: number) => void {
  // Sunburst
  const burst = scene.add.graphics({ x: WIDTH / 2, y: 80 });
  const rays = 16;
  const radius = 400;
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 1) / rays) * Math.PI * 2;
    burst.fillStyle(toColor(colors.sunburst[i % colors.sunburst.length]), 1);
    burst.fillTriangle(0, 0, Math.cos(a0) * radius, Math.sin(a0) * radius, Math.cos(a1) * radius, Math.sin(a1) * radius);
  }

  // Floor with glowing lines that run off toward the horizon
  const floor = scene.add.graphics();
  floor.fillStyle(toColor(colors.floor), 1);
  floor.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
  floor.lineStyle(1, toColor(colors.floorLines), 0.8);
  for (let i = 0, y = FLOOR_Y; y < HEIGHT; i++, y += 4 + i * 3) floor.lineBetween(0, y, WIDTH, y);
  for (let x = -160; x <= WIDTH + 160; x += 40) floor.lineBetween(WIDTH / 2 + (x - WIDTH / 2) * 0.35, FLOOR_Y, x, HEIGHT);

  // Speed lines
  speedLineTexture(scene, "speed-lines");
  const top = scene.add.tileSprite(0, 0, WIDTH, 8, "speed-lines").setOrigin(0);
  const bottom = scene.add.tileSprite(0, HEIGHT - 6, WIDTH, 8, "speed-lines").setOrigin(0).setFlipX(true);

  // Sparkles pop up now and then
  scene.time.addEvent({
    delay: settings.sparkleEveryMs,
    loop: true,
    callback: () => {
      const sparkle = scene.add.graphics({ x: Phaser.Math.Between(10, WIDTH - 10), y: Phaser.Math.Between(30, FLOOR_Y - 10) });
      drawTwinkle(sparkle, 4, toColor(colors.sparkle));
      sparkle.setScale(0).setDepth(1);
      scene.tweens.add({ targets: sparkle, scale: 1, duration: 200, yoyo: true, onComplete: () => sparkle.destroy() });
    },
  });

  return (deltaMs) => {
    const seconds = deltaMs / 1000;
    burst.rotation += (seconds * Math.PI * 2) / settings.sunburstSecondsPerTurn;
    top.tilePositionX -= seconds * settings.speedLineSpeed;
    bottom.tilePositionX += seconds * settings.speedLineSpeed;
  };
}
