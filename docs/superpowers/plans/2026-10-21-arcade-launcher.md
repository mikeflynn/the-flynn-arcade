# The Flynn Arcade Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build The Flynn Arcade: a bright, 90s-fighting-game-style select screen on port 8000 where kids pick a game cabinet and play, with every game linking back. Moving shared code into `lib/` is part of the job.

**Architecture:** The arcade (`arcade/`) is a Vite + Phaser + TypeScript app like the games.
- It finds games at build time through `import.meta.glob("../../*/arcade.ts")`, and each game exports a `GameInfo`.
- **Docker:** the arcade's nginx serves `/` and forwards `/<game-id>/` to each game's own container.
- **Dev:** cabinets link straight to each game's dev server.
- **Shared code:** `pixelArt`, `audio`/`assets`/`phaserAudio`, and `validate` move out of Super Flynn Bros into `lib/pixel-art`, `lib/audio`, and `lib/settings`, and a new `lib/arcade` holds the registration type, validation, and the links between the arcade and the games.

**Tech Stack:** TypeScript 5.9.3 (strict), Vite 7.3.7, Phaser 3.90.0, Vitest 5.0.5, npm workspaces, nginx 1.27 (Docker).

**Spec:** `docs/superpowers/specs/2026-10-21-arcade-launcher-design.md`

## Global Constraints

- Same stack and versions as Super Flynn Bros: `phaser` 3.90.0, `vite` 7.3.7, `vitest` 5.0.5, `typescript` 5.9.3, Node 22 in Docker.
- **Ports:**
  - Arcade on **8000**, for the dev server, preview, and Docker host.
  - Super Flynn Bros stays on **8001**.
- **Screen:** 320×176 logical resolution, `pixelArt: true`, `Scale.FIT`.
- **Art:** no image files and no third-party art. Everything is drawn by code or from text-grid art, and no copied logos, fonts, or characters.
- **Kid-editable files never import Phaser:**
  - `arcade/src/settings.ts`, `cabinet.ts`, `sounds.ts`, `controls.ts`
  - `<game>/arcade.ts`
- **Sound:** all sound and music files are optional and skipped silently when missing.
- **Moving code doesn't change behavior:**
  - Super Flynn Bros' gameplay, kid files, and save data stay unchanged.
  - The moved tests keep passing in their new homes.
  - The combined test count stays the same apart from new tests.
- **Deviations from the spec**, already reflected in the code below:
  - **Marquee:** each cabinet marquee shows **blinking chase lights** in the game's colors instead of the title. At 320 px wide, a 40 px marquee can't show a readable title. The title is big on the info panel.
  - **Extra library:** a fourth promoted library, **`lib/settings`** (`clampSettings`), because the arcade's `settings.ts` needs the same clamping as the game's.
  - **Extra loader helper:** `lib/audio` also gets `loadSoundsWithBackups(scene, files, done)`. The game's Boot scene and the arcade share it for the "broken mp3 → try ogg" rounds.
  - **Selected cabinet scale:** 1.1, not 1.15, so the 1P/2P tags clear the logo.
  - **nginx:** `arcade/nginx.conf` sets `absolute_redirect off` so the `/super-flynn-bros` → `/super-flynn-bros/` redirect keeps port 8000.

## Review Focus

1. **A game's `arcade.ts` is missing, misnamed, or malformed** (a typo in `id`, an oversized picture, min > max players). Expected: that game is left out with a friendly console message, and the arcade still loads. Owner: Task 3 (`validateGames` tests).
2. **The browser Back button returns to the arcade mid "GAME START!"** (bfcache restores a frozen, faded page). Expected: the page reloads fresh. Owner: Task 6 (the `pageshow` handler in `main.ts`, plus a manual Back-button check).
3. **Someone types `localhost:8000/super-flynn-bros` without the trailing slash.** Expected: a redirect to `localhost:8000/super-flynn-bros/` that keeps the port. Owner: Task 7 (`curl` check).
4. **A missing optional sound requested through the arcade's proxy** (`/super-flynn-bros/assets/sounds/jump.mp3`). Expected: a real 404, not HTML with a 200, so the game still skips it. Owner: Task 7 (`curl` check).
5. **Storage is blocked** (private window). Expected: the arcade's mute setting falls back to "sound on" without errors. Owner: Task 5 (`storage` tests).

---

## File Structure

```
lib/settings/      NEW  @web-games/settings   (moved: super-flynn-bros/src/engine/validate.ts)
lib/pixel-art/     NEW  @web-games/pixel-art  (moved: super-flynn-bros/src/engine/pixelArt.ts + test)
lib/audio/         NEW  @web-games/audio      (moved: engine/audio.ts, assets.ts, phaserAudio.ts + tests; new phaserLoad.ts)
lib/arcade/        NEW  @web-games/arcade     (GameInfo, validateGames, gameUrl, arcadeUrl, fromGameId)
super-flynn-bros/
  arcade.ts        NEW  the game's cabinet registration
  src/vite-env.d.ts NEW (import.meta.env types)
  src/engine/services.ts, src/scenes/{Boot,Title,Pause}Scene.ts, src/main.ts, …  MODIFY (imports, arcade menu items)
arcade/            NEW  the launcher app
  src/settings.ts limits.ts cabinet.ts sounds.ts controls.ts   (kid-editable + limits)
  src/layout.ts selection.ts storage.ts games.ts badges.ts     (logic, unit-tested)
  src/scene/{style,background,logo,cabinets,infoPanel,ArcadeScene}.ts, src/main.ts   (Phaser)
  Dockerfile nginx.conf README.md
package.json, docker-compose.yml, CLAUDE.md, README.md   MODIFY
```

---

### Task 1: Move `clampSettings` and pixel art into `lib/`

**Files:**
- Move: `super-flynn-bros/src/engine/validate.ts` → `lib/settings/src/index.ts`
- Move: `super-flynn-bros/src/engine/pixelArt.ts` → `lib/pixel-art/src/index.ts`
- Move: `super-flynn-bros/tests/pixelArt.test.ts` → `lib/pixel-art/tests/pixelArt.test.ts`
- Create: `lib/settings/{package.json,tsconfig.json}`, `lib/settings/tests/clampSettings.test.ts`, `lib/pixel-art/{package.json,tsconfig.json}`
- Modify: `super-flynn-bros/tests/validate.test.ts`, `super-flynn-bros/package.json`, and the six game files that import these modules

**Interfaces:**
- Produces:
  - `@web-games/settings`: `Range`, `Limits<T>`, `clampSettings(values, limits, warn?)`. These are unchanged.
  - `@web-games/pixel-art`: `Palette`, `ParsedGrid`, `ParsedSheet`, `TRANSPARENT`, `UNKNOWN_COLOR`, `parseFrames`, `stripFrameCount`, `addTextureFromFrames`, `makeSpriteSheet`. These are unchanged.

- [ ] **Step 1: Move the files with git (this keeps their history)**

```bash
mkdir -p lib/settings/src lib/settings/tests lib/pixel-art/src lib/pixel-art/tests
git mv super-flynn-bros/src/engine/validate.ts lib/settings/src/index.ts
git mv super-flynn-bros/src/engine/pixelArt.ts lib/pixel-art/src/index.ts
git mv super-flynn-bros/tests/pixelArt.test.ts lib/pixel-art/tests/pixelArt.test.ts
sed -i '' 's#"../src/engine/pixelArt"#"../src/index"#' lib/pixel-art/tests/pixelArt.test.ts
```

- [ ] **Step 2: Create the package files**

`lib/settings/package.json`:
```json
{
  "name": "@web-games/settings",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vitest": "5.0.5"
  }
}
```

`lib/settings/tsconfig.json` (and the same content for `lib/pixel-art/tsconfig.json`):
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "tests"]
}
```

`lib/pixel-art/package.json`:
```json
{
  "name": "@web-games/pixel-art",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc",
    "test": "vitest run"
  },
  "peerDependencies": {
    "phaser": "3.90.0"
  },
  "devDependencies": {
    "phaser": "3.90.0",
    "typescript": "5.9.3",
    "vitest": "5.0.5"
  }
}
```

- [ ] **Step 3: Split the clamp tests (the generic tests move; the game keeps its settings.ts checks)**

`lib/settings/tests/clampSettings.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { clampSettings } from "../src/index";

const limits = { speed: { min: 1, max: 10 }, volume: { min: 0, max: 1 } };

describe("clampSettings", () => {
  it("keeps values that are in range", () => {
    const warn = vi.fn();
    expect(clampSettings({ speed: 5, volume: 0.5, name: "x" }, limits, warn)).toEqual({ speed: 5, volume: 0.5, name: "x" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("fixes values that are too big or too small, and says why", () => {
    const warn = vi.fn();
    expect(clampSettings({ speed: 50, volume: -1 }, limits, warn)).toEqual({ speed: 10, volume: 0 });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain("speed = 50 is too big");
  });

  it("replaces things that aren't numbers", () => {
    const warn = vi.fn();
    const result = clampSettings({ speed: Number.NaN, volume: "loud" as unknown as number }, limits, warn);
    expect(result).toEqual({ speed: 1, volume: 0 });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
```

`super-flynn-bros/tests/validate.test.ts` (whole file):
```ts
import { describe, expect, it, vi } from "vitest";
import { clampSettings } from "@web-games/settings";
import { settingLimits } from "../src/engine/limits";
import { mySettings } from "../src/settings";

describe("settings.ts", () => {
  it("ships with every value inside its safe range", () => {
    const warn = vi.fn();
    clampSettings(mySettings, settingLimits, warn);
    expect(warn).not.toHaveBeenCalled();
  });

  it("has a limit for every setting and a setting for every limit", () => {
    expect(Object.keys(settingLimits).sort()).toEqual(Object.keys(mySettings).sort());
  });
});
```

- [ ] **Step 4: Run the tests to see the game break where it still imports the old paths**

Run: `npm install && npm test -w super-flynn-bros`
Expected: FAIL. Imports of `./validate`, `./pixelArt`, `../engine/pixelArt`, and similar can't be resolved.

- [ ] **Step 5: Point the game at the new packages**

```bash
cd super-flynn-bros
grep -rln 'validate"\|pixelArt"' src tests | xargs sed -i '' \
  -e 's#"\./validate"#"@web-games/settings"#' -e 's#"\./engine/validate"#"@web-games/settings"#' \
  -e 's#"\./pixelArt"#"@web-games/pixel-art"#' -e 's#"\.\./engine/pixelArt"#"@web-games/pixel-art"#' \
  -e 's#"\.\./src/engine/pixelArt"#"@web-games/pixel-art"#'
cd ..
```
This updates `src/settings.ts`, `src/engine/{limits,checkDefs,types,tileset}.ts`, `src/scenes/BootScene.ts`, and `tests/data.test.ts`.

Then add the dependencies to `super-flynn-bros/package.json`:
```diff
--- a/super-flynn-bros/package.json
+++ b/super-flynn-bros/package.json
@@ -12,6 +12,8 @@
   },
   "dependencies": {
     "@web-games/input": "*",
+    "@web-games/pixel-art": "*",
+    "@web-games/settings": "*",
     "phaser": "3.90.0"
   },
   "devDependencies": {
```

- [ ] **Step 6: Verify**

Run: `npm install && npm test && npm run typecheck`
Expected:
- `lib/settings` 3 passed, `lib/pixel-art` 7 passed, `lib/input` 13 passed.
- Super Flynn Bros 113 passed (123 before, minus 7 pixel-art and 3 clamp tests that moved).
- Typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add -A lib/settings lib/pixel-art super-flynn-bros package-lock.json
git commit -m "Move clampSettings and pixel art into lib/settings and lib/pixel-art"
```

---

### Task 2: Move audio into `lib/audio`, and share the sound-backup loader

**Files:**
- Move: `super-flynn-bros/src/engine/{audio,assets,phaserAudio}.ts` → `lib/audio/src/`
- Move: `super-flynn-bros/tests/{audio,assets}.test.ts` → `lib/audio/tests/`
- Create: `lib/audio/{package.json,tsconfig.json}`, `lib/audio/src/phaserLoad.ts`, `lib/audio/src/index.ts`
- Modify: `super-flynn-bros/src/scenes/BootScene.ts`, `super-flynn-bros/src/main.ts`, `src/sounds.ts`, `src/engine/{services,catalog}.ts`, `super-flynn-bros/package.json`

**Interfaces:**
- Produces `@web-games/audio`:
  - everything from `assets.ts` (`AssetCandidate`, `UrlExists`, `findAssets`, `findAllAssets`, `nextAttempts`, `makeHttpExists`)
  - everything from `audio.ts` (`SoundDef`, `PlayingSound`, `AudioBackend`, `GameAudioOptions`, `sfxCacheKey`, `musicCacheKey`, `audioCandidates`, `GameAudio`)
  - `phaserAudioBackend`
  - new: `loadSoundsWithBackups(scene: Phaser.Scene, files: ReadonlyMap<string, string[]>, done: () => void): void`

- [ ] **Step 1: Move the files**

```bash
mkdir -p lib/audio/src lib/audio/tests
git mv super-flynn-bros/src/engine/audio.ts lib/audio/src/audio.ts
git mv super-flynn-bros/src/engine/assets.ts lib/audio/src/assets.ts
git mv super-flynn-bros/src/engine/phaserAudio.ts lib/audio/src/phaserAudio.ts
git mv super-flynn-bros/tests/audio.test.ts lib/audio/tests/audio.test.ts
git mv super-flynn-bros/tests/assets.test.ts lib/audio/tests/assets.test.ts
sed -i '' 's#"../src/engine/audio"#"../src/audio"#' lib/audio/tests/audio.test.ts
sed -i '' 's#"../src/engine/assets"#"../src/assets"#' lib/audio/tests/assets.test.ts
cp lib/pixel-art/tsconfig.json lib/audio/tsconfig.json
```

- [ ] **Step 2: Package files and the shared loader**

`lib/audio/package.json`:
```json
{
  "name": "@web-games/audio",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc",
    "test": "vitest run"
  },
  "peerDependencies": {
    "phaser": "3.90.0"
  },
  "devDependencies": {
    "phaser": "3.90.0",
    "typescript": "5.9.3",
    "vitest": "5.0.5"
  }
}
```

`lib/audio/src/phaserLoad.ts`:
```ts
import type Phaser from "phaser";
import { nextAttempts } from "./assets";

/**
 * Loads sound files with backups: each key starts with its first URL, and if
 * that file is broken (say jump.mp3 won't decode), the next one is tried
 * (jump.ogg), round after round. Calls `done` when nothing is left to try.
 *
 * Call it from a scene's create(). (Phaser fires no event when a file fails
 * to decode, so this checks the audio cache after each loading round.)
 */
export function loadSoundsWithBackups(scene: Phaser.Scene, files: ReadonlyMap<string, string[]>, done: () => void): void {
  const round = (backups: Map<string, string[]>): void => {
    const { attempts, remaining } = nextAttempts(backups, (key) => scene.cache.audio.exists(key));
    if (attempts.length === 0) {
      done();
      return;
    }
    for (const [key, url] of attempts) {
      console.info(`Loading sound ${url}`);
      scene.load.audio(key, url);
    }
    scene.load.once("complete", () => round(remaining));
    scene.load.start();
  };
  // Round one tries every first choice; later rounds try the backups.
  round(new Map([...files].map(([key, urls]) => [key, urls])));
}
```

`lib/audio/src/index.ts`:
```ts
/**
 * @web-games/audio: optional sounds and music that are quietly skipped when
 * their files haven't been added yet.
 */
export * from "./assets";
export * from "./audio";
export * from "./phaserAudio";
export * from "./phaserLoad";
```

- [ ] **Step 3: Run the moved tests in their new home**

Run: `npm install && npm test -w lib/audio`
Expected: 21 passed (assets and audio).

- [ ] **Step 4: Point the game at `@web-games/audio`**

```bash
cd super-flynn-bros
grep -rln 'engine/audio"\|engine/assets"\|"\./audio"\|"\./assets"' src tests | xargs sed -i '' \
  -e 's#"\.\./engine/audio"#"@web-games/audio"#' -e 's#"\./engine/audio"#"@web-games/audio"#' \
  -e 's#"\./audio"#"@web-games/audio"#' -e 's#"\./assets"#"@web-games/audio"#' \
  -e 's#"\./engine/assets"#"@web-games/audio"#' -e 's#"\.\./engine/assets"#"@web-games/audio"#'
cd ..
```

Then apply these edits.

`super-flynn-bros/src/main.ts` should now start like this (the two audio imports merged into one; the rest of the file is unchanged):
```ts
import Phaser from "phaser";
import { InputManager } from "@web-games/input";
import { audioCandidates, findAllAssets, findAssets, makeHttpExists } from "@web-games/audio";
import { spriteOverrideCandidates } from "./engine/catalog";
import { loadProgress } from "./engine/progress";
import { globalStep, type GameMode } from "./engine/services";
import { levels } from "./levels";
import { settings } from "./settings";
import { musicTracks, soundEffects } from "./sounds";
import { BootScene, type BootData } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { PlayScene } from "./scenes/PlayScene";
import { HudScene } from "./scenes/HudScene";
import { PauseScene } from "./scenes/PauseScene";
import { LevelCompleteScene } from "./scenes/LevelCompleteScene";
import { EndingScene } from "./scenes/EndingScene";

/** ?level=2&mode=coop jumps straight into a level. Handy for testing a level you're building! */
function readQuickStart(params: URLSearchParams): BootData["quickStart"] {
  const level = Number(params.get("level"));
// …
```

`super-flynn-bros/src/scenes/BootScene.ts` (whole file: sounds now load through `loadSoundsWithBackups`, and the local retry code goes away):
```ts
import Phaser from "phaser";
import type { InputManager } from "@web-games/input";
import { catalog, heroList } from "../engine/catalog";
import { makeSpriteSheet } from "@web-games/pixel-art";
import { GameAudio, loadSoundsWithBackups, phaserAudioBackend } from "@web-games/audio";
import { buildTileset } from "../engine/tileset";
import { setServices, useControls, type GameMode } from "../engine/services";
import type { Progress } from "../engine/progress";
import type { Size } from "../engine/types";
import { heartArt } from "../items";
import { goalArt } from "../tiles";
import { musicTracks, soundEffects } from "../sounds";
import { settings } from "../settings";

/** Handed over by main.ts through the game registry. */
export interface BootData {
  input: InputManager;
  progress: Progress;
  /** Custom PNGs that exist: key → url. */
  overrides: Map<string, string>;
  /** Sound and music files that exist: cache key → urls (.mp3 first, then .ogg). */
  audioFiles: Map<string, string[]>;
  /** From ?level=2&mode=coop: skip the title screen. */
  quickStart: { mode: GameMode; levelIndex: number } | null;
}

/** Loads optional files, draws every sprite from text art, then starts the game. */
export class BootScene extends Phaser.Scene {
  private boot!: BootData;

  constructor() {
    super("Boot");
  }

  preload(): void {
    this.boot = this.registry.get("boot") as BootData;
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.info(`Couldn't load ${file.src}.`);
    });
    for (const [key, url] of this.boot.overrides) this.load.image(key, url);
  }

  create(): void {
    // Sounds load after the pictures, with backups: a broken jump.mp3 falls back to jump.ogg.
    loadSoundsWithBackups(this, this.boot.audioFiles, () => this.finishBoot());
  }

  private finishBoot(): void {
    const warn = (message: string) => console.warn(message);
    const artSizes = new Map<string, Size>();
    for (const hero of heroList) {
      const { idle, walk1, walk2, jump } = hero.frames;
      artSizes.set(hero.key, makeSpriteSheet(this, hero.key, [idle, walk1, walk2, jump], hero.colors, warn));
    }
    for (const def of [...catalog.hazards, ...catalog.items]) {
      artSizes.set(def.key, makeSpriteSheet(this, def.key, def.frames, def.colors, warn));
    }
    makeSpriteSheet(this, "heart", heartArt.frames, heartArt.colors, warn);
    artSizes.set("goal", makeSpriteSheet(this, "goal", [goalArt.art], goalArt.colors, warn));
    const tileset = buildTileset(this, "tiles", catalog.tiles, warn);

    const available = new Set([...this.boot.audioFiles.keys()].filter((key) => this.cache.audio.exists(key)));
    const audio = new GameAudio(phaserAudioBackend(this.sound), {
      sfx: soundEffects,
      music: musicTracks,
      available,
      sfxVolume: settings.sfxVolume,
      musicVolume: settings.musicVolume,
      muted: this.boot.progress.muted,
    });
    audio.reportMissing();

    setServices({ input: this.boot.input, audio, progress: this.boot.progress, artSizes, tileset });

    const quick = this.boot.quickStart;
    if (quick) {
      useControls(this.boot.input, quick.mode);
      this.scene.start("Play", { mode: quick.mode, levelIndex: quick.levelIndex, score: 0 });
    } else {
      useControls(this.boot.input, "menu");
      this.scene.start("Title");
    }
  }
}
```

`super-flynn-bros/package.json`:
```diff
--- a/super-flynn-bros/package.json
+++ b/super-flynn-bros/package.json
@@ -11,6 +11,7 @@
     "test": "vitest run"
   },
   "dependencies": {
+    "@web-games/audio": "*",
     "@web-games/input": "*",
     "@web-games/pixel-art": "*",
     "@web-games/settings": "*",
```

- [ ] **Step 5: Verify**

Run: `npm install && npm test && npm run typecheck && npm run build`
Expected:
- `lib/audio` 21, Super Flynn Bros 92, `lib/settings` 3, `lib/pixel-art` 7, `lib/input` 13 (123 in total from the old game suite).
- Typecheck and build clean.

Then run `npm run dev -w super-flynn-bros` and open `http://localhost:8001/?debug=1`.
Expected: the title screen loads, the console shows the usual one "No sound for: …" info line, and there are no errors.

Temporarily copy any valid `.mp3` to `super-flynn-bros/public/assets/music/title.mp3`, reload, and press Space. Expected: `game.sound.sounds.filter(s => s.isPlaying).map(s => s.key)` in the console returns `["music:title"]`. Delete the file afterwards.

- [ ] **Step 6: Commit**

```bash
git add -A lib/audio super-flynn-bros package-lock.json
git commit -m "Move audio into lib/audio and share the sound-backup loader"
```

---

### Task 3: `lib/arcade`: game registration and the links between arcade and games

**Files:**
- Create: `lib/arcade/package.json`, `lib/arcade/tsconfig.json`, `lib/arcade/src/index.ts`
- Test: `lib/arcade/tests/arcade.test.ts`

**Interfaces:**
- Produces `@web-games/arcade`:
  - `interface GameInfo { id; title; blurb; players: { min; max; coop }; colors: { primary; secondary }; devPort; order?; screenArt: { colors; art } }`
  - `SCREEN_ART_MAX = { width: 32, height: 24 }` and `ARCADE_DEV_PORT = 8000`
  - `interface Registration { folder: string; info: unknown }`
  - `validateGames(registrations, warn?): GameInfo[]`: skips bad entries with a warning, keeps the first of duplicate ids, sorts by `order` then `title`.
  - `gameUrl(info, { dev }): string`: `http://localhost:<devPort>/` in dev, `/<id>/` in production.
  - `arcadeUrl(fromGameId, { dev, arcadeDevPort? }): string`: `http://localhost:8000/?from=<id>` in dev, `/?from=<id>` in production.
  - `fromGameId(search: string): string | null`

- [ ] **Step 1: Package files**

`lib/arcade/package.json`:
```json
{
  "name": "@web-games/arcade",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vitest": "5.0.5"
  }
}
```

`lib/arcade/tsconfig.json`: same as `lib/settings/tsconfig.json`.

- [ ] **Step 2: Write the failing tests**

`lib/arcade/tests/arcade.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { arcadeUrl, fromGameId, gameUrl, validateGames, type GameInfo } from "../src/index";

const game = (overrides: Partial<GameInfo> = {}): GameInfo => ({
  id: "space-pong",
  title: "SPACE PONG",
  blurb: "Bounce the ball past your friend!",
  players: { min: 1, max: 2, coop: false },
  colors: { primary: "#ff0000", secondary: "#00ff00" },
  devPort: 8002,
  screenArt: { colors: { W: "#ffffff" }, art: ["W.W", ".W."] },
  ...overrides,
});

describe("validateGames", () => {
  it("keeps good registrations", () => {
    const warn = vi.fn();
    expect(validateGames([{ folder: "space-pong", info: game() }], warn)).toEqual([game()]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("skips registrations that are missing or broken, with a friendly message", () => {
    const warn = vi.fn();
    const games = validateGames(
      [
        { folder: "no-info", info: undefined },
        { folder: "Bad Name", info: game({ id: "Bad Name" }) },
        { folder: "space-pong", info: game({ id: "other-game" }) },
        { folder: "space-pong", info: game({ players: { min: 3, max: 2, coop: false } }) },
      ],
      warn,
    );
    expect(games).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(4);
    expect(warn.mock.calls[0][0]).toContain("no-info");
    expect(warn.mock.calls[1][0]).toContain("kebab-case");
    expect(warn.mock.calls[2][0]).toContain('should be "space-pong"');
    expect(warn.mock.calls[3][0]).toContain("players");
  });

  it("skips screen art that's too big for the cabinet", () => {
    const warn = vi.fn();
    const tooWide = game({ screenArt: { colors: {}, art: ["x".repeat(33)] } });
    const tooTall = game({ screenArt: { colors: {}, art: Array<string>(25).fill("x") } });
    expect(validateGames([{ folder: "space-pong", info: tooWide }], warn)).toEqual([]);
    expect(validateGames([{ folder: "space-pong", info: tooTall }], warn)).toEqual([]);
    expect(warn.mock.calls[0][0]).toContain("32 x 24");
  });

  it("keeps only the first of two games with the same id", () => {
    const warn = vi.fn();
    const games = validateGames(
      [
        { folder: "space-pong", info: game() },
        { folder: "space-pong", info: game({ title: "COPY" }) },
      ],
      warn,
    );
    expect(games.map((g) => g.title)).toEqual(["SPACE PONG"]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("sorts by order, then by title", () => {
    const games = validateGames(
      [
        { folder: "zebra", info: game({ id: "zebra", title: "ZEBRA" }) },
        { folder: "apple", info: game({ id: "apple", title: "APPLE" }) },
        { folder: "last", info: game({ id: "last", title: "AAA", order: 9 }) },
        { folder: "first", info: game({ id: "first", title: "ZZZ", order: 1 }) },
      ],
      () => {},
    );
    expect(games.map((g) => g.id)).toEqual(["first", "last", "apple", "zebra"]);
  });
});

describe("gameUrl", () => {
  it("uses the game's own dev server while developing", () => {
    expect(gameUrl(game(), { dev: true })).toBe("http://localhost:8002/");
  });

  it("uses the game's path behind the arcade in production", () => {
    expect(gameUrl(game(), { dev: false })).toBe("/space-pong/");
  });
});

describe("arcadeUrl", () => {
  it("points back at the arcade and says which game you came from", () => {
    expect(arcadeUrl("space-pong", { dev: true })).toBe("http://localhost:8000/?from=space-pong");
    expect(arcadeUrl("space-pong", { dev: false })).toBe("/?from=space-pong");
  });
});

describe("fromGameId", () => {
  it("reads the game you came back from", () => {
    expect(fromGameId("?from=space-pong")).toBe("space-pong");
    expect(fromGameId("")).toBeNull();
    expect(fromGameId("?from=")).toBeNull();
  });
});
```

Run: `npm install && npm test -w lib/arcade`
Expected: FAIL, `Cannot find module '../src/index'`.

- [ ] **Step 3: Implement**

`lib/arcade/src/index.ts`:
```ts
/**
 * @web-games/arcade: how a game joins The Flynn Arcade, and how the arcade
 * and the games link to each other.
 *
 * Each game adds `<game>/arcade.ts` exporting `arcadeInfo: GameInfo`.
 */

export interface GameInfo {
  /** Must match the game's folder name (it's also the web address: /<id>/). */
  id: string;
  /** Shown on the cabinet marquee and the info panel. */
  title: string;
  /** One sentence about the game, typed out on the info panel. */
  blurb: string;
  players: { min: number; max: number; coop: boolean };
  /** Cabinet colors as "#rrggbb". */
  colors: { primary: string; secondary: string };
  /** The game's dev server port (see the port registry in CLAUDE.md). */
  devPort: number;
  /** Optional: lower numbers come first in the row of cabinets. */
  order?: number;
  /** The little picture on the cabinet's screen: up to 32 x 24 letters. */
  screenArt: { colors: Record<string, string>; art: string[] };
}

export const SCREEN_ART_MAX = { width: 32, height: 24 } as const;
export const ARCADE_DEV_PORT = 8000;

export interface Registration {
  folder: string;
  info: unknown;
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Why a registration can't be used, or null if it's fine. */
function problemWith(folder: string, info: unknown): string | null {
  if (!info || typeof info !== "object") return "no `arcadeInfo` exported from arcade.ts";
  const g = info as Partial<GameInfo>;
  if (typeof g.id !== "string" || !KEBAB_CASE.test(g.id)) return "id should be kebab-case, like \"space-pong\"";
  if (g.id !== folder) return `id is "${g.id}" but should be "${folder}" (the folder name)`;
  if (typeof g.title !== "string" || g.title.length === 0) return "it needs a title";
  if (typeof g.blurb !== "string") return "it needs a blurb";
  const p = g.players;
  if (!p || typeof p.min !== "number" || typeof p.max !== "number" || p.min < 1 || p.min > p.max) {
    return "players should look like { min: 1, max: 2, coop: true }";
  }
  if (!g.colors || typeof g.colors.primary !== "string" || typeof g.colors.secondary !== "string") {
    return "colors needs a primary and a secondary color";
  }
  if (typeof g.devPort !== "number" || !Number.isInteger(g.devPort)) return "devPort should be a whole number, like 8001";
  const art = g.screenArt?.art;
  if (!Array.isArray(art) || !g.screenArt?.colors) return "screenArt needs colors and art";
  if (art.length > SCREEN_ART_MAX.height || art.some((row) => typeof row !== "string" || row.length > SCREEN_ART_MAX.width)) {
    return `screenArt is bigger than the cabinet screen (${SCREEN_ART_MAX.width} x ${SCREEN_ART_MAX.height} at most)`;
  }
  return null;
}

/**
 * Checks every game's arcade.ts. Broken ones are skipped with a friendly
 * message instead of breaking the arcade. Sorted by order, then title.
 */
export function validateGames(
  registrations: Registration[],
  warn: (message: string) => void = console.warn,
): GameInfo[] {
  const games: GameInfo[] = [];
  const seen = new Set<string>();
  for (const { folder, info } of registrations) {
    const problem = problemWith(folder, info);
    if (problem) {
      warn(`🕹️ ${folder}/arcade.ts: ${problem}. Leaving it out of the arcade for now.`);
      continue;
    }
    const game = info as GameInfo;
    if (seen.has(game.id)) {
      warn(`🕹️ Two games use the id "${game.id}". Keeping the first one.`);
      continue;
    }
    seen.add(game.id);
    games.push(game);
  }
  const order = (g: GameInfo) => g.order ?? Number.POSITIVE_INFINITY;
  return games.sort((a, b) => order(a) - order(b) || a.title.localeCompare(b.title));
}

/** Where to send a player to play a game. */
export function gameUrl(info: Pick<GameInfo, "id" | "devPort">, env: { dev: boolean }): string {
  return env.dev ? `http://localhost:${info.devPort}/` : `/${info.id}/`;
}

/** Where a game sends a player back to the arcade (it remembers which game they came from). */
export function arcadeUrl(fromGameId: string, env: { dev: boolean; arcadeDevPort?: number }): string {
  const query = `?from=${encodeURIComponent(fromGameId)}`;
  return env.dev ? `http://localhost:${env.arcadeDevPort ?? ARCADE_DEV_PORT}/${query}` : `/${query}`;
}

/** The game a player just came back from (from "?from=..."), or null. */
export function fromGameId(search: string): string | null {
  const id = new URLSearchParams(search).get("from");
  return id ? id : null;
}
```

- [ ] **Step 4: Verify**

Run: `npm test -w lib/arcade && npm run typecheck -w lib/arcade`
Expected: 9 passed, and tsc is clean.

- [ ] **Step 5: Commit**

```bash
git add lib/arcade package-lock.json
git commit -m "Add lib/arcade: game registration, validation, and arcade links"
```

---

### Task 4: Super Flynn Bros joins the arcade

**Files:**
- Create: `super-flynn-bros/arcade.ts`, `super-flynn-bros/src/vite-env.d.ts`, `super-flynn-bros/tests/arcade.test.ts`
- Modify: `super-flynn-bros/tsconfig.json`, `super-flynn-bros/package.json`, `src/engine/services.ts`, `src/scenes/TitleScene.ts`, `src/scenes/PauseScene.ts`, `super-flynn-bros/README.md`

**Interfaces:**
- Consumes: `GameInfo`, `validateGames`, `arcadeUrl` (Task 3), and `parseFrames` (Task 1).
- Produces:
  - `arcadeInfo: GameInfo` (id `super-flynn-bros`, devPort 8001, order 1)
  - `goToArcade(): void` in `engine/services.ts`
  - title menu item 4, "BACK TO ARCADE"
  - pause menu item 4, "QUIT TO ARCADE"

- [ ] **Step 1: Write the failing test**

`super-flynn-bros/tests/arcade.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { validateGames } from "@web-games/arcade";
import { parseFrames } from "@web-games/pixel-art";
import { arcadeInfo } from "../arcade";

describe("arcade.ts", () => {
  it("is a valid arcade registration", () => {
    const warn = vi.fn();
    expect(validateGames([{ folder: "super-flynn-bros", info: arcadeInfo }], warn)).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("has a clean cabinet screen picture", () => {
    const { colors, art } = arcadeInfo.screenArt;
    expect(parseFrames([art], colors, "screen").warnings).toEqual([]);
  });
});
```

Run: `npm test -w super-flynn-bros -- arcade`
Expected: FAIL, `Cannot find module '../arcade'`.

- [ ] **Step 2: Create the registration and the Vite types**

`super-flynn-bros/arcade.ts`:
```ts
// 🕹️ HOW SUPER FLYNN BROS SHOWS UP IN THE FLYNN ARCADE
//
// The arcade reads this file to build this game's cabinet: the name on the
// marquee, the colors, the little picture on its screen, and the info at the
// bottom of the arcade screen.
//
// 🛠️ TRY THIS: change the cabinet colors, or redraw the picture on its screen
// (each letter is one pixel; up to 32 wide and 24 tall).

import type { GameInfo } from "@web-games/arcade";

export const arcadeInfo: GameInfo = {
  id: "super-flynn-bros",
  title: "SUPER FLYNN BROS",
  blurb: "Help Colin and Ryan get to school, practice, and back home! Dodge dogs, grab donuts!",
  players: { min: 1, max: 2, coop: true },
  colors: { primary: "#5ab0f0", secondary: "#f6d860" },
  devPort: 8001,
  order: 1,
  screenArt: {
    colors: {
      S: "#6cc4ff", // sky
      Y: "#fff4b0", // sun
      G: "#c9c3b5", // sidewalk
      D: "#8a5a32", // dirt
      H: "#f6d860", // Colin's hair
      h: "#7a4a2a", // Ryan's hair
      F: "#f3c294", // skin
      K: "#1d1d2b", // eyes
      B: "#3d7be0", // Colin's shirt
      g: "#3fae5a", // Ryan's shirt
      P: "#3a4466", // pants and shorts
      W: "#f2f2f2", // shoes
    },
    art: [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSYYSSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSYYYYSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSYYYYYYSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSYYYYSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSYYSSSS",
      "SSSSSSSSSSHHHSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSHHHHHSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSHFFFHSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSFKFKFSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSFFFFFSSSSShhhSSSSSSSSSS",
      "SSSSSSSSSSFFFSSSSShhhhhSSSSSSSSS",
      "SSSSSSSSSBBBBBSSSShFFFhSSSSSSSSS",
      "SSSSSSSSBBBBBBBSSSFKFKFSSSSSSSSS",
      "SSSSSSSSFBBBBBFSSSFFFFFSSSSSSSSS",
      "SSSSSSSSFBBBBBFSSSgggggSSSSSSSSS",
      "SSSSSSSSSBBBBBSSSFgggggFSSSSSSSS",
      "SSSSSSSSSPPSPPSSSSgggggSSSSSSSSS",
      "SSSSSSSSSPPSPPSSSSPPSPPSSSSSSSSS",
      "SSSSSSSSSPPSPPSSSSFFSFFSSSSSSSSS",
      "SSSSSSSSSWWSWWSSSSWWSWWSSSSSSSSS",
      "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
      "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
      "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
    ],
  },
};
```

`super-flynn-bros/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`super-flynn-bros/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "include": [
    "src",
    "tests",
    "vite.config.ts",
    "arcade.ts"
  ]
}
```

`super-flynn-bros/package.json`:
```diff
--- a/super-flynn-bros/package.json
+++ b/super-flynn-bros/package.json
@@ -11,6 +11,7 @@
     "test": "vitest run"
   },
   "dependencies": {
+    "@web-games/arcade": "*",
     "@web-games/audio": "*",
     "@web-games/input": "*",
     "@web-games/pixel-art": "*",
```

Run: `npm install && npm test -w super-flynn-bros -- arcade`
Expected: 2 passed.

- [ ] **Step 3: Add the arcade menu items**

`super-flynn-bros/src/engine/services.ts`:
```diff
--- a/super-flynn-bros/src/engine/services.ts
+++ b/super-flynn-bros/src/engine/services.ts
@@ -1,4 +1,5 @@
 import { mergeBindings, type InputManager } from "@web-games/input";
+import { arcadeUrl } from "@web-games/arcade";
 import { player1Controls, player2Controls } from "../controls";
 import type { GameAudio } from "@web-games/audio";
 import { saveProgress, unlockLevel, type Progress } from "./progress";
@@ -57,6 +58,11 @@ export function unlock(levelNumber: number): void {
   saveProgress(services.progress);
 }
 
+/** Leaves the game and goes back to The Flynn Arcade, with this game's cabinet selected. */
+export function goToArcade(): void {
+  window.location.assign(arcadeUrl("super-flynn-bros", { dev: import.meta.env.DEV }));
+}
+
 /** Runs every frame before the scenes: reads input, and handles keys that work everywhere. */
 export function globalStep(): void {
   if (!current) return;
```

`super-flynn-bros/src/scenes/TitleScene.ts`:
```diff
--- a/super-flynn-bros/src/scenes/TitleScene.ts
+++ b/super-flynn-bros/src/scenes/TitleScene.ts
@@ -2,7 +2,7 @@ import Phaser from "phaser";
 import { createBackground } from "../engine/backgrounds";
 import { tileFrame } from "../engine/tileset";
 import { addPicture } from "../engine/sprites";
-import { getServices, useControls, type GameMode } from "../engine/services";
+import { getServices, goToArcade, useControls, type GameMode } from "../engine/services";
 import { addText, blink, Menu } from "../engine/ui";
 import { levels } from "../levels";
 
@@ -58,7 +58,9 @@ export class TitleScene extends Phaser.Scene {
 
   private showModeMenu(): void {
     this.state = "menu";
-    this.setMenu(76, () => ["1P COLIN", "1P RYAN", "2P CO-OP"], (i) => this.pickMode(MODES[i]));
+    this.setMenu(72, () => ["1P COLIN", "1P RYAN", "2P CO-OP", "BACK TO ARCADE"], (i) =>
+      i < MODES.length ? this.pickMode(MODES[i]) : goToArcade(),
+    );
   }
 
   private pickMode(mode: GameMode): void {
```

`super-flynn-bros/src/scenes/PauseScene.ts`:
```diff
--- a/super-flynn-bros/src/scenes/PauseScene.ts
+++ b/super-flynn-bros/src/scenes/PauseScene.ts
@@ -1,5 +1,5 @@
 import Phaser from "phaser";
-import { getServices, toggleMute, useControls } from "../engine/services";
+import { getServices, goToArcade, toggleMute, useControls } from "../engine/services";
 import { addText, Menu } from "../engine/ui";
 
 export class PauseScene extends Phaser.Scene {
@@ -18,7 +18,7 @@ export class PauseScene extends Phaser.Scene {
       this,
       width / 2,
       82,
-      () => ["RESUME", `SOUND: ${getServices().audio.muted ? "OFF" : "ON"}`, "QUIT TO TITLE"],
+      () => ["RESUME", `SOUND: ${getServices().audio.muted ? "OFF" : "ON"}`, "QUIT TO TITLE", "QUIT TO ARCADE"],
       (i) => this.pick(i),
       (key) => audio.playSfx(key),
     );
@@ -36,7 +36,8 @@ export class PauseScene extends Phaser.Scene {
   private pick(index: number): void {
     if (index === 0) this.resume();
     else if (index === 1) toggleMute();
-    else this.quit();
+    else if (index === 2) this.quit();
+    else goToArcade();
   }
 
   private resume(): void {
```

`super-flynn-bros/README.md`:
```diff
--- a/super-flynn-bros/README.md
+++ b/super-flynn-bros/README.md
@@ -21,6 +21,8 @@ the neighbors who walk *really* slowly. Grab donuts on the way! 🍩
 | Gamepad | First gamepad | Second gamepad |
 
 - **Esc** pauses. **M** turns the sound on and off.
+- **BACK TO ARCADE** (title menu) or **QUIT TO ARCADE** (pause menu) takes
+  you back to The Flynn Arcade to pick another game.
 - Hold jump longer to jump higher. Tap it for a little hop.
 - **Colin** is taller and jumps higher. **Ryan** is shorter and runs faster.
 - Each hero has **3 hearts**. Bumping a hazard or falling in a pit costs one.
@@ -235,5 +237,8 @@ That's OK. Everybody breaks things, and it's how you learn!
 - Kid-editable files: `src/settings.ts`, `src/heroes.ts`, `src/hazards.ts`,
   `src/items.ts`, `src/tiles.ts`, `src/sounds.ts`, `src/controls.ts`,
   `src/levels/*`. Everything in `src/engine/` and `src/scenes/` is the machinery.
-- Shared library used: [`lib/input`](../lib/input) (keyboard + gamepad).
+- Shared libraries used: [`lib/input`](../lib/input), [`lib/pixel-art`](../lib/pixel-art),
+  [`lib/audio`](../lib/audio), [`lib/settings`](../lib/settings), [`lib/arcade`](../lib/arcade).
+- [`arcade.ts`](arcade.ts) is how this game shows up in The Flynn Arcade
+  (cabinet colors, blurb, and the picture on its screen).
 - **Asset credits:** all art is drawn in code in this repo. No third-party assets.
```

- [ ] **Step 4: Verify**

Run: `npm test -w super-flynn-bros && npm run typecheck -w super-flynn-bros`
Expected: 94 passed, and tsc is clean.

Run `npm run dev -w super-flynn-bros`, open `http://localhost:8001/`, and press Space.
Expected:
- The title menu reads 1P COLIN / 1P RYAN / 2P CO-OP / BACK TO ARCADE.
- Choosing BACK TO ARCADE navigates to `http://localhost:8000/?from=super-flynn-bros`. It shows "can't connect" until Task 6, which is expected.
- In a level, Esc shows RESUME / SOUND / QUIT TO TITLE / QUIT TO ARCADE.

- [ ] **Step 5: Commit**

```bash
git add -A super-flynn-bros package-lock.json
git commit -m "Super Flynn Bros joins the arcade: arcade.ts and back-to-arcade menu items"
```

---

### Task 5: The arcade app: setup, kid-editable files, and logic

**Files:**
- Modify: root `package.json` (workspaces)
- Create:
  - `arcade/{package.json,tsconfig.json,vite.config.ts,index.html}`
  - `arcade/src/vite-env.d.ts`
  - `arcade/public/assets/{sounds,music}/.gitkeep`
  - `arcade/src/{settings,limits,cabinet,sounds,controls,layout,selection,storage,games,badges}.ts`
- Test: `arcade/tests/arcade.test.ts`

**Interfaces:**
- Consumes: `@web-games/settings`, `@web-games/pixel-art`, `@web-games/arcade`, `@web-games/audio` (the `SoundDef` type), `@web-games/input` (the `Bindings` type).
- Produces:
  - **settings.ts:** `logoText`, `colors { sunburst[], speedLines[], sparkle, floor, floorLines, logo[], comingSoon{primary,secondary}, highlight, player1, player2 }`, `mySettings`, and `settings { sunburstSecondsPerTurn, speedLineSpeed, sparkleEveryMs, attractDelayMs, attractStepMs, comingSoonCabinets, typeLettersPerSecond, musicVolume, sfxVolume }`
  - **cabinet.ts:** `cabinetArt: string[]` (48×80) and `cabinetColors`
  - **layout.ts:** `Region`, `findRegion(art, char)`, `shade(hex, amount)`, `cabinetPalette(primary, secondary)`
  - **selection.ts:** `Slot` (`{kind:"game";game}` | `{kind:"soon"}`), `buildSlots(games, comingSoon)`, `wrap(i, n)`, `initialIndex(slots, fromId)`, `nextAttractIndex(current, slots)`
  - **storage.ts:** `loadArcadeSettings(storage?)` and `saveArcadeSettings({ muted }, storage?)`
  - **games.ts:** `folderOf(path)` and `games: GameInfo[]`
  - **badges.ts:** `playerBadges(players): { text; color }[]`
  - **sounds.ts:** `soundEffects { coin, move, select, nope }` and `musicTracks { arcade }`
  - **controls.ts:** `arcadeControls` and `secondPadControls`. Actions are `left`, `right`, `start`, and `mute`.

- [ ] **Step 1: Register the workspace and create the app's config files**

Root `package.json`:
```diff
--- a/package.json
+++ b/package.json
@@ -3,7 +3,8 @@
   "private": true,
   "workspaces": [
     "lib/*",
-    "super-flynn-bros"
+    "super-flynn-bros",
+    "arcade"
   ],
   "scripts": {
     "test": "npm run test --workspaces --if-present",
```

`arcade/package.json`:
```json
{
  "name": "@web-games/arcade-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@web-games/arcade": "*",
    "@web-games/audio": "*",
    "@web-games/input": "*",
    "@web-games/pixel-art": "*",
    "@web-games/settings": "*",
    "phaser": "3.90.0"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vite": "7.3.7",
    "vitest": "5.0.5"
  }
}
```

`arcade/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "include": [
    "src",
    "tests",
    "vite.config.ts"
  ]
}
```

`arcade/vite.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  // "mpa" turns off Vite's single-page-app fallback, so a missing sound or
  // picture gets a real 404 instead of index.html. The game relies on that to
  // skip files that haven't been added yet.
  appType: "mpa",
  server: { port: 8000, strictPort: true },
  preview: { port: 8000, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 }, // Phaser is one big file, and that's OK
  test: { environment: "node", include: ["tests/**/*.test.ts"], passWithNoTests: true },
});
```

`arcade/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Flynn Arcade</title>
    <style>
      html, body { margin: 0; height: 100%; background: #1b1464; overflow: hidden; }
      #game { width: 100vw; height: 100vh; }
      canvas { image-rendering: pixelated; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`arcade/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

```bash
mkdir -p arcade/public/assets/sounds arcade/public/assets/music
touch arcade/public/assets/sounds/.gitkeep arcade/public/assets/music/.gitkeep
```

- [ ] **Step 2: Write the failing tests**

`arcade/tests/arcade.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { clampSettings } from "@web-games/settings";
import { parseFrames } from "@web-games/pixel-art";
import type { GameInfo } from "@web-games/arcade";
import { mySettings } from "../src/settings";
import { settingLimits } from "../src/limits";
import { cabinetArt } from "../src/cabinet";
import { cabinetPalette, findRegion, shade } from "../src/layout";
import { buildSlots, initialIndex, nextAttractIndex, wrap } from "../src/selection";
import { loadArcadeSettings, saveArcadeSettings, type StorageLike } from "../src/storage";
import { folderOf, games } from "../src/games";
import { playerBadges } from "../src/badges";

const game = (id: string): GameInfo => ({
  id,
  title: id.toUpperCase(),
  blurb: "",
  players: { min: 1, max: 1, coop: false },
  colors: { primary: "#ff0000", secondary: "#00ff00" },
  devPort: 8009,
  screenArt: { colors: {}, art: [] },
});

describe("settings.ts", () => {
  it("ships with every value in its safe range, and a limit for each", () => {
    const warn = vi.fn();
    clampSettings(mySettings, settingLimits, warn);
    expect(warn).not.toHaveBeenCalled();
    expect(Object.keys(settingLimits).sort()).toEqual(Object.keys(mySettings).sort());
  });
});

describe("cabinet art", () => {
  it("is clean with a game's colors", () => {
    expect(parseFrames([cabinetArt], cabinetPalette("#5ab0f0", "#f6d860"), "cabinet").warnings).toEqual([]);
  });

  it("has a screen big enough for a 32 x 24 picture, and a marquee", () => {
    const screen = findRegion(cabinetArt, "G");
    expect(screen && screen.width >= 32 && screen.height >= 24).toBe(true);
    expect(findRegion(cabinetArt, "M")).not.toBeNull();
  });
});

describe("layout helpers", () => {
  it("findRegion boxes in a letter", () => {
    expect(findRegion(["....", ".GG.", ".GG."], "G")).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(findRegion(["...."], "G")).toBeNull();
  });

  it("shade makes colors darker", () => {
    expect(shade("#ffffff", 0.5)).toBe("#808080");
    expect(shade("#ff0000", 0)).toBe("#ff0000");
  });
});

describe("selection", () => {
  const slots = buildSlots([game("a"), game("b")], 2);

  it("adds coming-soon cabinets after the games", () => {
    expect(slots.map((s) => s.kind)).toEqual(["game", "game", "soon", "soon"]);
  });

  it("wraps around both ends", () => {
    expect(wrap(-1, 4)).toBe(3);
    expect(wrap(4, 4)).toBe(0);
    expect(wrap(0, 0)).toBe(0);
  });

  it("starts on the game you came back from", () => {
    expect(initialIndex(slots, "b")).toBe(1);
    expect(initialIndex(slots, "nope")).toBe(0);
    expect(initialIndex(slots, null)).toBe(0);
  });

  it("show-off mode skips coming-soon cabinets when there are several games", () => {
    expect(nextAttractIndex(1, slots)).toBe(0);
  });

  it("show-off mode wanders everywhere when there's only one game", () => {
    const one = buildSlots([game("a")], 2);
    expect(nextAttractIndex(0, one)).toBe(1);
    expect(nextAttractIndex(2, one)).toBe(0);
  });
});

describe("storage", () => {
  const memory = (): StorageLike => {
    const data: Record<string, string> = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
  };

  it("remembers mute", () => {
    const storage = memory();
    expect(loadArcadeSettings(storage)).toEqual({ muted: false });
    saveArcadeSettings({ muted: true }, storage);
    expect(loadArcadeSettings(storage)).toEqual({ muted: true });
  });

  it("never throws when storage is blocked", () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadArcadeSettings(blocked)).toEqual({ muted: false });
    expect(() => saveArcadeSettings({ muted: true }, blocked)).not.toThrow();
  });
});

describe("games.ts", () => {
  it("gets the folder name from a path", () => {
    expect(folderOf("../../super-flynn-bros/arcade.ts")).toBe("super-flynn-bros");
  });

  it("finds Super Flynn Bros", () => {
    expect(games.map((g) => g.id)).toContain("super-flynn-bros");
  });
});

describe("player badges", () => {
  it("shows the player count, and CO-OP when players team up", () => {
    expect(playerBadges({ min: 1, max: 1, coop: false }).map((b) => b.text)).toEqual(["1P"]);
    expect(playerBadges({ min: 1, max: 2, coop: true }).map((b) => b.text)).toEqual(["1-2P", "CO-OP"]);
  });
});
```

Run: `npm install && npm test -w arcade`
Expected: FAIL. Imports of `../src/settings`, `../src/cabinet`, and the others can't be resolved.

- [ ] **Step 3: Create the kid-editable files**

`arcade/src/settings.ts`:
```ts
// 🛠️ THE FLYNN ARCADE SETTINGS
//
// Change these, save, and the arcade reloads with your change.
// Colors are "#rrggbb" codes (search "hex color picker" to find any color).

import { clampSettings } from "@web-games/settings";
import { settingLimits } from "./limits";

// The words in the big logo at the top.
export const logoText = "THE FLYNN ARCADE";

export const colors = {
  // The giant spinning sunburst behind everything (two colors that take turns).
  sunburst: ["#2a5cff", "#8a2be2"],
  // The streaks that zoom across the top and bottom.
  speedLines: ["#ff8a00", "#ffd200"],
  sparkle: "#ffffff",
  // The floor the cabinets stand on, and its glowing lines.
  floor: "#1b1464",
  floorLines: "#ff2bd6",
  // The logo's colors, top to bottom.
  logo: ["#fff35c", "#ff9d00", "#ff2a2a"],
  // "COMING SOON" cabinets.
  comingSoon: { primary: "#9aa3b5", secondary: "#d6dbe6" },
  // The selected cabinet's glowing outline.
  highlight: "#fff35c",
  // The "1P" and "2P" tags.
  player1: "#e8334a",
  player2: "#2a5cff",
};

export const mySettings = {
  // How many seconds the sunburst takes to spin all the way around. Try 10 (fast!) to 300.
  sunburstSecondsPerTurn: 60,
  // How fast the speed lines zoom, in pixels per second. Try 10 to 300.
  speedLineSpeed: 60,
  // How often a sparkle pops up, in milliseconds. Try 100 (lots!) to 3000.
  sparkleEveryMs: 500,
  // 🛠️ TRY THIS: how long (in milliseconds) the arcade waits with nobody
  // pressing anything before it starts showing off the games by itself.
  attractDelayMs: 30000,
  // In show-off mode, how long it stays on each cabinet (milliseconds).
  attractStepMs: 2500,
  // How many "COMING SOON" cabinets to show after the real games.
  comingSoonCabinets: 2,
  // How fast the game description types out, in letters per second.
  typeLettersPerSecond: 40,
  // Music volume: 0 = off, 1 = loudest.
  musicVolume: 0.5,
  // Sound effects volume: 0 = off, 1 = loudest.
  sfxVolume: 0.7,
};

export const settings = clampSettings(mySettings, settingLimits);
```

`arcade/src/limits.ts`:
```ts
import type { Range } from "@web-games/settings";

/** Safe ranges for settings.ts. Out-of-range values get fixed with a friendly message. */
export const settingLimits: Record<string, Range> = {
  sunburstSecondsPerTurn: { min: 10, max: 300 },
  speedLineSpeed: { min: 10, max: 300 },
  sparkleEveryMs: { min: 100, max: 3000 },
  attractDelayMs: { min: 5000, max: 300000 },
  attractStepMs: { min: 1000, max: 10000 },
  comingSoonCabinets: { min: 0, max: 5 },
  typeLettersPerSecond: { min: 5, max: 200 },
  musicVolume: { min: 0, max: 1 },
  sfxVolume: { min: 0, max: 1 },
};
```

`arcade/src/cabinet.ts`:
```ts
// 🛠️ THE ARCADE CABINET
//
// Every cabinet in the arcade is drawn from this picture. Each letter is one
// pixel ("." is see-through). Some letters get their color from the game:
//
//   P  the game's main color          p  a darker shade of it
//   S  the game's second color        s  a darker shade of it
//
// The rest are the same on every cabinet (see cabinetColors below):
//
//   K  black outlines     M  the lit-up marquee (the game's name goes here)
//   D  the screen's frame G  the screen (the game's picture goes here)
//   J  joystick ball      R  red buttons        B  blue buttons
//   C  coin door          O  coin slots
//
// The game's name is written on the M area, and its picture is drawn in the
// middle of the G area, so you can move or resize those and it still works.
// (Keep the G area at least 32 wide and 24 tall so pictures fit.)
//
// 🛠️ TRY THIS: give the cabinet a third button, or make the screen bigger.

export const cabinetArt = [
  "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  "KPPKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKPPK",
  "KPPKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKPPK",
  "KppPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPppK",
  "KppPPDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDPPppK",
  "KppPPDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDPPppK",
  "KppPPDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDPPppK",
  "KppPPDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDPPppK",
  "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  "KSSSSSSSSSSJJJJSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSK",
  "KSSSSSSSSSSSKKSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSK",
  "KSSSSSSSSSSSKKSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSK",
  "KSSSSSSSSSSSKKSSSSSSSSSSRRRRSSBBBBSSRRRRSSSSSSSK",
  "KSSSSSSSSSKKKKKKSSSSSSSSRRRRSSBBBBSSRRRRSSSSSSSK",
  "KSSSSSSSSSKKKKKKSSSSSSSSRRRRSSBBBBSSRRRRSSSSSSSK",
  "KSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSK",
  "KSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSK",
  "KSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSK",
  "KssssssssssssssssssssssssssssssssssssssssssssssK",
  "KssssssssssssssssssssssssssssssssssssssssssssssK",
  "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  "KppPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCOOOCCCCOOOCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCOOOCCCCOOOCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPCCCCCCCCCCCCCCCCPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPppK",
  "KppPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPppK",
  "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  "..KKKKKK................................KKKKKK..",
  "..KKKKKK................................KKKKKK..",
];

export const cabinetColors = {
  K: "#000000",
  M: "#fff7c2",
  D: "#222233",
  G: "#101820",
  J: "#e8334a",
  R: "#e8334a",
  B: "#2a5cff",
  C: "#2b2b3a",
  O: "#ff9d00",
};
```

`arcade/src/sounds.ts`:
```ts
// 🛠️ ARCADE SOUNDS & MUSIC
//
// Put sound effects in public/assets/sounds/ and music in public/assets/music/,
// as .mp3 or .ogg, named after "file" below. Missing files are fine: the arcade
// just stays quiet for those.

import type { SoundDef } from "@web-games/audio";

export const soundEffects = {
  coin: { file: "coin", volume: 0.8 },
  move: { file: "move", volume: 0.5 },
  select: { file: "select", volume: 0.8 },
  nope: { file: "nope", volume: 0.6 },
} satisfies Record<string, SoundDef>;

export const musicTracks = {
  arcade: { file: "arcade", volume: 0.5 },
} satisfies Record<string, SoundDef>;
```

`arcade/src/controls.ts`:
```ts
// 🛠️ ARCADE CONTROLS
//
// Keys use their "code" names ("ArrowLeft", "KeyA", "Space", "Enter", ...).
// Gamepad buttons: 0 = A, 8 = Select/Back, 9 = Start, 14/15 = D-pad left/right.
// Any keyboard side and any gamepad can drive the arcade.

import type { Bindings } from "@web-games/input";

const pad = (index: number): Bindings["pad"] => ({
  index,
  buttons: { left: [14], right: [15], start: [0, 9], mute: [8] },
  axes: { left: [{ axis: 0, direction: -1 }], right: [{ axis: 0, direction: 1 }] },
});

export const arcadeControls: Bindings = {
  keys: {
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    start: ["Enter", "Space", "KeyE"],
    mute: ["KeyM"],
  },
  pad: pad(0),
};

/** A second gamepad can drive the arcade too. */
export const secondPadControls: Bindings = { keys: {}, pad: pad(1) };
```

- [ ] **Step 4: Create the logic modules**

`arcade/src/layout.ts`:
```ts
import { cabinetColors } from "./cabinet";

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The box covering every `char` in some text art (e.g. the cabinet screen "G"), or null. */
export function findRegion(art: readonly string[], char: string): Region | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  art.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== char) return;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    });
  });
  return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Makes a "#rrggbb" color darker (amount 0 to 1). */
export function shade(hex: string, amount: number): string {
  const channel = (i: number) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** The full color list for one game's cabinet. */
export function cabinetPalette(primary: string, secondary: string): Record<string, string> {
  return { ...cabinetColors, P: primary, p: shade(primary, 0.3), S: secondary, s: shade(secondary, 0.3) };
}
```

`arcade/src/selection.ts`:
```ts
import type { GameInfo } from "@web-games/arcade";

/** One spot in the row: a real game, or a "COMING SOON" cabinet. */
export type Slot = { kind: "game"; game: GameInfo } | { kind: "soon" };

export function buildSlots(games: GameInfo[], comingSoon: number): Slot[] {
  return [...games.map((game) => ({ kind: "game" as const, game })), ...Array.from({ length: comingSoon }, () => ({ kind: "soon" as const }))];
}

/** Keeps an index inside 0..count-1, wrapping around at both ends. */
export function wrap(index: number, count: number): number {
  return count === 0 ? 0 : ((index % count) + count) % count;
}

/** Which cabinet starts selected: the game you came back from, or the first one. */
export function initialIndex(slots: Slot[], fromId: string | null): number {
  const found = slots.findIndex((s) => s.kind === "game" && s.game.id === fromId);
  return found >= 0 ? found : 0;
}

/**
 * Show-off mode's next cabinet. It skips "COMING SOON" cabinets, unless
 * there's only one real game (then it wanders across all of them).
 */
export function nextAttractIndex(current: number, slots: Slot[]): number {
  const realGames = slots.filter((s) => s.kind === "game").length;
  for (let step = 1; step <= slots.length; step++) {
    const next = wrap(current + step, slots.length);
    if (realGames <= 1 || slots[next].kind === "game") return next;
  }
  return current;
}
```

`arcade/src/storage.ts`:
```ts
/** What the arcade remembers in this browser. */
export interface ArcadeSettings {
  muted: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "flynn-arcade:settings";

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadArcadeSettings(storage: StorageLike | null = browserStorage()): ArcadeSettings {
  try {
    const raw = storage?.getItem(KEY);
    return { muted: raw ? (JSON.parse(raw) as Partial<ArcadeSettings>).muted === true : false };
  } catch {
    return { muted: false };
  }
}

export function saveArcadeSettings(value: ArcadeSettings, storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(value));
  } catch {
    // Blocked storage: the setting just won't be remembered.
  }
}
```

`arcade/src/games.ts`:
```ts
import { validateGames, type GameInfo } from "@web-games/arcade";

// Every game folder's arcade.ts, found automatically when the arcade is built.
const modules = import.meta.glob<{ arcadeInfo?: unknown }>("../../*/arcade.ts", { eager: true });

/** "../../super-flynn-bros/arcade.ts" → "super-flynn-bros" */
export function folderOf(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 2] ?? "";
}

const NOT_GAMES = new Set(["arcade", "lib", "node_modules", "docs"]);

/** Every game in the arcade, checked and sorted. */
export const games: GameInfo[] = validateGames(
  Object.entries(modules)
    .filter(([path]) => !NOT_GAMES.has(folderOf(path)))
    .map(([path, mod]) => ({ folder: folderOf(path), info: mod.arcadeInfo })),
);
```

`arcade/src/badges.ts`:
```ts
/** "1P", "1–2P", plus "CO-OP" when the players team up. */
export function playerBadges(players: { min: number; max: number; coop: boolean }): { text: string; color: string }[] {
  const count = players.min === players.max ? `${players.min}P` : `${players.min}-${players.max}P`;
  const badges = [{ text: count, color: "#e8334a" }];
  if (players.coop) badges.push({ text: "CO-OP", color: "#2a5cff" });
  return badges;
}
```

- [ ] **Step 5: Verify**

Run: `npm test -w arcade && npx tsc -p arcade`
Expected: 15 passed (including "finds Super Flynn Bros"), and tsc is clean.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json arcade
git commit -m "Add the arcade app's setup, kid-editable files, and selection logic"
```

---

### Task 6: The arcade screen

**Files:**
- Create: `arcade/src/scene/{style,background,logo,cabinets,infoPanel,ArcadeScene}.ts` and `arcade/src/main.ts`

**Interfaces:**
- Consumes: everything from Task 5, plus `makeSpriteSheet`, `GameAudio`, `loadSoundsWithBackups`, `phaserAudioBackend`, `audioCandidates`, `findAllAssets`, `makeHttpExists`, `gameUrl`, `fromGameId`, and `InputManager`.
- Produces:
  - `ArcadeScene` (key `"Arcade"`) and `interface ArcadeBoot { input; games; audioFiles; fromId; muted }`
  - `createBackground(scene)` → `(deltaMs) => void`
  - `createLogo(scene, intro)`
  - `class CabinetRow { selected; select(index, animate?); notYet(); flashScreen() }`
  - `class InfoPanel { show(slot) }`
  - **`style.ts`:** `WIDTH`, `HEIGHT`, `FLOOR_Y = 112`, `CABINET_BASE_Y = 132`, `toColor`, `outlined`, `drawTwinkle`

- [ ] **Step 1: Drawing helpers, background, and logo**

`arcade/src/scene/style.ts`:
```ts
import Phaser from "phaser";

export const WIDTH = 320;
export const HEIGHT = 176;
/** Where the floor starts, and where the cabinets' feet stand. */
export const FLOOR_Y = 112;
export const CABINET_BASE_Y = 132;

/** "#ff0000" → 0xff0000, for Phaser's drawing functions. */
export const toColor = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

/** Bold text with a thick black outline: the arcade's house style. */
export function outlined(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color = "#ffffff",
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: "monospace",
      fontStyle: "bold",
      fontSize: `${size}px`,
      color,
      stroke: "#000000",
      strokeThickness: Math.max(2, Math.round(size / 4)),
    })
    .setOrigin(0.5);
}

/** A little 4-point twinkle, drawn centered on (0, 0). */
export function drawTwinkle(g: Phaser.GameObjects.Graphics, size: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillRect(-size, -1, size * 2 + 1, 3);
  g.fillRect(-1, -size, 3, size * 2 + 1);
  g.fillRect(-2, -2, 5, 5);
}
```

`arcade/src/scene/background.ts`:
```ts
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
```

`arcade/src/scene/logo.ts`:
```ts
import Phaser from "phaser";
import { colors, logoText } from "../settings";
import { drawTwinkle, toColor, WIDTH } from "./style";

/** The big chrome "THE FLYNN ARCADE" logo. With intro, it slams in and shakes the screen. */
export function createLogo(scene: Phaser.Scene, intro: boolean): Phaser.GameObjects.Text {
  const logo = scene.add
    .text(WIDTH / 2, 17, logoText, {
      fontFamily: "monospace",
      fontStyle: "bold",
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setShadow(2, 2, "#000000", 0, true, true)
    .setDepth(5);

  // Yellow → orange → red, top to bottom
  const gradient = logo.context.createLinearGradient(0, 0, 0, logo.height);
  colors.logo.forEach((color, i) => gradient.addColorStop(i / Math.max(1, colors.logo.length - 1), color));
  logo.setFill(gradient);

  if (intro) {
    logo.setScale(3);
    scene.tweens.add({
      targets: logo,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => scene.cameras.main.shake(150, 0.01),
    });
  }

  // A glint sweeps across the logo every few seconds
  scene.time.addEvent({
    delay: 4000,
    loop: true,
    callback: () => {
      const glint = scene.add.graphics({ x: logo.x - logo.width / 2, y: logo.y - 4 }).setDepth(6);
      drawTwinkle(glint, 5, toColor("#ffffff"));
      scene.tweens.add({
        targets: glint,
        x: logo.x + logo.width / 2,
        duration: 500,
        ease: "Sine.easeInOut",
        onComplete: () => glint.destroy(),
      });
    },
  });
  return logo;
}
```

- [ ] **Step 2: Cabinets and the info panel**

`arcade/src/scene/cabinets.ts`:
```ts
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
```

`arcade/src/scene/infoPanel.ts`:
```ts
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
```

- [ ] **Step 3: The scene and entry point**

`arcade/src/scene/ArcadeScene.ts`:
```ts
import Phaser from "phaser";
import { gameUrl, type GameInfo } from "@web-games/arcade";
import { GameAudio, loadSoundsWithBackups, phaserAudioBackend } from "@web-games/audio";
import type { InputManager } from "@web-games/input";
import { buildSlots, initialIndex, nextAttractIndex, wrap, type Slot } from "../selection";
import { saveArcadeSettings } from "../storage";
import { settings } from "../settings";
import { musicTracks, soundEffects } from "../sounds";
import { createBackground } from "./background";
import { createLogo } from "./logo";
import { CabinetRow } from "./cabinets";
import { InfoPanel } from "./infoPanel";
import { HEIGHT, outlined, WIDTH } from "./style";

/** Handed over by main.ts through the game registry. */
export interface ArcadeBoot {
  input: InputManager;
  games: GameInfo[];
  /** Sound and music files that exist: cache key → urls (.mp3 first, then .ogg). */
  audioFiles: Map<string, string[]>;
  /** The game the player just came back from, if any. */
  fromId: string | null;
  muted: boolean;
}

/** The whole arcade: one scene with the background, logo, cabinets, and info panel. */
export class ArcadeScene extends Phaser.Scene {
  private boot!: ArcadeBoot;
  private audio!: GameAudio;
  private slots: Slot[] = [];
  private row!: CabinetRow;
  private panel!: InfoPanel;
  private coinText!: Phaser.GameObjects.Text;
  private updateBackground: (deltaMs: number) => void = () => {};
  private ready = false;
  private starting = false;
  private lastInputAt = 0;
  private attracting = false;
  private nextAttractAt = 0;

  constructor() {
    super("Arcade");
  }

  create(): void {
    this.boot = this.registry.get("boot") as ArcadeBoot;
    loadSoundsWithBackups(this, this.boot.audioFiles, () => this.build());
  }

  private build(): void {
    const { games, fromId, muted, audioFiles } = this.boot;
    this.audio = new GameAudio(phaserAudioBackend(this.sound), {
      sfx: soundEffects,
      music: musicTracks,
      available: new Set([...audioFiles.keys()].filter((key) => this.cache.audio.exists(key))),
      sfxVolume: settings.sfxVolume,
      musicVolume: settings.musicVolume,
      muted,
    });
    this.audio.reportMissing();
    // Browsers hold music until the first key press, then it starts.
    this.audio.playMusic("arcade");

    this.updateBackground = createBackground(this);
    this.slots = buildSlots(games, settings.comingSoonCabinets);
    this.row = new CabinetRow(this, this.slots);
    this.panel = new InfoPanel(this);
    createLogo(this, fromId === null);
    this.coinText = outlined(this, WIDTH - 4, 38, "INSERT COIN", 8, "#fff35c").setOrigin(1, 0.5).setDepth(5);
    this.tweens.add({ targets: this.coinText, alpha: 0, duration: 500, yoyo: true, repeat: -1, hold: 0 });

    const index = initialIndex(this.slots, fromId);
    this.row.select(index, false);
    this.panel.show(this.slots[index]);
    this.lastInputAt = this.time.now;
    this.ready = true;
  }

  update(_time: number, delta: number): void {
    if (!this.ready) return;
    this.updateBackground(delta);
    if (this.starting) return;

    const { input } = this.boot;
    const now = this.time.now;
    const pressed = (action: string) => input.anyJustPressed(action);
    const anyPress = ["left", "right", "start", "mute"].some(pressed);

    if (pressed("mute")) {
      this.audio.toggleMute();
      saveArcadeSettings({ muted: this.audio.muted });
    }

    if (this.attracting) {
      // Any press just wakes the arcade up.
      if (anyPress) {
        this.attracting = false;
        this.lastInputAt = now;
      } else if (now >= this.nextAttractAt) {
        this.selectIndex(nextAttractIndex(this.row.selected, this.slots), false);
        this.nextAttractAt = now + settings.attractStepMs;
      }
      return;
    }

    if (anyPress) this.lastInputAt = now;
    if (pressed("left")) this.selectIndex(wrap(this.row.selected - 1, this.slots.length), true);
    else if (pressed("right")) this.selectIndex(wrap(this.row.selected + 1, this.slots.length), true);
    else if (pressed("start")) this.start();

    if (now - this.lastInputAt > settings.attractDelayMs) {
      this.attracting = true;
      this.nextAttractAt = now;
    }
  }

  private selectIndex(index: number, withSound: boolean): void {
    if (withSound) this.audio.playSfx("move");
    this.row.select(index);
    this.panel.show(this.slots[index]);
  }

  private start(): void {
    const slot = this.slots[this.row.selected];
    if (slot.kind === "soon") {
      this.audio.playSfx("nope");
      this.row.notYet();
      return;
    }
    this.starting = true;
    this.audio.playSfx("coin");
    this.tweens.killTweensOf(this.coinText);
    this.coinText.setAlpha(1).setText("CREDIT 1");

    this.time.delayedCall(150, () => {
      this.cameras.main.flash(120, 255, 255, 255);
      this.audio.playSfx("select");
      this.row.flashScreen();
      this.gameStartBanner();
    });
    this.time.delayedCall(150 + 400 + 500, () => {
      this.audio.stopMusic();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        window.location.assign(gameUrl(slot.game, { dev: import.meta.env.DEV }));
      });
    });
  }

  /** A giant "GAME START!" zooming in over a burst of speed lines. */
  private gameStartBanner(): void {
    const lines = this.add.graphics({ x: WIDTH / 2, y: HEIGHT / 2 }).setDepth(9);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      lines.fillStyle(i % 2 ? 0xffd200 : 0xffffff, 0.9);
      lines.fillTriangle(Math.cos(a) * 20, Math.sin(a) * 20, Math.cos(a + 0.04) * 260, Math.sin(a + 0.04) * 260, Math.cos(a - 0.04) * 260, Math.sin(a - 0.04) * 260);
    }
    this.tweens.add({ targets: lines, alpha: 0, scale: 1.5, duration: 700 });
    const banner = outlined(this, WIDTH / 2, HEIGHT / 2, "GAME START!", 24, "#ff2a2a").setDepth(10).setScale(4);
    this.tweens.add({ targets: banner, scale: 1, duration: 400, ease: "Back.easeOut" });
  }
}
```

`arcade/src/main.ts`:
```ts
import Phaser from "phaser";
import { fromGameId } from "@web-games/arcade";
import { audioCandidates, findAllAssets, makeHttpExists } from "@web-games/audio";
import { InputManager } from "@web-games/input";
import { arcadeControls, secondPadControls } from "./controls";
import { games } from "./games";
import { musicTracks, soundEffects } from "./sounds";
import { loadArcadeSettings } from "./storage";
import { ArcadeScene, type ArcadeBoot } from "./scene/ArcadeScene";
import { HEIGHT, WIDTH } from "./scene/style";

// Coming back with the browser's Back button can show a frozen copy of the
// page (mid "GAME START!"). Reload it so the arcade is fresh.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

async function start(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const input = new InputManager(window);
  input.setBindings(1, arcadeControls);
  input.setBindings(2, secondPadControls);

  const boot: ArcadeBoot = {
    input,
    games,
    audioFiles: await findAllAssets(audioCandidates(soundEffects, musicTracks), makeHttpExists()),
    fromId: fromGameId(window.location.search),
    muted: loadArcadeSettings().muted,
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: WIDTH,
    height: HEIGHT,
    pixelArt: true,
    backgroundColor: "#1b1464",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [ArcadeScene],
    callbacks: {
      preBoot: (g) => {
        g.registry.set("boot", boot);
      },
    },
  });
  game.events.on(Phaser.Core.Events.PRE_STEP, () => input.update());
  // ?debug=1 exposes the arcade in the browser console as `game`.
  if (params.has("debug")) (window as unknown as { game: Phaser.Game }).game = game;
}

void start();
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run typecheck && npm run build`
Expected: every workspace passes, and the build succeeds.

Run `npm run dev -w arcade` and `npm run dev -w super-flynn-bros` (two terminals), then open `http://localhost:8000/?debug=1`.
Expected:
- **First load:**
  - The logo slams in from 3× and the screen shakes.
  - The blue/violet sunburst turns slowly, speed lines stream across the top and bottom, and sparkles pop in.
  - The floor has magenta grid lines.
  - "INSERT COIN" blinks at the top right.
- **Cabinets:**
  - The Super Flynn Bros cabinet (blue and yellow, Colin and Ryan on its screen, chase lights on its marquee) is selected and centered at 1.1× with a pulsing yellow outline.
  - Red "1P" and blue "2P" tags bob above it.
  - Two grey "COMING SOON" cabinets with bouncing "?" sit to the right.
- **Info panel:** "SUPER FLYNN BROS", "1-2P" and "CO-OP" badges, and the blurb typing out on two lines inside the panel.
- **→ then Enter:** the row slides, the panel says "COMING SOON", and pressing Enter spins the "?" while "NOT YET!" pops up on that cabinet's screen.
- **← then Enter:** "CREDIT 1", a white flash, and "GAME START!" zooming in over speed lines. About a second later it fades out and opens `http://localhost:8001/`.
- **Coming back:** in the game, Space, then ↑ to BACK TO ARCADE, then Enter returns to `http://localhost:8000/?from=super-flynn-bros` with Super Flynn Bros selected and no logo slam.
- **Back button (Review Focus #2):** start the game, then press the browser's Back button. The arcade shows fresh, not a frozen black frame.
- **Attract mode:** leave it alone for 30 s, then the selection starts moving by itself every 2.5 s. Any key stops it.
- **Console:** only the "No sound for: coin, move, select, nope…" info line, and no errors.

- [ ] **Step 5: Commit**

```bash
git add arcade
git commit -m "Add the arcade select screen: sunburst, chrome logo, cabinets, and GAME START"
```

---

### Task 7: Docker, routing, and docs

**Files:**
- Create: `arcade/Dockerfile`, `arcade/nginx.conf`, `arcade/README.md`
- Modify: `docker-compose.yml`, `CLAUDE.md`, `README.md`

**Interfaces:**
- Produces: compose service `arcade` (8000 → nginx :80), `depends_on: [super-flynn-bros]`. Its nginx forwards `/super-flynn-bros/` to `http://super-flynn-bros:80/`.

- [ ] **Step 1: Docker and nginx**

`arcade/Dockerfile`:
```dockerfile
# Built from the repo root so the shared lib/ packages are available:
#   docker compose up --build arcade
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build -w arcade

FROM nginx:1.27-alpine
COPY arcade/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/arcade/dist /usr/share/nginx/html
```

`arcade/nginx.conf`:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  # Redirects keep whatever address and port you used (e.g. localhost:8000).
  absolute_redirect off;

  # 🕹️ One block per game: /<game-id>/ is passed to that game's own container.
  # Add a block here whenever a new game joins the arcade (see CLAUDE.md).
  location = /super-flynn-bros { return 301 /super-flynn-bros/; }
  location /super-flynn-bros/ { proxy_pass http://super-flynn-bros:80/; }

  # The arcade itself. Missing files are real 404s, so optional sounds are skipped.
  location / {
    try_files $uri $uri/ =404;
  }
}
```

`docker-compose.yml`:
```diff
--- a/docker-compose.yml
+++ b/docker-compose.yml
@@ -17,3 +17,14 @@ services:
     ports:
       - "8001:80"
     restart: unless-stopped
+
+  # The front door: http://localhost:8000 (forwards /<game-id>/ to each game).
+  arcade:
+    build:
+      context: .
+      dockerfile: arcade/Dockerfile
+    ports:
+      - "8000:80"
+    depends_on:
+      - super-flynn-bros
+    restart: unless-stopped
```

- [ ] **Step 2: Verify routing (Review Focus #3 and #4)**

Run:
```bash
docker compose up --build -d
for u in / /super-flynn-bros /super-flynn-bros/ /super-flynn-bros/assets/sounds/jump.mp3 /assets/sounds/coin.mp3; do
  printf "%-45s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -I http://localhost:8000$u)"; done
curl -s http://localhost:8001/ | grep -o '<title>.*</title>'
```
Expected:
```
/                                             200
/super-flynn-bros                             301 http://localhost:8000/super-flynn-bros/
/super-flynn-bros/                            200
/super-flynn-bros/assets/sounds/jump.mp3      404
/assets/sounds/coin.mp3                       404
<title>Super Flynn Bros</title>
```
Then open `http://localhost:8000/` in the browser.
Expected:
- Picking Super Flynn Bros opens `http://localhost:8000/super-flynn-bros/` and the game plays.
- Its BACK TO ARCADE returns to `http://localhost:8000/?from=super-flynn-bros`.
- No console errors.

Finally run `docker compose down`.

- [ ] **Step 3: Docs**

`arcade/README.md`:
````markdown
# 🕹️ The Flynn Arcade

This is the front door of the arcade: a loud, colorful select screen where you
walk along a row of arcade cabinets and pick a game to play.

- **Address:** <http://localhost:8000>
- **Controls:** ◀ ▶ (or A / D, or a gamepad) to pick a cabinet, Start (Enter,
  Space, E, or the gamepad's A/Start) to play, M to mute.
- Leave it alone for 30 seconds and it starts showing off the games by itself!

---

## 🔍 How It Works

**Finding games.** The arcade doesn't have a list of games written anywhere.
Instead, every game folder has a little file called `arcade.ts` that says how
its cabinet should look. When the arcade is built,
[`src/games.ts`](src/games.ts) finds every `*/arcade.ts` file next to it and
checks it. If one has a mistake, the arcade leaves that game out and tells you
why in the browser console, instead of breaking.

**Drawing it.** Everything is drawn by code. There are no picture files:
- the sunburst, floor, speed lines, and sparkles in
  [`src/scene/background.ts`](src/scene/background.ts)
- the chrome logo in [`src/scene/logo.ts`](src/scene/logo.ts)
- the cabinets (from the text drawing in [`src/cabinet.ts`](src/cabinet.ts)) in
  [`src/scene/cabinets.ts`](src/scene/cabinets.ts)
- the info panel at the bottom in [`src/scene/infoPanel.ts`](src/scene/infoPanel.ts)

[`src/scene/ArcadeScene.ts`](src/scene/ArcadeScene.ts) puts it all together and
handles the controls, "GAME START!", and show-off mode.

**Going to a game and back.** Pressing Start sends your browser to the game's
address. In Docker that's `/super-flynn-bros/` on this same address: the
arcade's web server ([`nginx.conf`](nginx.conf)) passes it along to the game's
own server. When you pick "BACK TO ARCADE" in the game, it sends you to
`/?from=super-flynn-bros`, so the arcade knows which cabinet to light up.

---

## 🛠️ Make It Your Own

Run it with live editing:

```bash
npm run dev -w arcade
```

Open <http://localhost:8000>, then change things and save.

### Change the colors and the logo
Open [`src/settings.ts`](src/settings.ts):
- `logoText`: the words in the big logo
- `colors.sunburst`: the spinning rays (try `["#ff2bd6", "#00e5ff"]`!)
- `colors.logo`: the logo's colors, top to bottom
- `sunburstSecondsPerTurn`: set it to `10` and watch it spin!
- `attractDelayMs`: how long before show-off mode starts
- `comingSoonCabinets`: how many "COMING SOON" cabinets to show

### Redraw the cabinet
[`src/cabinet.ts`](src/cabinet.ts) is the cabinet, drawn with letters. `P` and
`S` take each game's colors. `G` is the screen, where the game's picture goes,
and `M` is the marquee with the blinking lights. Add buttons, change the
joystick, or make it taller. Keep the `G` screen at least 32 wide and 24 tall.

### Change how a game's cabinet looks
Each game's own `arcade.ts` (like
[`../super-flynn-bros/arcade.ts`](../super-flynn-bros/arcade.ts)) sets its
cabinet `colors`, its `blurb`, and the little picture on its screen
(`screenArt`, up to 32 × 24 letters).

### Add sounds
Put these in `public/assets/sounds/` as `.mp3` or `.ogg`: `coin`, `move`,
`select`, `nope`. Arcade music goes in `public/assets/music/arcade.mp3`. The
full list is in [`src/sounds.ts`](src/sounds.ts). Missing ones are fine: the
arcade just stays quiet.

### Oops, I broke it
Press **F12** and look at the *Console*: the arcade explains what's wrong. To
put a file back, ask a grown-up to run `git checkout -- arcade/src/settings.ts`
(or whichever file you changed).

---

## 🧰 For Grown-Ups

- `npm run dev -w arcade`: dev server on port 8000. Cabinets link to each
  game's own dev server (its `devPort`), so run that game's dev server too.
- `npm test -w arcade`: unit tests (settings, cabinet art, selection, storage,
  game discovery).
- `docker compose up --build`: the arcade on 8000, proxying `/<game-id>/` to
  each game's container.
- **Adding a game:** see `CLAUDE.md` §9 and §10. In short, add
  `<game>/arcade.ts`, a `location` block in [`nginx.conf`](nginx.conf), and the
  game to the `arcade` service's `depends_on` in `docker-compose.yml`.
- `?debug=1` exposes the Phaser game as `game` in the console.
- Mute is saved in `localStorage` under `flynn-arcade:settings`.
- Shared libraries used: `lib/input`, `lib/pixel-art`, `lib/audio`,
  `lib/settings`, `lib/arcade`.
````

`CLAUDE.md`:
````diff
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -21,18 +21,23 @@ the-flynn-arcade/
 ├── CLAUDE.md              # This file — global rules (source of truth)
 ├── README.md              # Kid-friendly arcade front page + games table
 ├── docker-compose.yml     # Master compose file: one service per game + server
-├── package.json           # npm workspaces root (games, lib/*, server)
+├── package.json           # npm workspaces root (games, arcade, lib/*, server)
+├── arcade/                # The Flynn Arcade: the game picker everyone starts from (port 8000)
 ├── server/                # Universal multiplayer server (only if a game needs it)
 ├── lib/                   # Shared libraries, one package per subdirectory
-│   ├── net/               #   e.g. client for the multiplayer server
-│   └── input/             #   e.g. keyboard / gamepad / touch abstraction
+│   ├── input/             #   keyboard + gamepad actions per player
+│   ├── pixel-art/         #   text-grid pixel art → Phaser textures
+│   ├── audio/             #   optional sounds/music, skipped when missing
+│   ├── settings/          #   clamp kid-edited numbers into safe ranges
+│   └── arcade/            #   GameInfo + links between the arcade and games
 └── <game-name>/           # One directory per game, at the repo root
+    └── arcade.ts          #   how the game shows up in the arcade (§10)
 ```
 
 - Each game lives in its own **kebab-case** directory at the repo root
   (e.g. `space-pong/`, `tic-tac-toe/`).
-- Reserved root directory names (never use for a game): `server`, `lib`,
-  `docs`, `scripts`, `node_modules`.
+- Reserved root directory names (never use for a game): `arcade`, `server`,
+  `lib`, `docs`, `scripts`, `node_modules`.
 - Games must not import from other games. Anything shared goes in `lib/`.
 
 ## 2. Stack (all games)
@@ -93,6 +98,7 @@ Each game's `README.md` must include:
 
 | Service  | Host port | Notes                         |
 | -------- | --------- | ----------------------------- |
+| arcade   | 8000      | The Flynn Arcade game picker (front door) |
 | server   | 3000      | Multiplayer WebSocket server (reserved) |
 | super-flynn-bros | 8001 | 8-bit side scroller (1–2 players, local) |
 | _(next game)_ | 8002 | Games get 8001, 8002, … in order |
@@ -133,11 +139,15 @@ rather than special-casing one game in the core.
 - Each library is its own npm workspace package: `lib/<name>/` with
   `package.json` name `@web-games/<name>`.
 - Games depend on it via `"@web-games/<name>": "*"` in their `package.json`.
+- Current libraries:
+  - `lib/input` — keyboard + gamepad (Gamepad API) actions per player
+  - `lib/pixel-art` — text-grid pixel art, PNG overrides
+  - `lib/audio` — optional sounds and music, quiet when files are missing
+  - `lib/settings` — `clampSettings` for kid-edited numbers
+  - `lib/arcade` — `GameInfo`, validation, arcade ↔ game URLs
 - Candidates (create when first needed, not ahead of time):
   - `lib/net` — multiplayer client (connect, rooms, send/receive, reconnect)
-  - `lib/input` — unified keyboard / gamepad (Gamepad API) / touch input
-  - `lib/ui` — shared menus, lobby screen, room-code entry, settings
-  - `lib/audio` — volume / mute persistence
+  - `lib/ui` — shared menus, lobby screen, room-code entry
 - Promote code into `lib/` once a second game needs it; don't build speculative
   abstractions.
 - Libraries must not depend on any specific game.
@@ -215,7 +225,28 @@ At minimum, include:
    `README.md`. Keep the root README's fun, kid-friendly tone.
 8. Sanity-check tweakability: change a setting and swap the hero image, and
    confirm both work with hot reload.
-9. Verify `docker compose up --build <game-name>` works.
+9. Join the arcade (§10): add `<game-name>/arcade.ts`, a `location` block in
+   `arcade/nginx.conf`, the game to the `arcade` service's `depends_on`, and
+   a "BACK TO ARCADE" / "QUIT TO ARCADE" option using `arcadeUrl()`.
+10. Verify `docker compose up --build` works: the game on its own port, and
+    through the arcade at `http://localhost:8000/<game-name>/`.
+
+## 10. The Arcade (`arcade/`)
+
+The arcade is the front door: kids open `http://localhost:8000` and pick a
+game cabinet. It's a Vite + Phaser app like the games.
+
+- **Joining:** each game exports `arcadeInfo: GameInfo` (from
+  `@web-games/arcade`) in `<game-name>/arcade.ts`: `id` (= folder name),
+  `title`, `blurb`, `players`, cabinet `colors`, `devPort`, optional `order`,
+  and a `screenArt` text picture (up to 32 × 24). The arcade finds every
+  `*/arcade.ts` automatically at build time. Never edit arcade code to add a game.
+- **Routing:** in Docker the arcade serves `/` and its nginx forwards
+  `/<game-name>/` to the game's container. In dev the arcade links to the
+  game's own dev server (`devPort`). Games are built with `base: "./"` so they
+  work under a path.
+- **Going back:** games link back with `arcadeUrl("<game-name>", { dev:
+  import.meta.env.DEV })`, which reopens the arcade on that game's cabinet.
 
 ---
 
@@ -223,6 +254,10 @@ At minimum, include:
 
 Record every change to these guidelines (newest first).
 
+- 2026-10-21 — Added **The Flynn Arcade** launcher (`arcade/`, port 8000) and
+  §10. Games join with `<game>/arcade.ts`. Promoted shared code into
+  `lib/pixel-art`, `lib/audio`, `lib/settings`; added `lib/arcade`.
+
 - 2026-10-18 — First game: Super Flynn Bros on port 8001. Added the root
   npm workspace (`package.json`, `tsconfig.base.json`) and the first shared
   library, `lib/input` (keyboard + gamepad).
````

`README.md`:
````diff
--- a/README.md
+++ b/README.md
@@ -45,16 +45,18 @@ You'll need a grown-up for this part the first time.
 ```bash
 docker compose up --build
 ```
-Then open the game's address in your browser. Each game's README says which
-one, like `http://localhost:8001`.
+Then open **http://localhost:8000**: that's the arcade! 🕹️ Walk along the
+cabinets with ◀ ▶, and press Start (Enter or Space) to play. Every game has a
+"BACK TO ARCADE" option to come back.
 
 **The tinkering way (live editing):**
 ```bash
 npm install
-npm run dev -w <game-name>
+npm run dev -w arcade            # the arcade, at http://localhost:8000
+npm run dev -w <game-name>       # in another terminal: the game you're changing
 ```
-Open the address it prints. Now every time you save a change, the game
-updates right in front of you. ✨
+Now every time you save a change, the game updates right in front of you. ✨
+(You can also open a game's own address directly, like `http://localhost:8001`.)
 
 ---
 
@@ -87,6 +89,7 @@ Quick overview:
 - **Each game** lives in its own folder at the top level
 - **`server/`** is one shared multiplayer server for two-player games
 - **`lib/`** holds shared helpers like gamepad support and networking
+- **`arcade/`** is the game picker everyone starts from, at port 8000
 - **`docker-compose.yml`** runs the whole arcade
 
 ---
````

- [ ] **Step 4: Final verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: every workspace passes.
- `lib/arcade` 9, `lib/audio` 21, `lib/input` 13, `lib/pixel-art` 7, `lib/settings` 3
- Super Flynn Bros 94, arcade 15
- Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add arcade/Dockerfile arcade/nginx.conf arcade/README.md docker-compose.yml CLAUDE.md README.md
git commit -m "Add arcade Docker routing and docs"
```
