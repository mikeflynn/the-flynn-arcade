// 🎥 THE ARCADE'S CAPTURE SCRIPT (for grown-ups)
//
// Records each game's poster picture and clip by playing the game in a hidden
// browser:
//   npm run capture -w arcade                         every game with a `capture` recipe
//   npm run capture -w arcade -- super-flynn-bros     just one game
//
// It writes <game>/arcade-media/screenshot.png and clip.mp4; commit them.
// Needs ffmpeg (https://ffmpeg.org, or `brew install ffmpeg`) and Playwright's
// browser (`npx playwright install chromium`, once).
//
// How each game is played comes from the `capture` block in its arcade.ts.
// This never runs in CI, tests or Docker.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import type { CapturePlan, GameInfo } from "@web-games/arcade";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VIEWPORT = { width: 1280, height: 720 };
const OUTPUT_WIDTH = 960;
const CLIP_LIMIT = 1.5 * 1024 * 1024;
const SCREENSHOT_LIMIT = 300 * 1024;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fail(message: string): never {
  console.error(`\n🎥 ${message}\n`);
  process.exit(1);
}

/** Every game folder's arcade.ts, as GameInfo. */
async function loadGame(folder: string): Promise<GameInfo | null> {
  const file = join(ROOT, folder, "arcade.ts");
  if (!existsSync(file)) return null;
  const mod = (await import(pathToFileURL(file).href)) as { arcadeInfo?: GameInfo };
  return mod.arcadeInfo ?? null;
}

async function isUp(url: string): Promise<boolean> {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

/** Starts the game's dev server (unless it's already running) and waits for it. */
async function startServer(game: GameInfo): Promise<ChildProcess | null> {
  const url = `http://localhost:${game.devPort}/`;
  if (await isUp(url)) return null;
  const child = spawn("npm", ["run", "dev", "-w", game.id], { cwd: ROOT, stdio: "ignore", detached: true });
  for (let waited = 0; waited < 60000; waited += 500) {
    if (await isUp(url)) return child;
    await sleep(500);
  }
  stopServer(child);
  fail(`${game.id}'s dev server didn't start on port ${game.devPort}.`);
}

function stopServer(child: ChildProcess | null): void {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid); // the whole group: npm and Vite
  } catch {
    /* already stopped */
  }
}

/** Plays the recipe's key steps, over and over, for `ms`. Takes the screenshot halfway. */
async function play(page: Page, plan: CapturePlan, ms: number, screenshot: () => Promise<void>): Promise<void> {
  const start = Date.now();
  let shot = false;
  const steps = plan.steps?.length ? plan.steps : [{ ms: 250 }];
  while (Date.now() - start < ms) {
    for (const step of steps) {
      if (Date.now() - start >= ms) break;
      for (const key of step.hold ?? []) await page.keyboard.down(key);
      for (const key of step.press ?? []) await page.keyboard.press(key);
      await sleep(step.ms);
      for (const key of step.hold ?? []) await page.keyboard.up(key);
      if (!shot && Date.now() - start >= ms / 2) {
        shot = true;
        await screenshot();
      }
    }
  }
  if (!shot) await screenshot();
}

function ffmpeg(args: string[]): void {
  const result = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
  if (result.status !== 0) fail("ffmpeg couldn't make the file (see the message above).");
}

function report(file: string, limit: number): void {
  const size = statSync(file).size;
  const kb = Math.round(size / 1024);
  console.log(`   ${file.replace(ROOT + "/", "")}: ${kb} KB${size > limit ? `  ⚠️ bigger than ${Math.round(limit / 1024)} KB, try a shorter clipMs` : ""}`);
}

async function capture(game: GameInfo): Promise<void> {
  const plan = game.capture!;
  const warmupMs = plan.warmupMs ?? 3000;
  const clipMs = plan.clipMs ?? 7000;
  console.log(`🎥 ${game.title}: warming up ${warmupMs / 1000}s, recording ${clipMs / 1000}s...`);

  const server = await startServer(game);
  const work = mkdtempSync(join(tmpdir(), `capture-${game.id}-`));
  const outDir = join(ROOT, game.id, "arcade-media");
  mkdirSync(outDir, { recursive: true });

  let browser;
  try {
    // The full Chromium (not the smaller "headless shell"), so `npx playwright install chromium` is all it needs.
    browser = await chromium.launch({ channel: "chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
  } catch (error) {
    stopServer(server);
    const message = (error as Error).message;
    fail(
      /Executable doesn't exist|install/i.test(message)
        ? "Playwright's browser isn't installed. Run: npx playwright install chromium"
        : `The browser wouldn't start:\n${message.split("\n")[0]}`,
    );
  }
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: work, size: VIEWPORT } });
    const page = await context.newPage();
    const recordingStarted = Date.now();
    await page.goto(`http://localhost:${game.devPort}/${plan.query ?? ""}`);
    await sleep(warmupMs);
    // Click the game once so it has keyboard focus (and the browser allows sound).
    const canvas = page.locator("canvas").first();
    await canvas.click({ position: { x: 5, y: 5 } }).catch(() => {});
    const offset = (Date.now() - recordingStarted) / 1000;
    const box = await canvas.boundingBox();
    const rawShot = join(work, "shot.png");
    await play(page, plan, clipMs, async () => {
      await canvas.screenshot({ path: rawShot });
    });
    const video = page.video();
    await context.close(); // finishes writing the video
    const raw = await video!.path();

    // Just the game's picture (no page border), 960 wide.
    const crop = box ? `crop=${Math.floor(box.width / 2) * 2}:${Math.floor(box.height / 2) * 2}:${Math.round(box.x)}:${Math.round(box.y)},` : "";
    const clip = join(outDir, "clip.mp4");
    ffmpeg(["-ss", offset.toFixed(2), "-t", (clipMs / 1000).toFixed(2), "-i", raw, "-an", "-vf", `${crop}scale=${OUTPUT_WIDTH}:-2:flags=lanczos,fps=30`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "main", "-crf", "28", "-movflags", "+faststart", clip]);
    const screenshot = join(outDir, "screenshot.png");
    ffmpeg(["-i", rawShot, "-vf", `scale=${OUTPUT_WIDTH}:-2:flags=lanczos`, screenshot]);
    report(screenshot, SCREENSHOT_LIMIT);
    report(clip, CLIP_LIMIT);
  } finally {
    await browser.close();
    stopServer(server);
    rmSync(work, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  if (spawnSync("ffmpeg", ["-version"]).status !== 0) fail("ffmpeg isn't installed. Get it from https://ffmpeg.org (or `brew install ffmpeg`).");
  const wanted = process.argv.slice(2);
  const folders = wanted.length > 0 ? wanted : readdirSync(ROOT).filter((f) => existsSync(join(ROOT, f, "arcade.ts")));
  let done = 0;
  for (const folder of folders) {
    const game = await loadGame(folder);
    if (!game) {
      console.log(`🎥 ${folder}: no arcade.ts here, skipping.`);
      continue;
    }
    if (!game.capture) {
      console.log(`🎥 ${game.title}: no \`capture\` recipe in its arcade.ts, skipping.`);
      continue;
    }
    await capture(game);
    done++;
  }
  console.log(`\n🎥 Done: ${done} game${done === 1 ? "" : "s"} recorded.`);
}

void main();
