# Super Flynn Bros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Super Flynn Bros, an 8-bit side scroller starring Colin and Ryan (1P or 2P co-op) across four Woodland Hills levels. Everything a kid would want to tweak lives in plain, commented data files.

**Architecture:** A Phaser 3 + Vite + TypeScript game in `super-flynn-bros/`, plus a new shared `lib/input` workspace package (keyboard + gamepad → per-player actions). All art is text grids turned into canvas textures at boot. Levels are text maps turned into a Phaser tilemap. Logic that can be pure (art parsing, level loading, settings clamping, camera math, audio wrapper, asset discovery, progress storage) lives in `src/engine/` with Vitest tests. Phaser-bound code (Hero, Hazard, scenes) is checked by playing in a browser.

**Tech Stack:** TypeScript 5.9.3 (strict), Vite 7.3.7, Phaser 3.90.0 (Arcade Physics), Vitest 5.0.5, npm workspaces, Docker (node:22-alpine → nginx:1.27-alpine).

**Spec:** `docs/superpowers/specs/2026-10-18-super-flynn-bros-design.md`

## Global Constraints

- Stack per root `CLAUDE.md` §2: TypeScript strict, Vite, Phaser 3, Node 22 (Docker image `node:22-alpine`), npm workspaces with a single root lockfile.
- Exact versions: `phaser` 3.90.0, `vite` 7.3.7, `vitest` 5.0.5, `typescript` 5.9.3.
- Port **8001** for the Vite dev server, Vite preview, and Docker host port.
- Logical resolution **320×176** (11 rows of 16 px tiles), `pixelArt: true`, `Scale.FIT`. *(Changed from the spec's 320×180 so a level is exactly one screen tall. Task 14 updates the spec.)*
- No third-party art or audio. All art is text grids in `src/`. Sound and music files are optional, and a missing file is silently skipped.
- Kid-editable files (`settings.ts`, `heroes.ts`, `hazards.ts`, `items.ts`, `tiles.ts`, `sounds.ts`, `controls.ts`, `levels/*`) get friendly comments and `🛠️ TRY THIS` markers, and must never import Phaser.
- Hazards are friendly obstacles: no stomping, no defeating. Touching one costs a heart.
- Items: **donut** = +10 score ("coin"). **Burger** (double-double, generic red/yellow wrapper, no logos) = +1 heart, capped at `maxHearts`.
- Save data: browser `localStorage` only, key `super-flynn-bros:progress`, every access wrapped in try/catch.
- Vite `appType: "mpa"` so missing optional files return a real 404 (no SPA fallback).
- The tile legend lives in `src/tiles.ts` (each tile has a `mapChar`), not in a separate `levels/legend.ts`. Map markers `1`, `2`, `G` are fixed in `engine/levelLoader.ts`. *(Deviation from the spec's file list; Task 14 updates the spec.)*

## Review Focus

Inputs and situations the spec implies but no feature test would naturally hit. Each has a test in the task that owns the code:

1. **A kid drops in a custom PNG of any size or shape** (e.g. a 64×128 photo crop for Colin). Expected: it's scaled to fit the hero's art box and the hitbox scales with it, so it never grows huge or falls through floors. Owner: Task 10 (`tests/sprites.test.ts`), plus `stripFrameCount` in Task 4.
2. **A server answers a missing sound URL with `index.html` and status 200** (an SPA fallback, a misconfigured host). Expected: treated as missing, not loaded as audio. Owner: Task 5 (`makeHttpExists` "web page instead of the file" test).
3. **Storage is blocked** (Safari private mode, cleared site data, `localStorage` throws). Expected: defaults load and saving silently does nothing. Owner: Task 3 (`progress.test.ts` "never throws when storage is blocked or missing").
4. **A gamepad is unplugged mid-game, or the browser throws when reading gamepads.** Expected: that player's pad inputs read as released, no crash. Owner: Task 2 ("survives it being unplugged", "survives a browser that throws").
5. **The window loses focus while a key is held** (Alt-Tab while running right). Expected: on return, the hero isn't stuck running. Owner: Task 2 ("lets go of every key when the window loses focus").

---

## File Structure

```
(repo root)
├── package.json                 # NEW: npm workspaces root
├── tsconfig.base.json           # NEW: shared strict TS config
├── .dockerignore                # NEW
├── docker-compose.yml           # MODIFY: add super-flynn-bros service
├── README.md                    # MODIFY: add game to the games table
├── CLAUDE.md                    # MODIFY: port registry row
├── lib/input/                   # NEW: @web-games/input
│   ├── package.json, tsconfig.json
│   ├── src/index.ts             # resolveActions, mergeBindings, InputManager
│   └── tests/input.test.ts
└── super-flynn-bros/            # NEW: the game
    ├── package.json, tsconfig.json, vite.config.ts, index.html
    ├── Dockerfile, nginx.conf, README.md
    ├── public/assets/{sounds,music}/.gitkeep
    ├── src/
    │   ├── main.ts              # finds optional files, creates the Phaser game
    │   ├── settings.ts          # 🛠️ physics, hearts, volumes (clamped)
    │   ├── heroes.ts            # 🛠️ Colin & Ryan art + stats
    │   ├── hazards.ts           # 🛠️ dog, chaseDog, neighbor, skateboarder, sprinkler, baseball, mower
    │   ├── items.ts             # 🛠️ donut, burger, heart icons
    │   ├── tiles.ts             # 🛠️ sidewalk, brick, trash bin, car, fence, goal sign
    │   ├── sounds.ts            # 🛠️ sfx + music file list
    │   ├── controls.ts          # 🛠️ key/gamepad bindings
    │   ├── levels/              # 🛠️ themes.ts, level1-4, index.ts
    │   ├── engine/              # machinery: types, validate, limits, progress, camera, pixelArt,
    │   │                        #   assets, audio, phaserAudio, catalog, levelLoader, tileset,
    │   │                        #   backgrounds, sprites, ui, services, Hero, Hazard
    │   └── scenes/              # Boot, Title, Play, Hud, Pause, LevelComplete, Ending
    └── tests/                   # Vitest: one file per engine module + data + levels
```

---

### Task 1: Workspace and game scaffold

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.dockerignore`
- Create: `super-flynn-bros/package.json`, `super-flynn-bros/tsconfig.json`, `super-flynn-bros/vite.config.ts`, `super-flynn-bros/index.html`, `super-flynn-bros/src/main.ts` (placeholder, replaced in Task 9)
- Create: `super-flynn-bros/public/assets/sounds/.gitkeep`, `super-flynn-bros/public/assets/music/.gitkeep`

**Interfaces:**
- Produces: npm workspaces `lib/*` and `super-flynn-bros`. Game scripts `dev`, `build`, `preview`, `typecheck`, `test`. Root scripts `test`, `typecheck`, `build` fan out to the workspaces.

- [ ] **Step 1: Create the root workspace files**

`package.json`:
```json
{
  "name": "the-flynn-arcade",
  "private": true,
  "workspaces": [
    "lib/*",
    "super-flynn-bros"
  ],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "build": "npm run build --workspaces --if-present"
  },
  "engines": {
    "node": ">=22"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true
  }
}
```

`.dockerignore`:
```text
.git
**/node_modules
**/dist
**/.vite
docs
```

- [ ] **Step 2: Create the game package**

`super-flynn-bros/package.json` (no `@web-games/input` dependency yet; Task 9 adds it):
```json
{
  "name": "@web-games/super-flynn-bros",
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
    "phaser": "3.90.0"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vite": "7.3.7",
    "vitest": "5.0.5"
  }
}
```

`super-flynn-bros/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src", "tests", "vite.config.ts"]
}
```

`super-flynn-bros/vite.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  // "mpa" turns off Vite's single-page-app fallback, so a missing sound or
  // picture gets a real 404 instead of index.html. The game relies on that to
  // skip files that haven't been added yet.
  appType: "mpa",
  server: { port: 8001, strictPort: true },
  preview: { port: 8001, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 }, // Phaser is one big file, and that's OK
  test: { environment: "node", include: ["tests/**/*.test.ts"], passWithNoTests: true },
});
```

`super-flynn-bros/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Super Flynn Bros</title>
    <style>
      html, body { margin: 0; height: 100%; background: #1a1c2c; overflow: hidden; }
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

`super-flynn-bros/src/main.ts` (placeholder):
```ts
import Phaser from "phaser";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 320,
  height: 176,
  pixelArt: true,
  backgroundColor: "#6cc4ff",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: {
    create(this: Phaser.Scene) {
      this.add
        .text(160, 88, "SUPER FLYNN BROS", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" })
        .setOrigin(0.5);
    },
  },
});
```

Then create the empty asset folders:
```bash
mkdir -p super-flynn-bros/public/assets/sounds super-flynn-bros/public/assets/music
touch super-flynn-bros/public/assets/sounds/.gitkeep super-flynn-bros/public/assets/music/.gitkeep
```

- [ ] **Step 3: Install and verify**

Run: `npm install`
Expected: creates `package-lock.json` and `node_modules/`. npm 11 may warn that esbuild's install script wasn't approved. Vite still works without it (esbuild ships prebuilt platform packages).

Run: `npm run typecheck -w super-flynn-bros && npm test -w super-flynn-bros && npm run build -w super-flynn-bros`
Expected: tsc passes with no output, Vitest reports no test files and passes (`passWithNoTests`), and Vite writes `super-flynn-bros/dist/`.

Run: `npm run dev -w super-flynn-bros` (background), then `curl -s http://localhost:8001/ | grep -o "<title>.*</title>"`
Expected: `<title>Super Flynn Bros</title>`. Opening the page shows "SUPER FLYNN BROS" on light blue. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json .dockerignore super-flynn-bros
git commit -m "Scaffold npm workspaces and Super Flynn Bros game package"
```

---

### Task 2: Shared input library (`lib/input`)

**Files:**
- Create: `lib/input/package.json`, `lib/input/tsconfig.json`, `lib/input/src/index.ts`
- Test: `lib/input/tests/input.test.ts`

**Interfaces:**
- Produces (all exported from `@web-games/input`):
  - `interface Bindings { keys: Record<string, string[]>; pad?: PadBindings }`
  - `interface PadBindings { index: number; buttons: Record<string, number[]>; axes?: Record<string, { axis: number; direction: -1 | 1 }[]> }`
  - `interface PadState { buttons: boolean[]; axes: number[] }`
  - `resolveActions(bindings: Bindings, pressedKeys: ReadonlySet<string>, pad: PadState | null): Set<string>`
  - `mergeBindings(...list: Bindings[]): Bindings`
  - `class InputManager { constructor(target: EventTarget, getGamepads?: () => ArrayLike<Gamepad | null>); setBindings(player: number, b: Bindings): void; clearBindings(player: number): void; update(): void; isDown(player: number, action: string): boolean; justPressed(player: number, action: string): boolean; anyJustPressed(action: string): boolean; destroy(): void }`

- [ ] **Step 1: Create the package files**

`lib/input/package.json`:
```json
{
  "name": "@web-games/input",
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

`lib/input/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 2: Write the failing tests**

`lib/input/tests/input.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { InputManager, mergeBindings, resolveActions, type Bindings, type PadState } from "../src/index";

const bindings: Bindings = {
  keys: { left: ["ArrowLeft"], jump: ["Space", "ArrowUp"] },
  pad: { index: 0, buttons: { jump: [0] }, axes: { left: [{ axis: 0, direction: -1 }] } },
};

const pad = (pressed: number[] = [], axes: number[] = [0, 0]): PadState => ({
  buttons: Array.from({ length: 16 }, (_, i) => pressed.includes(i)),
  axes,
});

function keyEvent(type: "keydown" | "keyup", code: string): Event {
  return Object.assign(new Event(type, { cancelable: true }), { code });
}

function fakeGamepad(pressed: number[], axes = [0, 0]): Gamepad {
  return {
    buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })),
    axes,
  } as unknown as Gamepad;
}

describe("resolveActions", () => {
  it("turns pressed keys into actions", () => {
    expect(resolveActions(bindings, new Set(["ArrowUp"]), null)).toEqual(new Set(["jump"]));
  });

  it("reads gamepad buttons", () => {
    expect(resolveActions(bindings, new Set(), pad([0]))).toEqual(new Set(["jump"]));
  });

  it("only counts a stick once it's past the deadzone", () => {
    expect(resolveActions(bindings, new Set(), pad([], [-0.2, 0])).has("left")).toBe(false);
    expect(resolveActions(bindings, new Set(), pad([], [-0.9, 0])).has("left")).toBe(true);
  });

  it("ignores the gamepad when there are no gamepad bindings", () => {
    expect(resolveActions({ keys: {} }, new Set(), pad([0])).size).toBe(0);
  });
});

describe("mergeBindings", () => {
  it("adds keys together and keeps the first gamepad", () => {
    const merged = mergeBindings(bindings, { keys: { jump: ["KeyW"], left: ["KeyA"] } });
    expect(merged.keys.jump).toEqual(["Space", "ArrowUp", "KeyW"]);
    expect(merged.keys.left).toEqual(["ArrowLeft", "KeyA"]);
    expect(merged.pad?.index).toBe(0);
  });
});

describe("InputManager", () => {
  it("tracks held keys and fresh presses", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, bindings);

    target.dispatchEvent(keyEvent("keydown", "Space"));
    input.update();
    expect(input.isDown(1, "jump")).toBe(true);
    expect(input.justPressed(1, "jump")).toBe(true);

    input.update();
    expect(input.isDown(1, "jump")).toBe(true);
    expect(input.justPressed(1, "jump")).toBe(false);

    target.dispatchEvent(keyEvent("keyup", "Space"));
    input.update();
    expect(input.isDown(1, "jump")).toBe(false);
  });

  it("only blocks the browser's default for keys the game uses", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, bindings);
    const space = keyEvent("keydown", "Space");
    const z = keyEvent("keydown", "KeyZ");
    target.dispatchEvent(space);
    target.dispatchEvent(z);
    expect(space.defaultPrevented).toBe(true);
    expect(z.defaultPrevented).toBe(false);
  });

  it("lets go of every key when the window loses focus", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, bindings);
    target.dispatchEvent(keyEvent("keydown", "ArrowLeft"));
    target.dispatchEvent(new Event("blur"));
    input.update();
    expect(input.isDown(1, "left")).toBe(false);
  });

  it("reads the right gamepad and survives it being unplugged", () => {
    let pads: (Gamepad | null)[] = [fakeGamepad([0])];
    const input = new InputManager(new EventTarget(), () => pads);
    input.setBindings(1, bindings);
    input.update();
    expect(input.isDown(1, "jump")).toBe(true);
    pads = [null];
    input.update();
    expect(input.isDown(1, "jump")).toBe(false);
    pads = [];
    expect(() => input.update()).not.toThrow();
  });

  it("survives a browser that throws when reading gamepads", () => {
    const input = new InputManager(new EventTarget(), () => {
      throw new Error("blocked");
    });
    input.setBindings(1, bindings);
    expect(() => input.update()).not.toThrow();
  });

  it("anyJustPressed checks every player", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(1, { keys: { jump: ["Space"] } });
    input.setBindings(2, { keys: { jump: ["KeyW"] } });
    target.dispatchEvent(keyEvent("keydown", "KeyW"));
    input.update();
    expect(input.anyJustPressed("jump")).toBe(true);
  });

  it("clearBindings removes a player", () => {
    const target = new EventTarget();
    const input = new InputManager(target, () => []);
    input.setBindings(2, { keys: { jump: ["KeyW"] } });
    input.clearBindings(2);
    target.dispatchEvent(keyEvent("keydown", "KeyW"));
    input.update();
    expect(input.isDown(2, "jump")).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm install && npm test -w lib/input`
Expected: FAIL with `Failed to resolve import "../src/index"`.

- [ ] **Step 4: Implement**

`lib/input/src/index.ts`:
```ts
/**
 * @web-games/input — keyboard + gamepad input, mapped to per-player actions.
 *
 * Game-agnostic: each game picks its own action names ("jump", "fire", ...)
 * and says which keys / gamepad buttons trigger them.
 */

export interface StickDirection {
  axis: number;
  direction: -1 | 1;
}

export interface PadBindings {
  /** Which gamepad to read (0 = the first one plugged in). */
  index: number;
  /** Standard-layout button numbers per action (0 = A, 9 = Start, 12-15 = D-pad). */
  buttons: Record<string, number[]>;
  /** Stick directions per action, e.g. left: [{ axis: 0, direction: -1 }]. */
  axes?: Record<string, StickDirection[]>;
}

export interface Bindings {
  /** KeyboardEvent.code values per action, e.g. jump: ["Space", "ArrowUp"]. */
  keys: Record<string, string[]>;
  pad?: PadBindings;
}

export interface PadState {
  buttons: boolean[];
  axes: number[];
}

/** How far a stick must be pushed (0 to 1) before it counts. */
export const STICK_DEADZONE = 0.4;

/** Which actions are active right now for one player. Pure, so it's easy to test. */
export function resolveActions(
  bindings: Bindings,
  pressedKeys: ReadonlySet<string>,
  pad: PadState | null,
): Set<string> {
  const active = new Set<string>();
  for (const [action, codes] of Object.entries(bindings.keys)) {
    if (codes.some((code) => pressedKeys.has(code))) active.add(action);
  }
  if (pad && bindings.pad) {
    for (const [action, buttons] of Object.entries(bindings.pad.buttons)) {
      if (buttons.some((b) => pad.buttons[b] === true)) active.add(action);
    }
    for (const [action, dirs] of Object.entries(bindings.pad.axes ?? {})) {
      if (dirs.some(({ axis, direction }) => (pad.axes[axis] ?? 0) * direction > STICK_DEADZONE)) {
        active.add(action);
      }
    }
  }
  return active;
}

/** Combines several bindings: keys are added together, and the first gamepad wins. */
export function mergeBindings(...list: Bindings[]): Bindings {
  const keys: Record<string, string[]> = {};
  for (const b of list) {
    for (const [action, codes] of Object.entries(b.keys)) {
      keys[action] = [...new Set([...(keys[action] ?? []), ...codes])];
    }
  }
  return { keys, pad: list.find((b) => b.pad)?.pad };
}

export type GamepadSource = () => ArrayLike<Gamepad | null>;

const browserGamepads: GamepadSource = () =>
  typeof navigator !== "undefined" && typeof navigator.getGamepads === "function"
    ? navigator.getGamepads()
    : [];

/**
 * Listens to the keyboard, reads gamepads, and answers "is player 1 pressing jump?".
 * Call update() once per frame, before reading.
 */
export class InputManager {
  private readonly pressedKeys = new Set<string>();
  private readonly bindings = new Map<number, Bindings>();
  private current = new Map<number, Set<string>>();
  private previous = new Map<number, Set<string>>();
  private boundCodes = new Set<string>();

  constructor(
    private readonly target: EventTarget,
    private readonly getGamepads: GamepadSource = browserGamepads,
  ) {
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.onBlur);
  }

  setBindings(player: number, bindings: Bindings): void {
    this.bindings.set(player, bindings);
    this.rebuildBoundCodes();
  }

  clearBindings(player: number): void {
    this.bindings.delete(player);
    this.current.delete(player);
    this.previous.delete(player);
    this.rebuildBoundCodes();
  }

  update(): void {
    this.previous = this.current;
    this.current = new Map();
    for (const [player, bindings] of this.bindings) {
      const pad = bindings.pad ? this.readPad(bindings.pad.index) : null;
      this.current.set(player, resolveActions(bindings, this.pressedKeys, pad));
    }
  }

  isDown(player: number, action: string): boolean {
    return this.current.get(player)?.has(action) ?? false;
  }

  justPressed(player: number, action: string): boolean {
    return this.isDown(player, action) && !(this.previous.get(player)?.has(action) ?? false);
  }

  anyJustPressed(action: string): boolean {
    return [...this.bindings.keys()].some((player) => this.justPressed(player, action));
  }

  destroy(): void {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("blur", this.onBlur);
  }

  private readPad(index: number): PadState | null {
    try {
      const pad = this.getGamepads()[index];
      if (!pad) return null;
      return { buttons: Array.from(pad.buttons, (b) => b.pressed), axes: Array.from(pad.axes) };
    } catch {
      return null; // some browsers throw if gamepads are blocked
    }
  }

  private rebuildBoundCodes(): void {
    this.boundCodes = new Set(
      [...this.bindings.values()].flatMap((b) => Object.values(b.keys).flat()),
    );
  }

  private readonly onKeyDown = (event: Event): void => {
    const { code } = event as KeyboardEvent;
    this.pressedKeys.add(code);
    // Stop arrows/space from scrolling the page, but leave other keys alone.
    if (this.boundCodes.has(code)) event.preventDefault();
  };

  private readonly onKeyUp = (event: Event): void => {
    this.pressedKeys.delete((event as KeyboardEvent).code);
  };

  private readonly onBlur = (): void => {
    // The window lost focus, so we'll never hear the key-ups. Let go of everything.
    this.pressedKeys.clear();
  };
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npm test -w lib/input && npm run typecheck -w lib/input`
Expected: 12 tests pass, and tsc prints nothing.

- [ ] **Step 6: Commit**

```bash
git add lib/input package-lock.json
git commit -m "Add @web-games/input: keyboard and gamepad actions per player"
```

---

### Task 3: Settings, validation, progress storage, camera math

**Files:**
- Create: `super-flynn-bros/src/engine/validate.ts`, `super-flynn-bros/src/engine/limits.ts`, `super-flynn-bros/src/settings.ts`, `super-flynn-bros/src/engine/progress.ts`, `super-flynn-bros/src/engine/camera.ts`
- Test: `super-flynn-bros/tests/validate.test.ts`, `super-flynn-bros/tests/progress.test.ts`, `super-flynn-bros/tests/camera.test.ts`

**Interfaces:**
- Produces:
  - `interface Range { min: number; max: number }` and `clampSettings<T extends object>(values: T, limits: Limits<T>, warn?: (m: string) => void): T` (validate.ts)
  - `settingLimits: Record<string, Range>` (limits.ts)
  - `mySettings` (raw) and `settings` (clamped), keys: `gravity, maxFallSpeed, acceleration, deceleration, airControl, jumpCut, hearts, maxHearts, safeTimeMs, knockback, respawnDelayMs, musicVolume, sfxVolume, coyoteTimeMs, jumpBufferMs` (settings.ts)
  - `interface Progress { unlockedLevels: number; muted: boolean }`, `DEFAULT_PROGRESS`, `interface StorageLike`, `loadProgress(storage?)`, `saveProgress(p, storage?)`, `unlockLevel(p, levelNumber): Progress` (progress.ts)
  - `nextScrollX(current, leadX, viewWidth, worldWidth, leadFraction = 0.4): number` (camera.ts)

- [ ] **Step 1: Write the failing tests**

`super-flynn-bros/tests/validate.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { clampSettings } from "../src/engine/validate";
import { settingLimits } from "../src/engine/limits";
import { mySettings } from "../src/settings";

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

`super-flynn-bros/tests/progress.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PROGRESS, loadProgress, saveProgress, unlockLevel, type StorageLike } from "../src/engine/progress";

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const KEY = "super-flynn-bros:progress";

describe("progress", () => {
  it("starts fresh when nothing is saved", () => {
    expect(loadProgress(memoryStorage())).toEqual(DEFAULT_PROGRESS);
  });

  it("remembers what was saved", () => {
    const storage = memoryStorage();
    saveProgress({ unlockedLevels: 3, muted: true }, storage);
    expect(loadProgress(storage)).toEqual({ unlockedLevels: 3, muted: true });
  });

  it("ignores junk data", () => {
    expect(loadProgress(memoryStorage({ [KEY]: "not json" }))).toEqual(DEFAULT_PROGRESS);
    expect(loadProgress(memoryStorage({ [KEY]: '{"unlockedLevels":-3,"muted":"yes"}' }))).toEqual(DEFAULT_PROGRESS);
    expect(loadProgress(memoryStorage({ [KEY]: '{"unlockedLevels":2.5}' }))).toEqual(DEFAULT_PROGRESS);
  });

  it("never throws when storage is blocked or missing", () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadProgress(blocked)).toEqual(DEFAULT_PROGRESS);
    expect(() => saveProgress(DEFAULT_PROGRESS, blocked)).not.toThrow();
    expect(loadProgress(null)).toEqual(DEFAULT_PROGRESS);
    expect(() => saveProgress(DEFAULT_PROGRESS, null)).not.toThrow();
  });

  it("only unlocks forward", () => {
    expect(unlockLevel({ unlockedLevels: 3, muted: false }, 2).unlockedLevels).toBe(3);
    expect(unlockLevel({ unlockedLevels: 1, muted: false }, 2).unlockedLevels).toBe(2);
  });
});
```

`super-flynn-bros/tests/camera.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { nextScrollX } from "../src/engine/camera";

describe("nextScrollX", () => {
  it("stays put until the leader passes the lead line", () => {
    expect(nextScrollX(0, 100, 320, 3200)).toBe(0);
  });

  it("follows the leader forward", () => {
    expect(nextScrollX(0, 400, 320, 3200)).toBe(272);
  });

  it("never scrolls backward", () => {
    expect(nextScrollX(500, 400, 320, 3200)).toBe(500);
  });

  it("stops at the end of the level", () => {
    expect(nextScrollX(0, 5000, 320, 3200)).toBe(2880);
  });

  it("handles a level narrower than the screen", () => {
    expect(nextScrollX(0, 200, 320, 200)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w super-flynn-bros`
Expected: FAIL. Imports of `../src/engine/validate`, `progress`, `camera`, and `../src/settings` can't be resolved.

- [ ] **Step 3: Implement**

`super-flynn-bros/src/engine/validate.ts`:
```ts
export interface Range {
  min: number;
  max: number;
}

export type Limits<T> = { [K in keyof T]?: Range };

/**
 * Returns a copy of `values` with every number that has a limit kept inside
 * that limit. Anything out of range gets fixed, with a friendly message, so a
 * typo in settings.ts can't break the game.
 */
export function clampSettings<T extends object>(
  values: T,
  limits: Limits<T>,
  warn: (message: string) => void = console.warn,
): T {
  const result = { ...values };
  for (const key of Object.keys(limits) as (keyof T)[]) {
    const limit = limits[key];
    if (!limit) continue;
    const value = values[key] as unknown;
    const name = String(key);
    if (typeof value !== "number" || Number.isNaN(value)) {
      warn(`⚠️ ${name} should be a number from ${limit.min} to ${limit.max}. Using ${limit.min} for now.`);
      result[key] = limit.min as T[keyof T];
    } else if (value < limit.min || value > limit.max) {
      const fixed = Math.min(limit.max, Math.max(limit.min, value));
      const tooWhat = value < limit.min ? "small" : "big";
      warn(`⚠️ ${name} = ${value} is too ${tooWhat}! Using ${fixed} instead (try ${limit.min} to ${limit.max}).`);
      result[key] = fixed as T[keyof T];
    }
  }
  return result;
}
```

`super-flynn-bros/src/engine/limits.ts`:
```ts
import type { Range } from "./validate";

/** Safe ranges for everything in settings.ts. Out-of-range values get clamped. */
export const settingLimits: Record<string, Range> = {
  gravity: { min: 400, max: 1500 },
  maxFallSpeed: { min: 300, max: 800 },
  acceleration: { min: 300, max: 2000 },
  deceleration: { min: 200, max: 2000 },
  airControl: { min: 0.3, max: 1 },
  jumpCut: { min: 0.2, max: 1 },
  hearts: { min: 1, max: 10 },
  maxHearts: { min: 1, max: 10 },
  safeTimeMs: { min: 500, max: 4000 },
  knockback: { min: 0, max: 300 },
  respawnDelayMs: { min: 0, max: 5000 },
  musicVolume: { min: 0, max: 1 },
  sfxVolume: { min: 0, max: 1 },
  coyoteTimeMs: { min: 0, max: 300 },
  jumpBufferMs: { min: 0, max: 300 },
};
```

`super-flynn-bros/src/settings.ts`:
```ts
// 🛠️ SUPER FLYNN BROS SETTINGS
//
// These numbers control how the game feels. Change one, save the file, and
// the game reloads with your change. Each one says what numbers to try.
//
// Picked a number that's way too big or too small? No problem: the game
// fixes it and tells you in the browser console (press F12 to see it).
//
// Want to change how Colin or Ryan run and jump? That's in heroes.ts.

import { clampSettings } from "./engine/validate";
import { settingLimits } from "./engine/limits";

export const mySettings = {
  // How strong gravity is. Lower = floaty moon jumps!
  // Try 400 (moon) to 1500 (super heavy).
  gravity: 900,

  // The fastest you can fall. Try 300 to 800.
  maxFallSpeed: 500,

  // How quickly the heroes speed up when you press left or right.
  // Try 300 (slow start) to 2000 (instant).
  acceleration: 900,

  // How quickly the heroes stop when you let go.
  // Low numbers = slippery, like walking on ice! Try 200 to 2000.
  deceleration: 1100,

  // How much you can steer while you're in the air (1 = same as on the ground).
  // Try 0.3 to 1.
  airControl: 0.8,

  // Letting go of jump early makes a smaller hop. 1 = no small hops.
  // Try 0.2 to 1.
  jumpCut: 0.45,

  // Hearts each hero starts a level with. Try 1 (really hard!) to 10 (easy).
  hearts: 3,

  // The most hearts you can have. Burgers can't go past this. Try 1 to 10.
  maxHearts: 3,

  // After a bump, how long you blink and can't get hurt again.
  // In milliseconds: 1000 = 1 second. Try 500 to 4000.
  safeTimeMs: 1500,

  // How hard a bump pushes you back. Try 0 to 300.
  knockback: 140,

  // Co-op: how long until a brother who ran out of hearts pops back in.
  // In milliseconds. Try 0 to 5000.
  respawnDelayMs: 2000,

  // Music volume: 0 = off, 1 = loudest.
  musicVolume: 0.5,

  // Sound effects volume: 0 = off, 1 = loudest.
  sfxVolume: 0.7,

  // 🛠️ TRY THIS: forgiving jumps! For this many milliseconds after you run
  // off a ledge, you can still jump. Set it to 0 and see how much harder it gets.
  coyoteTimeMs: 80,

  // If you press jump a little before you land, the game remembers it for
  // this many milliseconds and jumps as soon as you touch the ground.
  jumpBufferMs: 100,
};

export const settings = clampSettings(mySettings, settingLimits);
```

`super-flynn-bros/src/engine/progress.ts`:
```ts
/** What we remember between visits. It lives in this browser's localStorage. */
export interface Progress {
  /** How many levels can be picked on the title screen (1 = just the first). */
  unlockedLevels: number;
  muted: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_PROGRESS: Progress = { unlockedLevels: 1, muted: false };
const STORAGE_KEY = "super-flynn-bros:progress";

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null; // no window (tests) or storage blocked
  }
}

export function loadProgress(storage: StorageLike | null = browserStorage()): Progress {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const data = JSON.parse(raw) as Partial<Progress>;
    const unlocked = data.unlockedLevels;
    return {
      unlockedLevels: typeof unlocked === "number" && Number.isInteger(unlocked) && unlocked >= 1 ? unlocked : 1,
      muted: data.muted === true,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: Progress, storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private window or blocked storage: progress just won't be remembered.
  }
}

/** Unlocks up to `levelNumber` (1-based). Never locks a level that was already open. */
export function unlockLevel(progress: Progress, levelNumber: number): Progress {
  return { ...progress, unlockedLevels: Math.max(progress.unlockedLevels, levelNumber) };
}
```

`super-flynn-bros/src/engine/camera.ts`:
```ts
/**
 * Where the camera should scroll to next. Like the original Mario, it only
 * ever moves forward: it follows the leader once they pass `leadFraction` of
 * the screen and stops at the end of the level.
 */
export function nextScrollX(
  current: number,
  leadX: number,
  viewWidth: number,
  worldWidth: number,
  leadFraction = 0.4,
): number {
  const target = leadX - viewWidth * leadFraction;
  const maxScroll = Math.max(0, worldWidth - viewWidth);
  return Math.min(maxScroll, Math.max(current, target, 0));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w super-flynn-bros && npm run typecheck -w super-flynn-bros`
Expected: all tests in `validate`, `progress`, and `camera` pass, and tsc is clean.

- [ ] **Step 5: Commit**

```bash
git add super-flynn-bros/src super-flynn-bros/tests
git commit -m "Add kid-editable settings with clamping, saved progress, and camera math"
```

---

### Task 4: Pixel art from text grids

**Files:**
- Create: `super-flynn-bros/src/engine/pixelArt.ts`
- Test: `super-flynn-bros/tests/pixelArt.test.ts`

**Interfaces:**
- Produces:
  - `type Palette = Record<string, string>`
  - `interface ParsedGrid { width: number; height: number; pixels: (string | null)[] }`
  - `interface ParsedSheet { width; height; frames: ParsedGrid[]; warnings: string[] }`
  - `parseFrames(frames: readonly (readonly string[])[], colors: Palette, name: string): ParsedSheet` (pure)
  - `stripFrameCount(sourceWidth, sourceHeight, artWidth, artHeight, count): number` (pure)
  - `addTextureFromFrames(scene, key, frames: ParsedGrid[], width, height): void` (frame `i` named `i`)
  - `makeSpriteSheet(scene, key, frames, colors, warn?): { width: number; height: number }`. If a texture `key` already exists (a PNG override), it slices that instead of drawing.
  - Constants `TRANSPARENT` (`.` and space) and `UNKNOWN_COLOR` (`#ff00ff`)

- [ ] **Step 1: Write the failing tests**

`super-flynn-bros/tests/pixelArt.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseFrames, stripFrameCount, UNKNOWN_COLOR } from "../src/engine/pixelArt";

const colors = { R: "#ff0000", B: "#0000ff" };

describe("parseFrames", () => {
  it("turns characters into colors and dots into see-through pixels", () => {
    const sheet = parseFrames([["R.", " B"]], colors, "test");
    expect(sheet.width).toBe(2);
    expect(sheet.height).toBe(2);
    expect(sheet.frames[0].pixels).toEqual(["#ff0000", null, null, "#0000ff"]);
    expect(sheet.warnings).toEqual([]);
  });

  it("shows pink for characters with no color, and says which ones", () => {
    const sheet = parseFrames([["RZ"]], colors, "dog");
    expect(sheet.frames[0].pixels).toEqual(["#ff0000", UNKNOWN_COLOR]);
    expect(sheet.warnings).toHaveLength(1);
    expect(sheet.warnings[0]).toContain('dog: there\'s no color for "Z"');
  });

  it("fills short rows with see-through pixels and warns", () => {
    const sheet = parseFrames([["RRR", "R"]], colors, "wall");
    expect(sheet.frames[0].pixels).toEqual(["#ff0000", "#ff0000", "#ff0000", "#ff0000", null, null]);
    expect(sheet.warnings[0]).toContain("row 2 is 1 pixels wide");
  });

  it("gives every frame the same size, padding short frames at the top", () => {
    const sheet = parseFrames([["R", "R"], ["B"]], colors, "hero");
    expect(sheet.height).toBe(2);
    expect(sheet.frames[1].pixels).toEqual([null, "#0000ff"]);
  });
});

describe("stripFrameCount", () => {
  it("spots a strip of frames", () => {
    expect(stripFrameCount(64, 32, 16, 32, 4)).toBe(4);
  });

  it("spots a single picture", () => {
    expect(stripFrameCount(100, 200, 16, 32, 4)).toBe(1);
  });

  it("is always 1 for single-frame art", () => {
    expect(stripFrameCount(64, 16, 16, 16, 1)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w super-flynn-bros -- pixelArt`
Expected: FAIL, `Failed to resolve import "../src/engine/pixelArt"`.

- [ ] **Step 3: Implement**

`super-flynn-bros/src/engine/pixelArt.ts` (imports only Phaser *types*, so the tests run in Node):
```ts
import type Phaser from "phaser";

/** Maps one character to one color, e.g. { H: "#f6d860" } for blonde hair. */
export type Palette = Record<string, string>;

export interface ParsedGrid {
  width: number;
  height: number;
  /** Row by row, left to right. null = see-through. */
  pixels: (string | null)[];
}

export interface ParsedSheet {
  width: number;
  height: number;
  frames: ParsedGrid[];
  warnings: string[];
}

/** Characters that mean "see-through". */
export const TRANSPARENT = new Set([".", " "]);

/** Color for characters missing from the palette: bright pink, so mistakes are easy to spot. */
export const UNKNOWN_COLOR = "#ff00ff";

/**
 * Turns frames of text art into pixels. Every frame gets the same size (the
 * biggest one). Short frames get see-through rows added at the TOP, so feet
 * stay on the ground.
 */
export function parseFrames(
  frames: readonly (readonly string[])[],
  colors: Palette,
  name: string,
): ParsedSheet {
  const warnings: string[] = [];
  const width = Math.max(1, ...frames.flatMap((frame) => frame.map((row) => row.length)));
  const height = Math.max(1, ...frames.map((frame) => frame.length));
  const unknown = new Set<string>();

  const parsed = frames.map((rows, frameIndex) => {
    const label = frames.length > 1 ? `${name} (frame ${frameIndex + 1})` : name;
    rows.forEach((row, i) => {
      if (row.length !== width) {
        warnings.push(
          `${label}: row ${i + 1} is ${row.length} pixels wide, but the widest row is ${width}. Filling the gap with see-through pixels.`,
        );
      }
    });
    const padTop = height - rows.length;
    const pixels: (string | null)[] = [];
    for (let y = 0; y < height; y++) {
      const row = rows[y - padTop] ?? "";
      for (let x = 0; x < width; x++) {
        const ch = row[x] ?? ".";
        if (TRANSPARENT.has(ch)) {
          pixels.push(null);
        } else if (colors[ch] === undefined) {
          unknown.add(ch);
          pixels.push(UNKNOWN_COLOR);
        } else {
          pixels.push(colors[ch]);
        }
      }
    }
    return { width, height, pixels };
  });

  if (unknown.size > 0) {
    const list = [...unknown].map((ch) => `"${ch}"`).join(", ");
    warnings.push(`${name}: there's no color for ${list}. Add it to the colors list! Showing pink for now.`);
  }
  return { width, height, frames: parsed, warnings };
}

/**
 * A kid's custom PNG can be a strip of frames side by side, or one picture
 * used for every frame. Returns how many frames the picture holds (count or 1),
 * picking whichever shape is closer.
 */
export function stripFrameCount(
  sourceWidth: number,
  sourceHeight: number,
  artWidth: number,
  artHeight: number,
  count: number,
): number {
  if (count <= 1) return 1;
  const aspect = sourceWidth / sourceHeight;
  const single = artWidth / artHeight;
  const strip = (artWidth * count) / artHeight;
  return Math.abs(Math.log(aspect / strip)) < Math.abs(Math.log(aspect / single)) ? count : 1;
}

/** Draws parsed frames side by side into a new texture. Frame i is named i. */
export function addTextureFromFrames(
  scene: Phaser.Scene,
  key: string,
  frames: ParsedGrid[],
  width: number,
  height: number,
): void {
  const texture = scene.textures.createCanvas(key, width * frames.length, height);
  if (!texture) return;
  const ctx = texture.getContext();
  frames.forEach((frame, i) => {
    frame.pixels.forEach((color, p) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(i * width + (p % width), Math.floor(p / width), 1, 1);
    });
    texture.add(i, 0, i * width, 0, width, height);
  });
  texture.refresh();
}

/** Adds frames 0..count-1 to a loaded PNG override. */
function usePngOverride(scene: Phaser.Scene, key: string, count: number, artWidth: number, artHeight: number): void {
  const texture = scene.textures.get(key);
  if (texture.has("0")) return;
  const source = texture.getSourceImage() as HTMLImageElement;
  const frames = stripFrameCount(source.width, source.height, artWidth, artHeight, count);
  const frameWidth = Math.floor(source.width / frames);
  for (let i = 0; i < count; i++) {
    const slot = frames === 1 ? 0 : i;
    texture.add(i, 0, slot * frameWidth, 0, frameWidth, source.height);
  }
}

/**
 * Builds a sprite sheet from text art. If a PNG with the same key was already
 * loaded (a kid's custom picture in public/assets/), that wins instead.
 * Returns the text art's size, which sprites use as their on-screen size.
 */
export function makeSpriteSheet(
  scene: Phaser.Scene,
  key: string,
  frames: readonly (readonly string[])[],
  colors: Palette,
  warn: (message: string) => void = console.warn,
): { width: number; height: number } {
  const sheet = parseFrames(frames, colors, key);
  sheet.warnings.forEach((message) => warn(message));
  if (scene.textures.exists(key)) {
    usePngOverride(scene, key, frames.length, sheet.width, sheet.height);
  } else {
    addTextureFromFrames(scene, key, sheet.frames, sheet.width, sheet.height);
  }
  return { width: sheet.width, height: sheet.height };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w super-flynn-bros -- pixelArt && npm run typecheck -w super-flynn-bros`
Expected: 7 tests pass, and tsc is clean.

- [ ] **Step 5: Commit**

```bash
git add super-flynn-bros/src/engine/pixelArt.ts super-flynn-bros/tests/pixelArt.test.ts
git commit -m "Add text-grid pixel art parser and sprite sheet builder"
```

---

### Task 5: Optional-file discovery and the audio wrapper

**Files:**
- Create: `super-flynn-bros/src/engine/assets.ts`, `super-flynn-bros/src/engine/audio.ts`, `super-flynn-bros/src/sounds.ts`
- Test: `super-flynn-bros/tests/assets.test.ts`, `super-flynn-bros/tests/audio.test.ts`

**Interfaces:**
- Produces:
  - `interface AssetCandidate { key: string; urls: string[] }`, `type UrlExists = (url: string) => Promise<boolean>`
  - `findAssets(candidates, exists): Promise<Map<string, string>>` (key → first URL that exists)
  - `makeHttpExists(fetchFn?): UrlExists` (a HEAD request: true only if the response is OK and isn't HTML)
  - `interface SoundDef { file: string; volume: number; loop?: boolean }`, `interface AudioBackend { play(cacheKey, { volume, loop }): PlayingSound | null }`, `interface PlayingSound { stop(); setVolume(v) }`
  - `sfxCacheKey(k) = "sfx:" + k`, `musicCacheKey(k) = "music:" + k`, `audioCandidates(sfx, music): AssetCandidate[]` (`.mp3` first, then `.ogg`)
  - `class GameAudio { constructor(backend, options: GameAudioOptions); muted: boolean; reportMissing(): string | null; playSfx(key); playMusic(key); stopMusic(); setMuted(m); toggleMute(): boolean }`. It never throws.
  - `soundEffects`, `musicTracks`, `type SoundKey`, `type MusicKey` (sounds.ts)

- [ ] **Step 1: Write the failing tests**

`super-flynn-bros/tests/assets.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { findAssets, makeHttpExists } from "../src/engine/assets";

describe("findAssets", () => {
  it("picks the first address that exists and leaves out missing files", async () => {
    const files = new Set(["assets/sounds/jump.ogg", "assets/sounds/donut.mp3"]);
    const found = await findAssets(
      [
        { key: "jump", urls: ["assets/sounds/jump.mp3", "assets/sounds/jump.ogg"] },
        { key: "donut", urls: ["assets/sounds/donut.mp3", "assets/sounds/donut.ogg"] },
        { key: "bark", urls: ["assets/sounds/bark.mp3"] },
      ],
      async (url) => files.has(url),
    );
    expect(found).toEqual(
      new Map([
        ["jump", "assets/sounds/jump.ogg"],
        ["donut", "assets/sounds/donut.mp3"],
      ]),
    );
  });

  it("treats a check that blows up as missing", async () => {
    const found = await findAssets([{ key: "jump", urls: ["x.mp3"] }], async () => {
      throw new Error("offline");
    });
    expect(found.size).toBe(0);
  });
});

describe("makeHttpExists", () => {
  const respond = (status: number, type: string) => async () =>
    new Response(null, { status, headers: { "content-type": type } });

  it("says yes to a real file", async () => {
    expect(await makeHttpExists(respond(200, "audio/mpeg"))("jump.mp3")).toBe(true);
  });

  it("says no to a 404", async () => {
    expect(await makeHttpExists(respond(404, "text/plain"))("jump.mp3")).toBe(false);
  });

  it("says no when the server answers with a web page instead of the file", async () => {
    expect(await makeHttpExists(respond(200, "text/html; charset=utf-8"))("jump.mp3")).toBe(false);
  });

  it("says no when the request fails", async () => {
    const failing = async () => {
      throw new Error("offline");
    };
    expect(await makeHttpExists(failing)("jump.mp3")).toBe(false);
  });
});
```

`super-flynn-bros/tests/audio.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { audioCandidates, GameAudio, type AudioBackend, type GameAudioOptions } from "../src/engine/audio";

interface Played {
  key: string;
  volume: number;
  loop: boolean;
  stopped: boolean;
  volumeNow: number;
}

function fakeBackend() {
  const played: Played[] = [];
  const backend: AudioBackend = {
    play(key, { volume, loop }) {
      const entry: Played = { key, volume, loop, stopped: false, volumeNow: volume };
      played.push(entry);
      return {
        stop: () => {
          entry.stopped = true;
        },
        setVolume: (v) => {
          entry.volumeNow = v;
        },
      };
    },
  };
  return { backend, played };
}

const sfx = { jump: { file: "jump", volume: 0.5 }, donut: { file: "donut", volume: 1 } };
const music = { title: { file: "title", volume: 0.5 }, level1: { file: "level1", volume: 1 } };

function makeAudio(available: string[], extra: Partial<GameAudioOptions> = {}) {
  const fake = fakeBackend();
  const audio = new GameAudio(fake.backend, {
    sfx,
    music,
    available: new Set(available),
    sfxVolume: 0.8,
    musicVolume: 0.5,
    muted: false,
    fadeMs: 0,
    info: () => {},
    ...extra,
  });
  return { audio, ...fake };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("GameAudio sound effects", () => {
  it("plays a loaded sound at its volume times the effects volume", () => {
    const { audio, played } = makeAudio(["sfx:jump"]);
    audio.playSfx("jump");
    expect(played).toEqual([{ key: "sfx:jump", volume: 0.4, loop: false, stopped: false, volumeNow: 0.4 }]);
  });

  it("quietly skips a sound whose file is missing", () => {
    const { audio, played } = makeAudio([]);
    expect(() => audio.playSfx("jump")).not.toThrow();
    expect(() => audio.playSfx("not-a-sound")).not.toThrow();
    expect(played).toEqual([]);
  });

  it("plays nothing while muted", () => {
    const { audio, played } = makeAudio(["sfx:jump"], { muted: true });
    audio.playSfx("jump");
    expect(played).toEqual([]);
  });

  it("doesn't crash the game if the sound system throws", () => {
    const audio = new GameAudio(
      {
        play: () => {
          throw new Error("audio broke");
        },
      },
      { sfx, music, available: new Set(["sfx:jump", "music:title"]), sfxVolume: 1, musicVolume: 1, muted: false, fadeMs: 0 },
    );
    expect(() => audio.playSfx("jump")).not.toThrow();
    expect(() => audio.playMusic("title")).not.toThrow();
  });
});

describe("GameAudio music", () => {
  it("loops music and doesn't restart a track that's already playing", () => {
    const { audio, played } = makeAudio(["music:title"]);
    audio.playMusic("title");
    audio.playMusic("title");
    expect(played).toHaveLength(1);
    expect(played[0]).toMatchObject({ key: "music:title", loop: true, volumeNow: 0.25 });
  });

  it("stops the old track when switching", () => {
    const { audio, played } = makeAudio(["music:title", "music:level1"]);
    audio.playMusic("title");
    audio.playMusic("level1");
    expect(played[0].stopped).toBe(true);
    expect(played[1]).toMatchObject({ key: "music:level1", stopped: false });
  });

  it("stops music when muted and brings the same track back when unmuted", () => {
    const { audio, played } = makeAudio(["music:title"]);
    audio.playMusic("title");
    expect(audio.toggleMute()).toBe(true);
    expect(played[0].stopped).toBe(true);
    expect(audio.toggleMute()).toBe(false);
    expect(played).toHaveLength(2);
    expect(played[1]).toMatchObject({ key: "music:title", stopped: false });
  });

  it("skips a missing track but still plays the next one", () => {
    const { audio, played } = makeAudio(["music:level1"]);
    audio.playMusic("title");
    audio.playMusic("level1");
    expect(played.map((p) => p.key)).toEqual(["music:level1"]);
  });

  it("fades music in", () => {
    vi.useFakeTimers();
    const { audio, played } = makeAudio(["music:level1"], { fadeMs: 500 });
    audio.playMusic("level1");
    expect(played[0].volumeNow).toBe(0);
    vi.advanceTimersByTime(500);
    expect(played[0].volumeNow).toBeCloseTo(0.5);
  });
});

describe("GameAudio.reportMissing", () => {
  it("lists only the missing files, once", () => {
    const info = vi.fn();
    const { audio } = makeAudio(["sfx:jump", "music:title"], { info });
    const message = audio.reportMissing();
    expect(message).toContain("No sound for: donut.");
    expect(message).toContain("No music for: level1.");
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("says nothing when every file is there", () => {
    const info = vi.fn();
    const { audio } = makeAudio(["sfx:jump", "sfx:donut", "music:title", "music:level1"], { info });
    expect(audio.reportMissing()).toBeNull();
    expect(info).not.toHaveBeenCalled();
  });
});

describe("audioCandidates", () => {
  it("looks for .mp3 first, then .ogg", () => {
    expect(audioCandidates({ jump: { file: "jump", volume: 1 } }, { title: { file: "title", volume: 1 } })).toEqual([
      { key: "sfx:jump", urls: ["assets/sounds/jump.mp3", "assets/sounds/jump.ogg"] },
      { key: "music:title", urls: ["assets/music/title.mp3", "assets/music/title.ogg"] },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w super-flynn-bros -- assets audio`
Expected: FAIL with unresolved imports `../src/engine/assets` and `../src/engine/audio`.

- [ ] **Step 3: Implement**

`super-flynn-bros/src/engine/assets.ts`:
```ts
/** One thing we might load, and the places it could be (first match wins). */
export interface AssetCandidate {
  key: string;
  urls: string[];
}

export type UrlExists = (url: string) => Promise<boolean>;

/**
 * Checks which optional files (custom pictures, sounds, music) actually exist,
 * so the game only loads those. Missing files are simply left out.
 */
export async function findAssets(candidates: AssetCandidate[], exists: UrlExists): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  await Promise.all(
    candidates.map(async ({ key, urls }) => {
      for (const url of urls) {
        let ok = false;
        try {
          ok = await exists(url);
        } catch {
          ok = false;
        }
        if (ok) {
          found.set(key, url);
          return;
        }
      }
    }),
  );
  return found;
}

/** Asks the web server whether a file is there, without downloading it. */
export function makeHttpExists(fetchFn: typeof fetch = (input, init) => fetch(input, init)): UrlExists {
  return async (url) => {
    try {
      const response = await fetchFn(url, { method: "HEAD" });
      // A server that answers every address with the web page would look like
      // a match. A web page is never a sound or a picture, so skip it.
      const type = response.headers.get("content-type") ?? "";
      return response.ok && !type.includes("text/html");
    } catch {
      return false;
    }
  };
}
```

`super-flynn-bros/src/engine/audio.ts`:
```ts
import type { AssetCandidate } from "./assets";

export interface SoundDef {
  /** File name without .mp3/.ogg. */
  file: string;
  /** 0 to 1. Multiplied by the music or sound effects volume in settings.ts. */
  volume: number;
  /** Music only: keep repeating? (default: yes) */
  loop?: boolean;
}

export interface PlayingSound {
  stop(): void;
  setVolume(volume: number): void;
}

/** The small piece of a sound system that GameAudio needs. Phaser provides it in the game; tests use a fake. */
export interface AudioBackend {
  play(cacheKey: string, options: { volume: number; loop: boolean }): PlayingSound | null;
}

export interface GameAudioOptions {
  sfx: Record<string, SoundDef>;
  music: Record<string, SoundDef>;
  /** Cache keys of the files that actually loaded. */
  available: ReadonlySet<string>;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  /** How long music fades in and out, in milliseconds. */
  fadeMs?: number;
  info?: (message: string) => void;
}

export const sfxCacheKey = (key: string): string => `sfx:${key}`;
export const musicCacheKey = (key: string): string => `music:${key}`;

/** Every sound and music file the game could use: .mp3 first, then .ogg. */
export function audioCandidates(sfx: Record<string, SoundDef>, music: Record<string, SoundDef>): AssetCandidate[] {
  const list = (defs: Record<string, SoundDef>, folder: string, cacheKey: (key: string) => string) =>
    Object.entries(defs).map(([key, def]) => ({
      key: cacheKey(key),
      urls: [`assets/${folder}/${def.file}.mp3`, `assets/${folder}/${def.file}.ogg`],
    }));
  return [...list(sfx, "sounds", sfxCacheKey), ...list(music, "music", musicCacheKey)];
}

/**
 * Plays sound effects and music. Anything that isn't loaded (because the file
 * hasn't been added yet) is quietly skipped. This class never throws.
 */
export class GameAudio {
  private current: { key: string; sound: PlayingSound; volume: number } | null = null;
  private wantedMusic: string | null = null;
  private isMuted: boolean;

  constructor(
    private readonly backend: AudioBackend,
    private readonly options: GameAudioOptions,
  ) {
    this.isMuted = options.muted;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  /** Logs which files haven't been added yet. Returns the message, or null if nothing is missing. */
  reportMissing(): string | null {
    const missing = (defs: Record<string, SoundDef>, cacheKey: (key: string) => string) =>
      Object.keys(defs).filter((key) => !this.options.available.has(cacheKey(key)));
    const sfx = missing(this.options.sfx, sfxCacheKey);
    const music = missing(this.options.music, musicCacheKey);
    if (sfx.length === 0 && music.length === 0) return null;
    const parts: string[] = [];
    if (sfx.length) parts.push(`No sound for: ${sfx.join(", ")}. Add files to public/assets/sounds/ to hear them!`);
    if (music.length) parts.push(`No music for: ${music.join(", ")}. Add files to public/assets/music/ to hear them!`);
    const message = parts.join("\n");
    (this.options.info ?? console.info)(message);
    return message;
  }

  playSfx(key: string): void {
    const def = this.options.sfx[key];
    const cacheKey = sfxCacheKey(key);
    if (this.isMuted || !def || !this.options.available.has(cacheKey)) return;
    this.safely(() => this.backend.play(cacheKey, { volume: def.volume * this.options.sfxVolume, loop: false }));
  }

  playMusic(key: string): void {
    if (this.wantedMusic === key) return;
    this.wantedMusic = key;
    this.fadeOutCurrent();
    if (!this.isMuted) this.startWanted();
  }

  stopMusic(): void {
    this.wantedMusic = null;
    this.fadeOutCurrent();
  }

  setMuted(muted: boolean): void {
    if (muted === this.isMuted) return;
    this.isMuted = muted;
    if (muted) this.fadeOutCurrent(0);
    else this.startWanted();
  }

  toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private startWanted(): void {
    const key = this.wantedMusic;
    if (!key) return;
    const def = this.options.music[key];
    const cacheKey = musicCacheKey(key);
    if (!def || !this.options.available.has(cacheKey)) return;
    const volume = def.volume * this.options.musicVolume;
    const fadeMs = this.options.fadeMs ?? 500;
    const sound = this.safely(() =>
      this.backend.play(cacheKey, { volume: fadeMs > 0 ? 0 : volume, loop: def.loop ?? true }),
    );
    if (!sound) return;
    this.current = { key, sound, volume };
    this.fade(sound, 0, volume, fadeMs);
  }

  private fadeOutCurrent(ms = this.options.fadeMs ?? 500): void {
    const old = this.current;
    this.current = null;
    if (!old) return;
    this.fade(old.sound, old.volume, 0, ms, () => this.safely(() => old.sound.stop()));
  }

  private fade(sound: PlayingSound, from: number, to: number, ms: number, done?: () => void): void {
    if (ms <= 0) {
      this.safely(() => sound.setVolume(to));
      done?.();
      return;
    }
    const steps = Math.max(1, Math.round(ms / 50));
    let step = 0;
    const timer = setInterval(() => {
      step++;
      this.safely(() => sound.setVolume(from + (to - from) * (step / steps)));
      if (step >= steps) {
        clearInterval(timer);
        done?.();
      }
    }, ms / steps);
  }

  private safely<T>(fn: () => T): T | null {
    try {
      return fn();
    } catch {
      return null;
    }
  }
}
```

`super-flynn-bros/src/sounds.ts`:
```ts
// 🛠️ SOUNDS & MUSIC
//
// The game looks for these files. If one isn't there yet, the game just stays
// quiet for that sound. Nothing breaks.
//
//   Sound effects go in:  public/assets/sounds/
//   Music goes in:        public/assets/music/
//
// Each file can be .mp3 or .ogg. Name it after the "file" below, e.g.
// jump.mp3 or level1.ogg.
//
// 🛠️ TRY THIS: record your own jump sound! Say "boing" into a phone or
// computer, save it as jump.mp3, put it in public/assets/sounds/, and play.
//
// "volume" goes from 0 (silent) to 1 (loudest).

import type { SoundDef } from "./engine/audio";

export const soundEffects = {
  jump: { file: "jump", volume: 0.6 },
  land: { file: "land", volume: 0.3 },
  donut: { file: "donut", volume: 0.5 },
  burger: { file: "burger", volume: 0.7 },
  hurt: { file: "hurt", volume: 0.7 },
  fall: { file: "fall", volume: 0.7 },
  respawn: { file: "respawn", volume: 0.6 },
  levelRestart: { file: "level-restart", volume: 0.7 },
  goal: { file: "goal", volume: 0.8 },
  menuMove: { file: "menu-move", volume: 0.4 },
  menuSelect: { file: "menu-select", volume: 0.6 },
  pause: { file: "pause", volume: 0.5 },
  bark: { file: "bark", volume: 0.6 },
} satisfies Record<string, SoundDef>;

export const musicTracks = {
  title: { file: "title", volume: 0.5 },
  level1: { file: "level1", volume: 0.5 },
  level2: { file: "level2", volume: 0.5 },
  level3: { file: "level3", volume: 0.5 },
  level4: { file: "level4", volume: 0.5 },
  levelComplete: { file: "level-complete", volume: 0.6, loop: false },
  ending: { file: "ending", volume: 0.5 },
} satisfies Record<string, SoundDef>;

export type SoundKey = keyof typeof soundEffects;
export type MusicKey = keyof typeof musicTracks;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w super-flynn-bros -- assets audio && npm run typecheck -w super-flynn-bros`
Expected: 18 tests pass, and tsc is clean.

- [ ] **Step 5: Commit**

```bash
git add super-flynn-bros/src super-flynn-bros/tests
git commit -m "Add optional asset discovery and a never-throwing audio wrapper"
```

---

### Task 6: Game data: types, heroes, hazards, items, tiles

**Files:**
- Create: `super-flynn-bros/src/engine/types.ts`, `super-flynn-bros/src/heroes.ts`, `super-flynn-bros/src/hazards.ts`, `super-flynn-bros/src/items.ts`, `super-flynn-bros/src/tiles.ts`
- Create (needed by `types.ts`; Task 8 fills in the real themes): `super-flynn-bros/src/levels/themes.ts`
- Test: `super-flynn-bros/tests/data.test.ts` (Task 7 creates `engine/catalog.ts` and `engine/levelLoader.ts`, which this test needs. The test is written here and run at the end of Task 7.)

**Interfaces:**
- Consumes: `Palette` (Task 4), `SoundKey`/`MusicKey` (Task 5).
- Produces (types.ts): `Size`, `HeroDef`, `HazardBehavior`, `HazardDef`, `ItemDef`, `TileDef`, `LevelDef`, with the fields shown below.
- Produces (data): `colin`, `ryan`, `heroes = { colin, ryan }`; `hazards: HazardDef[]` (keys `dog D`, `chaseDog H`, `neighbor N`, `skateboarder K`, `sprinkler S`, `baseball L`, `mower M`); `items: ItemDef[]` (`donut o`, `burger b`) and `heartArt { colors, frames: [full, empty] }`; `tiles: TileDef[]` (`sidewalk #`, `brick =`, `trashBin B`, `car c`, `fence F`) and `goalArt { colors, art }` (40×48).
- Produces (themes.ts): `interface Theme`, `themes` (`morning`, `midday`, `afternoon`, `sunset`), `type ThemeName`.

- [ ] **Step 1: Create the types**

`super-flynn-bros/src/engine/types.ts`:
```ts
import type { Palette } from "./pixelArt";
import type { ThemeName } from "../levels/themes";
import type { MusicKey, SoundKey } from "../sounds";

export interface Size {
  width: number;
  height: number;
}

export interface HeroDef {
  key: string;
  name: string;
  colors: Palette;
  frames: { idle: string[]; walk1: string[]; walk2: string[]; jump: string[] };
  /** Top running speed (pixels per second). */
  runSpeed: number;
  /** How hard a jump pushes up. Bigger = higher jumps. */
  jumpPower: number;
  /** The part of the hero that bumps into things. */
  hitbox: Size;
}

export type HazardBehavior = "patrol" | "slowWalk" | "rollAcross" | "bounce" | "chase" | "toggle";

export interface HazardDef {
  key: string;
  name: string;
  /** The letter that places this hazard in a level map. */
  mapChar: string;
  colors: Palette;
  /** Animation frames. For "toggle", frame 1 is "off" and frame 2 is "on". */
  frames: string[][];
  /** Milliseconds per animation frame. */
  frameMs: number;
  behavior: HazardBehavior;
  speed?: number;
  /** -1 = starts moving left, 1 = right. */
  direction?: -1 | 1;
  bounceHeight?: number;
  range?: number;
  onMs?: number;
  offMs?: number;
  hitbox?: Size;
}

export interface ItemDef {
  key: string;
  name: string;
  mapChar: string;
  colors: Palette;
  frames: string[][];
  score: number;
  hearts: number;
  sound: SoundKey;
}

export interface TileDef {
  key: string;
  name: string;
  mapChar: string;
  /** Can heroes stand on it and bump into it? */
  solid: boolean;
  colors: Palette;
  art: string[];
  /** Used when the same tile is right above (e.g. dirt under the sidewalk). */
  under?: string[];
  /** Used on the left end of a row of this tile. */
  left?: string[];
  /** Used on the right end of a row of this tile. */
  right?: string[];
}

export interface LevelDef {
  name: string;
  /** Shown on the goal sign. */
  goalLabel: string;
  theme: ThemeName;
  /** Which music track plays (from sounds.ts). Defaults to level1, level2, ... */
  music?: MusicKey;
  map: string[];
}
```

- [ ] **Step 2: Create the themes (types.ts imports `ThemeName` from it)**

`super-flynn-bros/src/levels/themes.ts`:
```ts
// 🛠️ THEMES: the colors and scenery behind each level
//
// A level picks a theme by name (theme: "morning"). The background is drawn
// by the game from these colors, in layers that scroll at different speeds:
// sky, then mountains (the Santa Monica Mountains!), then buildings and palm
// trees, then hedges.
//
// scenery can be "houses" (ranch houses), "shops" (a strip mall), or "park".
//
// 🛠️ TRY THIS: make a night theme! Copy "sunset", call it "night", make the
// sky dark blue, and set a level's theme to "night".

export interface Theme {
  skyTop: string;
  skyBottom: string;
  sun: { x: number; y: number; radius: number; color: string };
  mountainsFar: string;
  mountains: string;
  scenery: "houses" | "shops" | "park";
  buildingColors: string[];
  roof: string;
  trim: string;
  palmTrunk: string;
  leaves: string;
  hedge: string;
  hedgeDark: string;
}

export const themes = {
  morning: {
    skyTop: "#6cc4ff",
    skyBottom: "#d4f1ff",
    sun: { x: 250, y: 28, radius: 12, color: "#fff4b0" },
    mountainsFar: "#b3c6bd",
    mountains: "#8fa89a",
    scenery: "houses",
    buildingColors: ["#f2e3c6", "#e8d0b0", "#dfe8e0", "#f6efe0"],
    roof: "#9a5a3a",
    trim: "#ffffff",
    palmTrunk: "#8a6a4a",
    leaves: "#3f8f3a",
    hedge: "#3f8f3a",
    hedgeDark: "#2e6e2a",
  },
  midday: {
    skyTop: "#4fb0f0",
    skyBottom: "#e6f4ff",
    sun: { x: 160, y: 16, radius: 10, color: "#ffffe0" },
    mountainsFar: "#c2cbc0",
    mountains: "#a3b39f",
    scenery: "shops",
    buildingColors: ["#e9d8b8", "#d8c0a0", "#f0e6d2", "#cfd8dc"],
    roof: "#8a8a8a",
    trim: "#d83a3a",
    palmTrunk: "#8a6a4a",
    leaves: "#4a9a3a",
    hedge: "#4a9a3a",
    hedgeDark: "#357a2a",
  },
  afternoon: {
    skyTop: "#5ab4f0",
    skyBottom: "#fbe9c8",
    sun: { x: 70, y: 36, radius: 12, color: "#fff0a0" },
    mountainsFar: "#c8c0a8",
    mountains: "#a8a088",
    scenery: "park",
    buildingColors: ["#58b04a", "#3f8f3a", "#6cc05a"],
    roof: "#c8a060",
    trim: "#ffffff",
    palmTrunk: "#8a6a4a",
    leaves: "#3f8f3a",
    hedge: "#58b04a",
    hedgeDark: "#3f8f3a",
  },
  sunset: {
    skyTop: "#3a2a6a",
    skyBottom: "#f89a5a",
    sun: { x: 230, y: 92, radius: 20, color: "#ffb050" },
    mountainsFar: "#8a5a8a",
    mountains: "#5a3a6a",
    scenery: "houses",
    buildingColors: ["#e0b090", "#d0a080", "#e8c0a0", "#c89878"],
    roof: "#6a3a3a",
    trim: "#ffe0b0",
    palmTrunk: "#4a3a3a",
    leaves: "#2a4a3a",
    hedge: "#2e5a3a",
    hedgeDark: "#1e3a2a",
  },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof themes;
```

- [ ] **Step 3: Create the heroes**

`super-flynn-bros/src/heroes.ts`:
```ts
// 🛠️ THE HEROES: Colin and Ryan
//
// Each hero is drawn with letters. Every letter is one pixel, and "colors"
// says what color each letter is. A "." is see-through.
//
// 🛠️ TRY THIS: make a hero look like YOU!
//   - Change "H" in colors to your hair color (search "hex color picker").
//   - Change "T" to your favorite shirt color.
//   - Redraw the rows to change the shape. Keep every row the same length!
//   - Or draw a picture and save it as public/assets/colin.png (or ryan.png).
//     It replaces the drawing below. See the README for sizes.
//
// runSpeed: how fast they run. jumpPower: how high they jump.

import type { HeroDef } from "./engine/types";

// Colin: older, taller, blonde. Jumps a little higher.
const colinHead = [
  "......HHHHH.....",
  "....hHHHHHHH....",
  "...hHHHHHHHHH...",
  "...hHHHHHHHHHH..",
  "...hHHHSSSSSH...",
  "...hHHSSSSESS...",
  "...hHHSSSSESS...",
  "....hHSSSSSSSs..",
  ".....SSSSSSS....",
  "......sSSs......",
];
const colinBody = [
  "....rRRTTTTT....",
  "...rRRRTTTTTT...",
  "...rRRRTTTTTT...",
  "...rRRRTTtTTT...",
  "...rRRRTTtTTT...",
  "...rRRRTTtTTT...",
  "...rRRRTTtTTT...",
  "....rRRTTSSTT...",
  "....TTTTTTTTT...",
  "....PPPPPPPP....",
];

export const colin: HeroDef = {
  key: "colin",
  name: "Colin",
  colors: {
    H: "#f6d860", // hair (blonde)
    h: "#d9a93a", // hair shadow
    S: "#f3c294", // skin
    s: "#d89b6a", // skin shadow
    E: "#1d1d2b", // eye
    T: "#3d7be0", // shirt
    t: "#2a57a8", // shirt shadow (arm)
    R: "#d84a3c", // backpack
    r: "#9e2f27", // backpack shadow
    P: "#3a4466", // pants
    W: "#f2f2f2", // shoes
    K: "#2b2b2b", // shoe soles
  },
  frames: {
    idle: [
      ...colinHead,
      ...colinBody,
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....WWW..WWWW...",
      "....KKK..KKKK...",
    ],
    walk1: [
      ...colinHead,
      ...colinBody,
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      "...PPPP.PPPP....",
      "...PPP...PPP....",
      "..PPP.....PPP...",
      "..PPP.....PPP...",
      "..PPP......PPP..",
      ".PPP.......PPP..",
      ".PPP.......PPP..",
      ".PPP.......PPP..",
      "WWWW.......WWWW.",
      "KKKK.......KKKK.",
    ],
    walk2: [
      ...colinHead,
      ...colinBody,
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      ".....PPPPPP.....",
      ".....PPPPPP.....",
      ".....PPPPP......",
      ".....PPPPP......",
      ".....PPPPP......",
      ".....PPPPPP.....",
      ".....PPP.PPP....",
      ".....PPP.PPP....",
      ".....WWW.WWWW...",
      ".....KKK.KKKK...",
    ],
    jump: [
      ...colinHead,
      ...colinBody,
      "....PPPPPPPP....",
      "....PPPPPPPP....",
      "....PPPP.PPPP...",
      "....PPP...PPPP..",
      "...PPP.....PPP..",
      "...PPP....WWWW..",
      "...PPP....KKKK..",
      "..WWWW..........",
      "..KKKK..........",
      "................",
      "................",
      "................",
    ],
  },
  runSpeed: 135,
  jumpPower: 360,
  hitbox: { width: 10, height: 30 },
};

// Ryan: shorter, brown hair. Runs a little faster.
const ryanHead = [
  "......HHHH......",
  "....hHHHHHH.....",
  "...hHHHHHHHH....",
  "...hHHHHHHHHH...",
  "...hHHSSSSSH....",
  "...hHSSSSESS....",
  "...hHSSSSESS....",
  "....hSSSSSSSs...",
  ".....SSSSSS.....",
];
const ryanBody = [
  "....rRRTTTT.....",
  "...rRRRTTTTT....",
  "...rRRRTTtTT....",
  "...rRRRTTtTT....",
  "...rRRRTTtTT....",
  "....rRRTSSTT....",
  "....PPPPPPPP....",
];

export const ryan: HeroDef = {
  key: "ryan",
  name: "Ryan",
  colors: {
    H: "#7a4a2a", // hair (brown)
    h: "#563219", // hair shadow
    S: "#f3c294", // skin
    s: "#d89b6a", // skin shadow
    E: "#1d1d2b", // eye
    T: "#3fae5a", // shirt
    t: "#2b7f40", // shirt shadow (arm)
    R: "#f0a030", // backpack
    r: "#b8741c", // backpack shadow
    P: "#4a5a8a", // shorts
    W: "#f2f2f2", // socks and shoes
    K: "#2b2b2b", // shoe soles
  },
  frames: {
    idle: [
      ...ryanHead,
      ...ryanBody,
      "....PPPPPPPP....",
      "....PPP..PPP....",
      "....PPP..PPP....",
      "....SSS..SSS....",
      "....SSS..SSS....",
      "....WWW..WWW....",
      "....WWW..WWWW...",
      "....KKK..KKKK...",
    ],
    walk1: [
      ...ryanHead,
      ...ryanBody,
      "....PPPPPPPP....",
      "...PPP...PPP....",
      "..PPP.....PPP...",
      "..SSS......SSS..",
      ".SSS.......SSS..",
      ".WWW........WWW.",
      "WWWW........WWWW",
      "KKKK........KKKK",
    ],
    walk2: [
      ...ryanHead,
      ...ryanBody,
      "....PPPPPPPP....",
      ".....PPPPPP.....",
      ".....PPPPP......",
      ".....SSSSS......",
      ".....SSSSS......",
      ".....SSS.SSS....",
      ".....WWW.WWWW...",
      ".....KKK.KKKK...",
    ],
    jump: [
      ...ryanHead,
      ...ryanBody,
      "....PPPPPPPP....",
      "....PPP..PPPP...",
      "...PPP....SSSS..",
      "...SSS....WWWW..",
      "..SSS.....KKKK..",
      "..WWWW..........",
      "..KKKK..........",
      "................",
    ],
  },
  runSpeed: 150,
  jumpPower: 330,
  hitbox: { width: 10, height: 22 },
};

export const heroes = { colin, ryan };
```

- [ ] **Step 4: Create the hazards**

`super-flynn-bros/src/hazards.ts`:
```ts
// 🛠️ HAZARDS: things to jump over or get out of the way of
//
// They're all friendly. You can't beat them, you just avoid them! Touching
// one costs a heart.
//
// Each hazard has:
//   mapChar   the letter that puts it in a level map (see levels/)
//   colors    what color each letter in the drawing is
//   frames    the drawing (more than one frame = it animates)
//   behavior  how it moves. Pick one:
//     "patrol"     walks back and forth, turns at walls and edges (uses speed)
//     "slowWalk"   walks slowly, turns at walls only (uses speed)
//     "rollAcross" zooms one way and leaves the screen (uses speed, direction)
//     "bounce"     hops along (uses speed, bounceHeight)
//     "chase"      runs at the nearest hero once they're close (uses speed, range)
//     "toggle"     stays put and switches on and off (uses onMs, offMs)
//
// 🛠️ TRY THIS: make your own hazard! Copy one of the blocks below, give it a
// new key and an unused mapChar (like "Q"), draw it, pick a behavior, then
// put that letter in a level map.

import type { HazardDef } from "./engine/types";

// Dogs face left (toward you). The game flips them when they walk right.
const dogFrames = [
  [
    "................",
    "..bb............",
    ".bBBb...........",
    "bBEBBb.........b",
    "NBBBBBC........b",
    ".TBBBBCBBBBBBBb.",
    "..BBBBBBBBBBBBb.",
    "...BBBBBBBBBBB..",
    "...BB.BB..BB.BB.",
    "...BB.BB..BB.BB.",
    "...bb.bb..bb.bb.",
    "................",
  ],
  [
    "................",
    "..bb............",
    ".bBBb...........",
    "bBEBBb..........",
    "NBBBBBC.........",
    ".TBBBBCBBBBBBBbb",
    "..BBBBBBBBBBBBb.",
    "...BBBBBBBBBBB..",
    "....BBBB..BBBB..",
    "...BB..BBBB..BB.",
    "...bb..bbbb..bb.",
    "................",
  ],
];

const dog: HazardDef = {
  key: "dog",
  name: "Dog",
  mapChar: "D",
  colors: { B: "#a0642d", b: "#6e4119", E: "#1d1d2b", N: "#1d1d2b", T: "#e8607a", C: "#d83a3a" },
  frames: dogFrames,
  frameMs: 200,
  behavior: "patrol",
  speed: 40,
  hitbox: { width: 14, height: 9 },
};

const chaseDog: HazardDef = {
  key: "chaseDog",
  name: "Chasing Dog",
  mapChar: "H",
  colors: { B: "#3a3a3a", b: "#1e1e1e", E: "#f2f2f2", N: "#f2f2f2", T: "#e8607a", C: "#3d7be0" },
  frames: dogFrames,
  frameMs: 120,
  behavior: "chase",
  speed: 75,
  range: 140,
  hitbox: { width: 14, height: 9 },
};

const neighbor: HazardDef = {
  key: "neighbor",
  name: "Slow Neighbor",
  mapChar: "N",
  colors: { H: "#d0d0d0", S: "#e0ac7e", E: "#1d1d2b", G: "#e07ab0", Y: "#f6d860", P: "#b8a77a", K: "#3a2a1a" },
  frames: [
    [
      "......HHHH......",
      ".....HHHHHH.....",
      ".....SSSSSH.....",
      "....SESSSSH.....",
      "....SSSSSSH.....",
      ".....SSSSS......",
      "......SSS.......",
      "..S..GGGGGG.....",
      "..SGGGYGGGGG....",
      "...GGGGGGYGG....",
      "....GYGGGGGGG...",
      "....GGGGYGGSS...",
      "....GGGGGGG.....",
      "....PPPPPPP.....",
      "....PPPPPPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "...KKKK.KKK.....",
      "...KKKK.KKK.....",
    ],
    [
      "......HHHH......",
      ".....HHHHHH.....",
      ".....SSSSSH.....",
      "....SESSSSH.....",
      "....SSSSSSH.....",
      ".....SSSSS......",
      "......SSS.......",
      "......GGGGGG....",
      "....GGGYGGGGG...",
      "...SGGGGGGYGG...",
      "...SGYGGGGGGG...",
      "....GGGGYGGSS...",
      "....GGGGGGG.....",
      "....PPPPPPP.....",
      "....PPPPPPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "....PPP.PPP.....",
      "...KKKK.KKK.....",
      "...KKKK.KKK.....",
    ],
  ],
  frameMs: 500,
  behavior: "slowWalk",
  speed: 15,
  hitbox: { width: 10, height: 20 },
};

const skateboarder: HazardDef = {
  key: "skateboarder",
  name: "Skateboarder",
  mapChar: "K",
  colors: { C: "#d83a3a", S: "#c68a5a", E: "#1d1d2b", T: "#f0a030", P: "#3a4466", K: "#2b2b2b", D: "#6e4119", w: "#f2f2f2" },
  frames: [
    [
      "....CCCCC.......",
      "..CCCCCCCC......",
      "....SSSSS.......",
      "...SESSSS.......",
      "...SSSSSS.......",
      "....SSSS........",
      "...TTTTTTT......",
      "..STTTTTTTS.....",
      ".S.TTTTTTT.S....",
      "...TTTTTTT......",
      "...PPPPPPP......",
      "...PPP.PPP......",
      "..PPP...PPP.....",
      "..PPP...PPP.....",
      ".PPP.....PPP....",
      ".KKK.....KKK....",
      "DDDDDDDDDDDDD...",
      ".ww.......ww....",
    ],
  ],
  frameMs: 1000,
  behavior: "rollAcross",
  speed: 110,
  direction: -1,
  hitbox: { width: 12, height: 16 },
};

const sprinkler: HazardDef = {
  key: "sprinkler",
  name: "Sprinkler",
  mapChar: "S",
  colors: { G: "#4a4a4a", g: "#2e2e2e", W: "#bfe8ff", w: "#7cc8f0" },
  frames: [
    // off
    [
      "................",
      "................",
      "................",
      "......GGGG......",
      ".....gGGGGg.....",
      "....gggggggg....",
    ],
    // on
    [
      "................",
      ".......ww.......",
      ".....wWWWWw.....",
      "....wW.WW.Ww....",
      "...wW..WW..Ww...",
      "...W...WW...W...",
      "..wW...WW...Ww..",
      "..W....WW....W..",
      ".wW....WW....Ww.",
      ".W.....WW.....W.",
      ".W.....WW.....W.",
      "wW.....WW.....Ww",
      "W......WW......W",
      "W......WW......W",
      "W......WW......W",
      "w......WW......w",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      ".......WW.......",
      "......wWWw......",
      "......GGGG......",
      ".....gGGGGg.....",
      "....gggggggg....",
    ],
  ],
  frameMs: 1000,
  behavior: "toggle",
  onMs: 1500,
  offMs: 1500,
  hitbox: { width: 12, height: 28 },
};

const baseball: HazardDef = {
  key: "baseball",
  name: "Loose Baseball",
  mapChar: "L",
  colors: { W: "#f2f2f2", R: "#d83a3a" },
  frames: [
    [
      "..WWWW..",
      ".WRWWRW.",
      "WRWWWWRW",
      "WWWWWWWW",
      "WWWWWWWW",
      "WRWWWWRW",
      ".WRWWRW.",
      "..WWWW..",
    ],
  ],
  frameMs: 1000,
  behavior: "bounce",
  speed: 40,
  direction: -1,
  bounceHeight: 40,
  hitbox: { width: 7, height: 7 },
};

const mower: HazardDef = {
  key: "mower",
  name: "Lawn Mower",
  mapChar: "M",
  colors: { R: "#d83a3a", r: "#9e2f27", K: "#2b2b2b", G: "#58b04a", H: "#8a8a8a" },
  frames: [
    [
      "...........H....",
      "............H...",
      ".............H..",
      "..............H.",
      "...RRRRRRRRRRRH.",
      "..RRRRRRRRRRRRR.",
      ".RRRrrrrrrrrRRR.",
      ".RRRRRRRRRRRRRR.",
      "GrrrrrrrrrrrrrrG",
      ".KKK.......KKK..",
      "KKKKK.....KKKKK.",
      ".KKK.......KKK..",
    ],
    [
      "...........H....",
      "............H...",
      ".............H..",
      "..............H.",
      "...RRRRRRRRRRRH.",
      "..RRRRRRRRRRRRR.",
      ".RRRrrrrrrrrRRR.",
      ".RRRRRRRRRRRRRR.",
      ".rrrrrrrrrrrrrr.",
      "GKKK.......KKKG.",
      "KKKKK.....KKKKK.",
      ".KKK.......KKK..",
    ],
  ],
  frameMs: 100,
  behavior: "patrol",
  speed: 55,
  hitbox: { width: 14, height: 9 },
};

export const hazards: HazardDef[] = [dog, chaseDog, neighbor, skateboarder, sprinkler, baseball, mower];
```

- [ ] **Step 5: Create the items**

`super-flynn-bros/src/items.ts`:
```ts
// 🛠️ ITEMS: things to grab
//
//   score   points for grabbing it
//   hearts  hearts it gives back (you can't go past maxHearts in settings.ts)
//   sound   which sound plays (from sounds.ts)
//
// 🛠️ TRY THIS: make donuts worth 100 points, or make the burger give back 3 hearts.

import type { ItemDef } from "./engine/types";

const donut: ItemDef = {
  key: "donut",
  name: "Donut",
  mapChar: "o",
  colors: { D: "#e0a35a", F: "#f070b0", s: "#f6f6f6", Y: "#f6d860", B: "#5ab0f0" },
  frames: [
    [
      "...DDDD...",
      ".DFFFFFFD.",
      "DFFsFFBFFD",
      "DFYF..FFsD",
      "DFF....FFD",
      "DFB....YFD",
      "DFsF..FBFD",
      "DFFFsFFFFD",
      ".DDFFFFDD.",
      "...DDDD...",
    ],
  ],
  score: 10,
  hearts: 0,
  sound: "donut",
};

// A double-double with a red and yellow wrapper.
const burger: ItemDef = {
  key: "burger",
  name: "Burger",
  mapChar: "b",
  colors: {
    B: "#e0a040", // bun
    s: "#fff4d0", // sesame seeds
    L: "#58b04a", // lettuce
    T: "#e03a2a", // tomato
    M: "#6e3a1a", // patty
    C: "#f6d020", // cheese
    R: "#d83a3a", // wrapper red
    Y: "#f6d020", // wrapper yellow
  },
  frames: [
    [
      "...BBBBBB...",
      ".BBsBBBBsBB.",
      "BBBBBBsBBBBB",
      "LLLLLLLLLLLL",
      "TTTTTTTTTTTT",
      "MMMMMMMMMMMM",
      "CCCCCCCCCCCC",
      "MMMMMMMMMMMM",
      "CCCCCCCCCCCC",
      "RYYRRYYRRYYR",
      "RYYRRYYRRYYR",
      ".RRRRRRRRRR.",
    ],
  ],
  score: 50,
  hearts: 1,
  sound: "burger",
};

export const items: ItemDef[] = [donut, burger];

// The hearts at the top of the screen: frame 1 is full, frame 2 is empty.
export const heartArt = {
  colors: { R: "#e8334a", W: "#ffd0d8", K: "#5a5a6a", k: "#2e2e3a" },
  frames: [
    [
      ".RR..RR.",
      "RWRRRRRR",
      "RRRRRRRR",
      "RRRRRRRR",
      ".RRRRRR.",
      "..RRRR..",
      "...RR...",
    ],
    [
      ".KK..KK.",
      "KkkKKkkK",
      "KkkkkkkK",
      "KkkkkkkK",
      ".KkkkkK.",
      "..KkkK..",
      "...KK...",
    ],
  ],
};
```

- [ ] **Step 6: Create the tiles and the goal sign**

`super-flynn-bros/src/tiles.ts`:
```ts
// 🛠️ TILES: the blocks that levels are built from
//
// Each tile is 16 x 16 pixels. "mapChar" is the letter you type in a level
// map to place it. "solid: true" means heroes can stand on it and bump into it.
//
// Some tiles have extra drawings:
//   under  used when the same tile is right above (dirt under the sidewalk)
//   left   used on the left end of a row (the front of a car)
//   right  used on the right end of a row (the back of a car)
//
// 🛠️ TRY THIS: change the sidewalk color, or turn the trash bin blue
// (LA has green, blue, and black bins!).

import type { TileDef } from "./engine/types";

/** Flips a drawing left-to-right. */
const mirror = (rows: string[]): string[] => rows.map((row) => [...row].reverse().join(""));

const sidewalk: TileDef = {
  key: "sidewalk",
  name: "Sidewalk",
  mapChar: "#",
  solid: true,
  colors: { L: "#e2ddd0", C: "#c9c3b5", c: "#a49e90", D: "#8a5a32", d: "#6b4423" },
  art: [
    "LLLLLLLLLLLLLLLL",
    "CCCCCCCCCCCCCCCC",
    "CCCCCCCcCCCCCCCC",
    "CCCCCCCcCCCCCCCC",
    "CCCCCCCcCCCCCCCC",
    "CCCCCCCcCCCCCCCC",
    "cccccccccccccccc",
    "DDDDDDDDDDDDDDDD",
    "DDDdDDDDDDDdDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDDDdDDDDDDDdD",
    "DDDDDDDDDDDDDDDD",
    "DdDDDDDDDDdDDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDdDDDDDDDDdDD",
    "DDDDDDDDDDDDDDDD",
  ],
  under: [
    "DDDDDDDDDDDDDDDD",
    "DDDdDDDDDDDdDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDDDdDDDDDDDdD",
    "DDDDDDDDDDDDDDDD",
    "DdDDDDDDDDdDDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDdDDDDDDDDdDD",
    "DDDDDDDDDDDDDDDD",
    "DDDdDDDDDDDdDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDDDdDDDDDDDdD",
    "DDDDDDDDDDDDDDDD",
    "DdDDDDDDDDdDDDDD",
    "DDDDDDDDDDDDDDDD",
    "DDDDdDDDDDDDDdDD",
  ],
};

const brick: TileDef = {
  key: "brick",
  name: "Brick Planter",
  mapChar: "=",
  solid: true,
  colors: { R: "#b5543a", M: "#d8c8b0" },
  art: [
    "MMMMMMMMMMMMMMMM",
    "RRRRRRRMRRRRRRRM",
    "RRRRRRRMRRRRRRRM",
    "RRRRRRRMRRRRRRRM",
    "MMMMMMMMMMMMMMMM",
    "RRRMRRRRRRRMRRRR",
    "RRRMRRRRRRRMRRRR",
    "RRRMRRRRRRRMRRRR",
    "MMMMMMMMMMMMMMMM",
    "RRRRRRRMRRRRRRRM",
    "RRRRRRRMRRRRRRRM",
    "RRRRRRRMRRRRRRRM",
    "MMMMMMMMMMMMMMMM",
    "RRRMRRRRRRRMRRRR",
    "RRRMRRRRRRRMRRRR",
    "RRRMRRRRRRRMRRRR",
  ],
};

const trashBin: TileDef = {
  key: "trashBin",
  name: "Trash Bin",
  mapChar: "B",
  solid: true,
  colors: { L: "#2e2e2e", G: "#3a7a4a", g: "#285a36", W: "#e8e8e8", K: "#1a1a1a" },
  art: [
    ".LLLLLLLLLLLLLL.",
    "LLLLLLLLLLLLLLLL",
    ".GGGGGGGGGGGGGG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGWWWWGGGgG.",
    ".GgGGGWWWWGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GgGGGGGGGGGGgG.",
    ".GGGGGGGGGGGGGG.",
    "..KK........KK..",
    "..KK........KK..",
  ],
};

const carFront = [
  "......ssssssssss",
  ".....sWWWWWWWsWW",
  "....sWWWWWWWWsWW",
  "...sWWWWWWWWWsWW",
  "..sSSSSSSSSSSSSS",
  ".sSSSSSSSSSSSSSS",
  "sSSSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSS",
  "ssssssssssssssss",
  "SSSSSSSSSSSSSSSS",
  "..KKKK..........",
  ".KKHHKK.........",
  ".KKHHKK.........",
  "..KKKK..........",
];

const car: TileDef = {
  key: "car",
  name: "Parked Car",
  mapChar: "c",
  solid: true,
  colors: { S: "#c0c6d0", s: "#8a909a", W: "#7ac0e8", K: "#222222", H: "#888888" },
  art: [
    "ssssssssssssssss",
    "WWWWWWsWWWWWWWWW",
    "WWWWWWsWWWWWWWWW",
    "WWWWWWsWWWWWWWWW",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSSSS",
    "ssssssssssssssss",
    "SSSSSSSSSSSSSSSS",
    "................",
    "................",
    "................",
    "................",
  ],
  left: carFront,
  right: mirror(carFront),
};

const fence: TileDef = {
  key: "fence",
  name: "Picket Fence",
  mapChar: "F",
  solid: true,
  colors: { W: "#f2efe6", w: "#c8c2b0" },
  art: [
    ".W...W...W...W..",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWWWWWWWWWWWWWWW",
    "wwwwwwwwwwwwwwww",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWWWWWWWWWWWWWWW",
    "wwwwwwwwwwwwwwww",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
    "WWW.WWW.WWW.WWW.",
  ],
};

export const tiles: TileDef[] = [sidewalk, brick, trashBin, car, fence];

// The sign at the end of each level. The level's goalLabel is written on it.
export const goalArt = {
  colors: { G: "#2a7a3a", W: "#f2f2f2", P: "#8a8a8a" },
  art: [
    ".GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.",
    "GWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWG",
    "GWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWG",
    ".GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
    ".....PP..........................PP.....",
  ],
};
```

- [ ] **Step 7: Write the data test (it runs at the end of Task 7)**

`super-flynn-bros/tests/data.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseFrames } from "../src/engine/pixelArt";
import { buildCharLookup } from "../src/engine/levelLoader";
import { catalog, heroList } from "../src/engine/catalog";
import { colin, ryan } from "../src/heroes";
import { hazards } from "../src/hazards";
import { heartArt, items } from "../src/items";
import { goalArt, tiles } from "../src/tiles";
import { soundEffects } from "../src/sounds";

const noWarnings = (frames: string[][], colors: Record<string, string>, name: string) =>
  expect(parseFrames(frames, colors, name).warnings).toEqual([]);

describe("game art", () => {
  it.each(heroList.map((h) => [h.name, h]))("%s's drawings are all the same size with known colors", (_, hero) => {
    const { idle, walk1, walk2, jump } = hero.frames;
    noWarnings([idle, walk1, walk2, jump], hero.colors, hero.key);
  });

  it.each(hazards.map((h) => [h.name, h]))("%s's drawing is clean", (_, hazard) => {
    noWarnings(hazard.frames, hazard.colors, hazard.key);
  });

  it.each(items.map((i) => [i.name, i]))("%s's drawing is clean", (_, item) => {
    noWarnings(item.frames, item.colors, item.key);
  });

  it.each(tiles.map((t) => [t.name, t]))("%s tile is 16 x 16 with known colors", (_, tile) => {
    for (const art of [tile.art, tile.under, tile.left, tile.right]) {
      if (!art) continue;
      const sheet = parseFrames([art], tile.colors, tile.key);
      expect(sheet.warnings).toEqual([]);
      expect([sheet.width, sheet.height]).toEqual([16, 16]);
    }
  });

  it("hearts and the goal sign are clean", () => {
    noWarnings(heartArt.frames, heartArt.colors, "heart");
    noWarnings([goalArt.art], goalArt.colors, "goal");
  });
});

describe("game data", () => {
  it("every map letter is used only once", () => {
    expect(buildCharLookup(catalog).warnings).toEqual([]);
  });

  it("every key is unique", () => {
    const keys = [...heroList, ...hazards, ...items, ...tiles].map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("hitboxes fit inside the drawings", () => {
    for (const hero of heroList) {
      const sheet = parseFrames([hero.frames.idle], hero.colors, hero.key);
      expect(hero.hitbox.width).toBeLessThanOrEqual(sheet.width);
      expect(hero.hitbox.height).toBeLessThanOrEqual(sheet.height);
    }
    for (const hazard of hazards) {
      if (!hazard.hitbox) continue;
      const sheet = parseFrames(hazard.frames, hazard.colors, hazard.key);
      expect(hazard.hitbox.width).toBeLessThanOrEqual(sheet.width);
      expect(hazard.hitbox.height).toBeLessThanOrEqual(sheet.height);
    }
  });

  it("Colin is taller and jumps higher; Ryan is faster", () => {
    expect(colin.frames.idle.length).toBeGreaterThan(ryan.frames.idle.length);
    expect(colin.jumpPower).toBeGreaterThan(ryan.jumpPower);
    expect(ryan.runSpeed).toBeGreaterThan(colin.runSpeed);
  });

  it("every item plays a sound that exists", () => {
    for (const item of items) expect(Object.keys(soundEffects)).toContain(item.sound);
  });
});
```

- [ ] **Step 8: Typecheck the data files**

Run: `npx tsc -p super-flynn-bros --noEmit 2>&1 | grep -v "tests/data.test.ts" ; true`
Expected: the only errors come from `tests/data.test.ts` (missing `../src/engine/catalog` and `../src/engine/levelLoader`, which Task 7 creates). No errors in `src/`.

- [ ] **Step 9: Commit**

```bash
git add super-flynn-bros/src super-flynn-bros/tests/data.test.ts
git commit -m "Add Colin, Ryan, hazards, items, and tiles as kid-editable text art"
```

---

### Task 7: Level loader and catalog

**Files:**
- Create: `super-flynn-bros/src/engine/levelLoader.ts`, `super-flynn-bros/src/engine/catalog.ts`
- Test: `super-flynn-bros/tests/levelLoader.test.ts` (and `tests/data.test.ts` from Task 6 now runs)

**Interfaces:**
- Consumes: `TileDef`, `HazardDef`, `ItemDef` (Task 6), `AssetCandidate` (Task 5).
- Produces (levelLoader.ts):
  - `TILE_SIZE = 16`, `MAP_MARKERS = { player1: "1", player2: "2", goal: "G" }`, `UNKNOWN_TILE_KEY = "unknown"`
  - `interface LevelCatalog { tiles; hazards; items }`, `interface Cell { col; row }`, `interface PlacedThing extends Cell { key }`
  - `interface LoadedLevel { cols; rows; tiles: (string | null)[][]; solid: boolean[][]; hazards: PlacedThing[]; items: PlacedThing[]; starts: { 1: Cell; 2: Cell }; goal: Cell; warnings: string[] }`
  - `buildCharLookup(catalog)`, `surfaceRow(solid, col)`, `findSafeSpawn(level, fromCol): Cell | null`, `tileVariant(tiles, col, row): "art" | "under" | "left" | "right"`, `loadLevel(map, catalog, name?): LoadedLevel` (never throws)
- Produces (catalog.ts): `catalog: LevelCatalog`, `heroList: HeroDef[]`, `spriteOverrideCandidates(): AssetCandidate[]` (`assets/<key>.png` for heroes, hazards, and items)

- [ ] **Step 1: Write the failing tests**

`super-flynn-bros/tests/levelLoader.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildCharLookup, findSafeSpawn, loadLevel, tileVariant, UNKNOWN_TILE_KEY, type LevelCatalog } from "../src/engine/levelLoader";
import type { HazardDef, ItemDef, TileDef } from "../src/engine/types";

const tile = (key: string, mapChar: string, solid = true): TileDef => ({ key, name: key, mapChar, solid, colors: {}, art: [] });
const hazard = (key: string, mapChar: string): HazardDef => ({
  key, name: key, mapChar, colors: {}, frames: [], frameMs: 100, behavior: "patrol",
});
const item = (key: string, mapChar: string): ItemDef => ({
  key, name: key, mapChar, colors: {}, frames: [], score: 10, hearts: 0, sound: "donut",
});

const catalog: LevelCatalog = {
  tiles: [tile("ground", "#"), tile("bush", "~", false)],
  hazards: [hazard("dog", "D")],
  items: [item("donut", "o")],
};

describe("loadLevel", () => {
  it("reads tiles, hazards, items, starts and the goal", () => {
    const level = loadLevel(["    o   ", " 12 D  G", "########"], catalog);
    expect(level.cols).toBe(8);
    expect(level.rows).toBe(3);
    expect(level.tiles[2].every((t) => t === "ground")).toBe(true);
    expect(level.solid[2][0]).toBe(true);
    expect(level.hazards).toEqual([{ key: "dog", col: 4, row: 1 }]);
    expect(level.items).toEqual([{ key: "donut", col: 4, row: 0 }]);
    expect(level.starts).toEqual({ 1: { col: 1, row: 1 }, 2: { col: 2, row: 1 } });
    expect(level.goal).toEqual({ col: 7, row: 1 });
    expect(level.warnings).toEqual([]);
  });

  it("is fine with rows of different lengths (trailing spaces don't matter)", () => {
    const level = loadLevel(["", " 1  G", "######"], catalog);
    expect(level.cols).toBe(6);
    expect(level.tiles[0]).toEqual([null, null, null, null, null, null]);
    expect(level.warnings).toEqual([]);
  });

  it("knows non-solid tiles", () => {
    const level = loadLevel(["1~ G", "####"], catalog);
    expect(level.tiles[0][1]).toBe("bush");
    expect(level.solid[0][1]).toBe(false);
  });

  it("shows a solid ? block for unknown letters and says where", () => {
    const level = loadLevel(["1 Z G", "#####"], catalog, "Test Level");
    expect(level.tiles[0][2]).toBe(UNKNOWN_TILE_KEY);
    expect(level.solid[0][2]).toBe(true);
    expect(level.warnings).toEqual([
      'Test Level: I don\'t know what "Z" means (first seen at row 1, column 3). Showing a ? block.',
    ]);
  });

  it("adds a start and a goal when the map forgets them", () => {
    const level = loadLevel(["      ", "      ", "##  ##"], catalog, "Oops");
    expect(level.starts[1]).toEqual({ col: 0, row: 1 });
    expect(level.starts[2]).toEqual({ col: 4, row: 1 });
    expect(level.goal).toEqual({ col: 5, row: 1 });
    expect(level.warnings).toHaveLength(2);
  });

  it("keeps the first of a doubled marker", () => {
    const level = loadLevel(["1 1 G", "#####"], catalog);
    expect(level.starts[1]).toEqual({ col: 0, row: 0 });
    expect(level.warnings[0]).toContain('more than one "1"');
  });

  it("never throws on an empty map", () => {
    expect(() => loadLevel([], catalog)).not.toThrow();
  });
});

describe("buildCharLookup", () => {
  it("warns when two things share a letter or use a special letter", () => {
    const { warnings } = buildCharLookup({
      tiles: [tile("ground", "#")],
      hazards: [hazard("dog", "#"), hazard("cat", "G")],
      items: [],
    });
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('dog and ground both use "#"');
    expect(warnings[1]).toContain('"G" is a special map letter');
  });
});

describe("findSafeSpawn", () => {
  const level = loadLevel(["      ", "      ", "      ", "##  ##"], catalog);

  it("skips pits and finds the next ground", () => {
    expect(findSafeSpawn(level, 2)).toEqual({ col: 4, row: 2 });
  });

  it("looks backward when there's no ground ahead", () => {
    const edge = loadLevel(["    ", "    ", "    ", "##  "], catalog);
    expect(findSafeSpawn(edge, 3)).toEqual({ col: 1, row: 2 });
  });

  it("needs room for a hero above the ground", () => {
    const low = loadLevel(["##", "##"], catalog);
    expect(findSafeSpawn(low, 0)).toBeNull();
  });
});

describe("tileVariant", () => {
  const grid = [
    [null, "car", "car", "car", null],
    [null, null, "ground", null, null],
    [null, null, "ground", null, null],
  ];

  it("uses left and right ends for rows of the same tile", () => {
    expect(tileVariant(grid, 1, 0)).toBe("left");
    expect(tileVariant(grid, 2, 0)).toBe("art");
    expect(tileVariant(grid, 3, 0)).toBe("right");
  });

  it("uses the under drawing when the same tile is on top", () => {
    expect(tileVariant(grid, 2, 1)).toBe("art");
    expect(tileVariant(grid, 2, 2)).toBe("under");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w super-flynn-bros -- levelLoader data`
Expected: FAIL with unresolved `../src/engine/levelLoader` and `../src/engine/catalog`.

- [ ] **Step 3: Implement**

`super-flynn-bros/src/engine/levelLoader.ts`:
```ts
import type { HazardDef, ItemDef, TileDef } from "./types";

export const TILE_SIZE = 16;

/** Special letters in level maps. */
export const MAP_MARKERS = { player1: "1", player2: "2", goal: "G" } as const;

/** Tile shown for letters the game doesn't know. It's solid, so nobody falls through. */
export const UNKNOWN_TILE_KEY = "unknown";

export interface LevelCatalog {
  tiles: TileDef[];
  hazards: HazardDef[];
  items: ItemDef[];
}

export interface Cell {
  col: number;
  row: number;
}

export interface PlacedThing extends Cell {
  key: string;
}

export interface LoadedLevel {
  cols: number;
  rows: number;
  /** [row][col]: tile key, or null for empty. */
  tiles: (string | null)[][];
  /** [row][col]: can you stand on it? */
  solid: boolean[][];
  hazards: PlacedThing[];
  items: PlacedThing[];
  starts: { 1: Cell; 2: Cell };
  goal: Cell;
  warnings: string[];
}

type Lookup = Map<string, { kind: "tile" | "hazard" | "item"; key: string; solid: boolean }>;

/** Builds the letter → thing table and warns about letters used twice. */
export function buildCharLookup(catalog: LevelCatalog): { lookup: Lookup; warnings: string[] } {
  const lookup: Lookup = new Map();
  const warnings: string[] = [];
  const reserved = new Set<string>([...Object.values(MAP_MARKERS), " ", "."]);
  const add = (char: string, kind: "tile" | "hazard" | "item", key: string, solid: boolean) => {
    if (reserved.has(char)) {
      warnings.push(`"${char}" is a special map letter, so ${key} can't use it. Pick another mapChar.`);
      return;
    }
    const existing = lookup.get(char);
    if (existing) {
      warnings.push(`${key} and ${existing.key} both use "${char}". Give one of them a different mapChar.`);
      return;
    }
    lookup.set(char, { kind, key, solid });
  };
  catalog.tiles.forEach((t) => add(t.mapChar, "tile", t.key, t.solid));
  catalog.hazards.forEach((h) => add(h.mapChar, "hazard", h.key, false));
  catalog.items.forEach((i) => add(i.mapChar, "item", i.key, false));
  return { lookup, warnings };
}

/** The topmost row in `col` that's solid with empty space above it, or null if the column is empty. */
export function surfaceRow(solid: boolean[][], col: number): number | null {
  for (let row = 0; row < solid.length; row++) {
    if (solid[row][col] && (row === 0 || !solid[row - 1][col])) return row;
  }
  return null;
}

/**
 * The first safe place to stand at or after `fromCol`: a solid surface with
 * two empty rows above it (room for a hero). Returns the empty cell to stand in.
 */
export function findSafeSpawn(level: Pick<LoadedLevel, "solid" | "cols">, fromCol: number): Cell | null {
  const start = Math.max(0, Math.min(level.cols - 1, fromCol));
  const order = [
    ...Array.from({ length: level.cols - start }, (_, i) => start + i),
    ...Array.from({ length: start }, (_, i) => start - 1 - i),
  ];
  for (const col of order) {
    const row = surfaceRow(level.solid, col);
    if (row !== null && row >= 2) return { col, row: row - 1 };
  }
  return null;
}

/** Which drawing a tile uses, based on its neighbors. */
export function tileVariant(
  tiles: (string | null)[][],
  col: number,
  row: number,
): "art" | "under" | "left" | "right" {
  const key = tiles[row]?.[col];
  if (!key) return "art";
  if (tiles[row - 1]?.[col] === key) return "under";
  const leftSame = tiles[row]?.[col - 1] === key;
  const rightSame = tiles[row]?.[col + 1] === key;
  if (!leftSame && rightSame) return "left";
  if (leftSame && !rightSame) return "right";
  return "art";
}

/** Reads a text map into tiles, hazards, items, starts, and the goal. Never throws. */
export function loadLevel(map: readonly string[], catalog: LevelCatalog, name = "level"): LoadedLevel {
  const { lookup, warnings } = buildCharLookup(catalog);
  const rows = Math.max(1, map.length);
  const cols = Math.max(1, ...map.map((line) => line.length));
  const tiles: (string | null)[][] = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
  const solid: boolean[][] = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const hazards: PlacedThing[] = [];
  const items: PlacedThing[] = [];
  const found: { 1?: Cell; 2?: Cell; goal?: Cell } = {};
  const unknown = new Map<string, Cell>();

  map.forEach((line, row) => {
    [...line].forEach((char, col) => {
      if (char === " " || char === ".") return;
      const marker =
        char === MAP_MARKERS.player1 ? 1 : char === MAP_MARKERS.player2 ? 2 : char === MAP_MARKERS.goal ? "goal" : null;
      if (marker !== null) {
        if (found[marker]) warnings.push(`${name}: there's more than one "${char}". Using the first one.`);
        else found[marker] = { col, row };
        return;
      }
      const thing = lookup.get(char);
      if (!thing) {
        if (!unknown.has(char)) unknown.set(char, { col, row });
        tiles[row][col] = UNKNOWN_TILE_KEY;
        solid[row][col] = true;
        return;
      }
      if (thing.kind === "tile") {
        tiles[row][col] = thing.key;
        solid[row][col] = thing.solid;
      } else {
        (thing.kind === "hazard" ? hazards : items).push({ key: thing.key, col, row });
      }
    });
  });

  for (const [char, at] of unknown) {
    warnings.push(
      `${name}: I don't know what "${char}" means (first seen at row ${at.row + 1}, column ${at.col + 1}). Showing a ? block.`,
    );
  }

  const fallbackStart = (fromCol: number): Cell => findSafeSpawn({ solid, cols }, fromCol) ?? { col: fromCol, row: 0 };
  if (!found[1]) {
    found[1] = fallbackStart(0);
    warnings.push(`${name}: no "1" (player 1 start) in the map, so I put one at the left.`);
  }
  if (!found[2]) found[2] = fallbackStart(found[1].col + 2);
  if (!found.goal) {
    let goal: Cell = { col: cols - 1, row: 0 };
    for (let col = cols - 1; col >= 0; col--) {
      const row = surfaceRow(solid, col);
      if (row !== null && row >= 1) {
        goal = { col, row: row - 1 };
        break;
      }
    }
    found.goal = goal;
    warnings.push(`${name}: no "G" (goal) in the map, so I put one at the right.`);
  }

  return { cols, rows, tiles, solid, hazards, items, starts: { 1: found[1], 2: found[2] }, goal: found.goal, warnings };
}
```

`super-flynn-bros/src/engine/catalog.ts`:
```ts
import { heroes } from "../heroes";
import { hazards } from "../hazards";
import { items } from "../items";
import { tiles } from "../tiles";
import type { AssetCandidate } from "./assets";
import type { HeroDef } from "./types";
import type { LevelCatalog } from "./levelLoader";

/** Everything a level map can contain. */
export const catalog: LevelCatalog = { tiles, hazards, items };

export const heroList: HeroDef[] = [heroes.colin, heroes.ryan];

/** Custom PNGs kids can drop in to replace the drawings: public/assets/<key>.png */
export function spriteOverrideCandidates(): AssetCandidate[] {
  return [...heroList, ...hazards, ...items].map((def) => ({ key: def.key, urls: [`assets/${def.key}.png`] }));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w super-flynn-bros -- levelLoader data && npm run typecheck -w super-flynn-bros`
Expected: every `levelLoader` and `data` test passes, including "every map letter is used only once" and one "is clean" test per drawing. tsc is clean.

- [ ] **Step 5: Commit**

```bash
git add super-flynn-bros/src/engine super-flynn-bros/tests
git commit -m "Add the text-map level loader and game catalog"
```

---

### Task 8: The four levels

**Files:**
- Create: `super-flynn-bros/src/levels/level1-school.ts`, `level2-track.ts`, `level3-baseball.ts`, `level4-home.ts`, `index.ts`
- Test: `super-flynn-bros/tests/levels.test.ts`

**Interfaces:**
- Consumes: `LevelDef` (Task 6), `loadLevel`, `catalog` (Task 7), `themes` (Task 6), `heroes`, `mySettings`.
- Produces: `level1`…`level4: LevelDef` and `levels: LevelDef[]` (index.ts, in play order).

Maps are 11 rows. Rows 9 and 10 are ground (`#`), and hazards and starts stand on row 8. Pits are at most 3 tiles wide, and steps are at most 2 tiles high. The level test enforces all of this.

- [ ] **Step 1: Write the failing test**

`super-flynn-bros/tests/levels.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loadLevel, type LoadedLevel } from "../src/engine/levelLoader";
import { catalog } from "../src/engine/catalog";
import { levels } from "../src/levels";
import { themes } from "../src/levels/themes";
import { heroes } from "../src/heroes";
import { mySettings } from "../src/settings";

const GROUND_ROW = 9;

/** How many solid tiles are stacked on top of the ground in a column. */
function stackHeight(level: LoadedLevel, col: number): number {
  let height = 0;
  for (let row = GROUND_ROW - 1; row >= 0 && level.solid[row][col]; row--) height++;
  return height;
}

describe.each(levels.map((def, i) => [i + 1, def] as const))("level %i", (_, def) => {
  const level = loadLevel(def.map, catalog, def.name);

  it("loads without warnings", () => {
    expect(level.warnings).toEqual([]);
  });

  it("is 11 rows tall (one screen)", () => {
    expect(level.rows).toBe(11);
  });

  it("uses a real theme", () => {
    expect(Object.keys(themes)).toContain(def.theme);
  });

  it("starts both heroes and the goal on solid ground", () => {
    for (const cell of [level.starts[1], level.starts[2], level.goal]) {
      expect(level.solid[cell.row + 1][cell.col]).toBe(true);
    }
  });

  it("has no pit wider than 3 tiles", () => {
    let run = 0;
    for (let col = 0; col < level.cols; col++) {
      run = level.solid[GROUND_ROW][col] ? 0 : run + 1;
      expect(run, `pit at column ${col + 1}`).toBeLessThanOrEqual(3);
    }
  });

  it("never needs a step up of more than 2 tiles", () => {
    for (let col = 0; col < level.cols - 1; col++) {
      if (!level.solid[GROUND_ROW][col] || !level.solid[GROUND_ROW][col + 1]) continue;
      expect(stackHeight(level, col + 1) - stackHeight(level, col), `step at column ${col + 2}`).toBeLessThanOrEqual(2);
    }
  });

  it("has hazards and donuts", () => {
    expect(level.hazards.length).toBeGreaterThan(3);
    expect(level.items.filter((i) => i.key === "donut").length).toBeGreaterThan(10);
  });
});

describe("jumping", () => {
  it("both heroes can jump at least 2.5 tiles high with the default settings", () => {
    for (const hero of Object.values(heroes)) {
      const height = hero.jumpPower ** 2 / (2 * mySettings.gravity);
      expect(height, hero.name).toBeGreaterThanOrEqual(40);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -w super-flynn-bros -- levels`
Expected: FAIL, `Failed to resolve import "../src/levels"`.

- [ ] **Step 3: Create the levels**

`super-flynn-bros/src/levels/level1-school.ts`:
```ts
// 🛠️ LEVEL 1: Walk to School
//
// Each line is one row of the level. Each letter is one 16 x 16 tile.
//
//   #  sidewalk          =  brick planter     B  trash bin
//   c  parked car        F  picket fence
//   o  donut             b  burger (gives back a heart)
//   D  dog               H  chasing dog       N  slow neighbor
//   K  skateboarder      S  sprinkler         L  loose baseball
//   M  lawn mower
//   1  Colin's start     2  Ryan's start      G  goal sign
//
// (Tiles, hazards, and items each have their letter in tiles.ts, hazards.ts,
// and items.ts.)
//
// 🛠️ TRY THIS: add more donuts (o), dig a pit by deleting both rows of # in a
// spot (keep pits 3 tiles wide or less, so you can jump them), or put a dog
// (D) between two trash bins (B) so it walks back and forth.

import type { LevelDef } from "../engine/types";

export const level1: LevelDef = {
  name: "Walk to School",
  goalLabel: "SCHOOL",
  theme: "morning",
  map: [
    "",
    "",
    "",
    "",
    "                                                                                                                                                                   oo",
    "                                         ooo              ooo                            oo                                                                               ooo",
    "              o        ooo         oo          ooo                            ooo                 oo                       oo                   ooo                ==",
    "        ooo                                               ===              oo       b    ==                                         oooooo                      ==",
    "  1 2         B    B    D     B           S    ccc   S        B   D    B                ====    S    S    B   D     B   ccc  ccc            B    D     B    S              S              G",
    "###################################  #########################################   ##########################################  #########################################  ################################",
    "###################################  #########################################   ##########################################  #########################################  ################################",
  ],
};
```

`super-flynn-bros/src/levels/level2-track.ts`:
```ts
// 🛠️ LEVEL 2: Walk to Track Practice
//
// Each line is one row of the level. Each letter is one 16 x 16 tile.
//
//   #  sidewalk          =  brick planter     B  trash bin
//   c  parked car        F  picket fence
//   o  donut             b  burger (gives back a heart)
//   D  dog               H  chasing dog       N  slow neighbor
//   K  skateboarder      S  sprinkler         L  loose baseball
//   M  lawn mower
//   1  Colin's start     2  Ryan's start      G  goal sign
//
// (Tiles, hazards, and items each have their letter in tiles.ts, hazards.ts,
// and items.ts.)
//
// 🛠️ TRY THIS: add more donuts (o), dig a pit by deleting both rows of # in a
// spot (keep pits 3 tiles wide or less, so you can jump them), or put a dog
// (D) between two trash bins (B) so it walks back and forth.

import type { LevelDef } from "../engine/types";

export const level2: LevelDef = {
  name: "Walk to Track Practice",
  goalLabel: "TRACK",
  theme: "midday",
  map: [
    "",
    "",
    "",
    "",
    "",
    "             ooo                                     oo                                                               ooo                                                    ooo",
    "                      ooo           oo                                      oooooooo              ooo",
    "       ooo                                           ==  =                                    b                       ===                               oooo               ==   =",
    "  1 2         N       ccc     K           N   B     ===  ==     K     S     ccc  ccc    N            B   D     B    K         N    N      ccc  ccc    K         S   N     ===   ==     K            G",
    "####################################  #################  #########################################   ########################################  ##############################   ##################################",
    "####################################  #################  #########################################   ########################################  ##############################   ##################################",
  ],
};
```

`super-flynn-bros/src/levels/level3-baseball.ts`:
```ts
// 🛠️ LEVEL 3: Walk to Baseball Practice
//
// Each line is one row of the level. Each letter is one 16 x 16 tile.
//
//   #  sidewalk          =  brick planter     B  trash bin
//   c  parked car        F  picket fence
//   o  donut             b  burger (gives back a heart)
//   D  dog               H  chasing dog       N  slow neighbor
//   K  skateboarder      S  sprinkler         L  loose baseball
//   M  lawn mower
//   1  Colin's start     2  Ryan's start      G  goal sign
//
// (Tiles, hazards, and items each have their letter in tiles.ts, hazards.ts,
// and items.ts.)
//
// 🛠️ TRY THIS: add more donuts (o), dig a pit by deleting both rows of # in a
// spot (keep pits 3 tiles wide or less, so you can jump them), or put a dog
// (D) between two trash bins (B) so it walks back and forth.

import type { LevelDef } from "../engine/types";

export const level3: LevelDef = {
  name: "Walk to Baseball Practice",
  goalLabel: "BASEBALL",
  theme: "afternoon",
  map: [
    "",
    "",
    "",
    "",
    "                                                                                                                                                        ooo",
    "                                                      oooo                                             ooo",
    "              ooo     L                oo    L                        ooo                     L  L                     oo                 L             ===                     L",
    "       ooo                                            ====                                b            ===                                         ===                            oooo",
    "  1 2         FFF        F  M     F             FF          S   N           F   M     F               =====    K    FFF  FFF B  D    B        S                   F   M     F                       G",
    "#######################################  #############################   ##############################################  ###################################   ###################################################",
    "#######################################  #############################   ##############################################  ###################################   ###################################################",
  ],
};
```

`super-flynn-bros/src/levels/level4-home.ts`:
```ts
// 🛠️ LEVEL 4: Walk Back Home
//
// Each line is one row of the level. Each letter is one 16 x 16 tile.
//
//   #  sidewalk          =  brick planter     B  trash bin
//   c  parked car        F  picket fence
//   o  donut             b  burger (gives back a heart)
//   D  dog               H  chasing dog       N  slow neighbor
//   K  skateboarder      S  sprinkler         L  loose baseball
//   M  lawn mower
//   1  Colin's start     2  Ryan's start      G  goal sign
//
// (Tiles, hazards, and items each have their letter in tiles.ts, hazards.ts,
// and items.ts.)
//
// 🛠️ TRY THIS: add more donuts (o), dig a pit by deleting both rows of # in a
// spot (keep pits 3 tiles wide or less, so you can jump them), or put a dog
// (D) between two trash bins (B) so it walks back and forth.

import type { LevelDef } from "../engine/types";

export const level4: LevelDef = {
  name: "Walk Back Home",
  goalLabel: "HOME",
  theme: "sunset",
  map: [
    "",
    "",
    "",
    "",
    "",
    "                                                                           oo                                                               ooo                                            ooo",
    "                                    ooo         ooo     L                                                        ooo                              L   L",
    "       ooo                                                                 ==  =      b                                                     ===                           b              ==   =     ooooo",
    "  1 2      B  D    B     N    S             K   ccc         FF    H       ===  ==      F  M     F    S   S    ccc   ccc     N   K     H                      B  D     B        H  S     ===   ==              G",
    "####################################   ######################################  ##################################   #######################################  ##############################   ##############################",
    "####################################   ######################################  ##################################   #######################################  ##############################   ##############################",
  ],
};
```

`super-flynn-bros/src/levels/index.ts`:
```ts
// 🛠️ The order levels are played in. Made a new level? Import it and add it here!

import { level1 } from "./level1-school";
import { level2 } from "./level2-track";
import { level3 } from "./level3-baseball";
import { level4 } from "./level4-home";
import type { LevelDef } from "../engine/types";

export const levels: LevelDef[] = [level1, level2, level3, level4];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w super-flynn-bros && npm run typecheck -w super-flynn-bros`
Expected: the whole suite passes, including 7 checks × 4 levels plus the jumping check. tsc is clean.

- [ ] **Step 5: Commit**

```bash
git add super-flynn-bros/src/levels super-flynn-bros/tests/levels.test.ts
git commit -m "Add the four Woodland Hills levels with solvability checks"
```

---

### Task 9: Boot and title screen (textures, backgrounds, services, audio loading)

**Files:**
- Create: `super-flynn-bros/src/controls.ts`, `super-flynn-bros/src/engine/services.ts`, `super-flynn-bros/src/engine/sprites.ts`, `super-flynn-bros/src/engine/tileset.ts`, `super-flynn-bros/src/engine/phaserAudio.ts`, `super-flynn-bros/src/engine/ui.ts`, `super-flynn-bros/src/engine/backgrounds.ts`
- Create: `super-flynn-bros/src/scenes/BootScene.ts`, `super-flynn-bros/src/scenes/TitleScene.ts`, and stub scenes for `PlayScene`, `HudScene`, `PauseScene`, `LevelCompleteScene`, `EndingScene` (replaced in Tasks 10–13)
- Modify: `super-flynn-bros/src/main.ts` (full version), `super-flynn-bros/package.json` (add `@web-games/input`)
- Test: `super-flynn-bros/tests/ui.test.ts`, `super-flynn-bros/tests/sprites.test.ts` (Review Focus #1)

**Interfaces:**
- Consumes: everything from Tasks 2–8.
- Produces:
  - `player1Controls`, `player2Controls: Bindings` (controls.ts). Actions: `left right up down jump confirm pause mute`.
  - services.ts: `type GameMode = "colin" | "ryan" | "coop"`, `interface Services { input; audio: GameAudio; progress: Progress; artSizes: Map<string, Size>; tileset: Tileset }`, `setServices`, `getServices`, `useControls(input, mode | "menu")`, `toggleMute()`, `unlock(levelNumber)`, `globalStep()` (called on every Phaser `PRE_STEP`: `input.update()` plus the global mute key)
  - sprites.ts: `fitBody(frame, art, hitbox?): BodyFit` (pure), `fitSprite(sprite, art, hitbox?)`, `addPicture(scene, key, x, y, art)`
  - tileset.ts: `UNKNOWN_TILE`, `type TileVariant`, `interface Tileset { frames: Map<string, number>; solidIndexes: number[] }`, `buildTileset(scene, key, tiles, warn?)`, `tileFrame(tileset, key, variant): number`
  - phaserAudio.ts: `phaserAudioBackend(manager): AudioBackend`
  - ui.ts: `textStyle(size?, color?)`, `addText(scene, x, y, text, size?, color?)`, `formatTime(ms)`, `blink(scene, target)`, `class Menu { constructor(scene, x, y, labels: () => string[], onPick, sfx, spacing?); update(input); destroy() }`
  - backgrounds.ts: `createBackground(scene, themeName, groundY): (scrollX: number) => void`, `mix(a, b, t)`
  - BootScene.ts: `interface BootData { input; progress; overrides; audioFiles; quickStart }`, scene key `"Boot"`
  - TitleScene.ts: scene key `"Title"`. It starts `"Play"` with `PlayData { mode, levelIndex, score }`.
  - main.ts query params: `?level=N&mode=colin|ryan|coop` skips the title screen, and `?debug=1` shows hitboxes.

- [ ] **Step 1: Add the input library to the game**

Run: `npm install @web-games/input@* -w super-flynn-bros`
Expected: `super-flynn-bros/package.json` dependencies become:
```json
  "dependencies": {
    "@web-games/input": "*",
    "phaser": "3.90.0"
  },
```
(If npm tries to fetch from the registry, edit `package.json` by hand to the block above and run `npm install`. Workspaces link it locally.)

- [ ] **Step 2: Write the failing tests for `formatTime` and `fitBody`**

`super-flynn-bros/tests/ui.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatTime } from "../src/engine/ui";

describe("formatTime", () => {
  it("shows minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(9_999)).toBe("0:09");
    expect(formatTime(83_000)).toBe("1:23");
  });

  it("never shows negative time", () => {
    expect(formatTime(-500)).toBe("0:00");
  });
});
```

`super-flynn-bros/tests/sprites.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { fitBody } from "../src/engine/sprites";

describe("fitBody", () => {
  it("uses the hitbox as-is for text-drawn art, centered at the feet", () => {
    expect(fitBody({ width: 16, height: 32 }, { width: 16, height: 32 }, { width: 10, height: 30 })).toEqual({
      scale: 1,
      width: 10,
      height: 30,
      offsetX: 3,
      offsetY: 2,
    });
  });

  it("shrinks a big custom PNG to the art's size and scales the hitbox to match", () => {
    expect(fitBody({ width: 64, height: 128 }, { width: 16, height: 32 }, { width: 10, height: 30 })).toEqual({
      scale: 0.25,
      width: 40,
      height: 120,
      offsetX: 12,
      offsetY: 8,
    });
  });

  it("keeps an odd-shaped PNG inside the art's box and its hitbox inside the picture", () => {
    const fit = fitBody({ width: 100, height: 100 }, { width: 16, height: 32 }, { width: 10, height: 30 });
    expect(fit.scale).toBeCloseTo(0.16);
    expect(fit.width).toBeLessThanOrEqual(100);
    expect(fit.height).toBe(100);
    expect(fit.offsetY).toBe(0);
  });

  it("uses the whole picture as the hitbox when none is given", () => {
    expect(fitBody({ width: 10, height: 10 }, { width: 10, height: 10 })).toMatchObject({ width: 10, height: 10, offsetX: 0, offsetY: 0 });
  });
});
```

Run: `npm test -w super-flynn-bros -- ui sprites`
Expected: FAIL, `Failed to resolve import "../src/engine/ui"` and `"../src/engine/sprites"`.

- [ ] **Step 3: Create controls and services**

`super-flynn-bros/src/controls.ts`:
```ts
// 🛠️ CONTROLS
//
// Keys use their "code" names: "ArrowLeft", "KeyA", "Space", "Enter", ...
// (Look up "KeyboardEvent code" to find the name of any key.)
//
// Gamepad buttons use the standard layout:
//   0 = A   1 = B   2 = X   3 = Y   8 = Select/Back   9 = Start
//   12 = D-pad up   13 = D-pad down   14 = D-pad left   15 = D-pad right
//
// In 1-player games, player 1 can use either side of the keyboard.

import type { Bindings, PadBindings } from "@web-games/input";

const padButtons: PadBindings["buttons"] = {
  left: [14],
  right: [15],
  up: [12],
  down: [13],
  jump: [0],
  confirm: [0, 9],
  pause: [9],
  mute: [8],
};

const padSticks: PadBindings["axes"] = {
  left: [{ axis: 0, direction: -1 }],
  right: [{ axis: 0, direction: 1 }],
  up: [{ axis: 1, direction: -1 }],
  down: [{ axis: 1, direction: 1 }],
};

export const player1Controls: Bindings = {
  keys: {
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    jump: ["ArrowUp", "Space"],
    confirm: ["Enter", "Space"],
    pause: ["Escape", "KeyP"],
    mute: ["KeyM"],
  },
  pad: { index: 0, buttons: padButtons, axes: padSticks },
};

export const player2Controls: Bindings = {
  keys: {
    left: ["KeyA"],
    right: ["KeyD"],
    up: ["KeyW"],
    down: ["KeyS"],
    jump: ["KeyW"],
    confirm: [],
    pause: ["Escape"],
    mute: ["KeyM"],
  },
  pad: { index: 1, buttons: padButtons, axes: padSticks },
};
```

`super-flynn-bros/src/engine/services.ts`:
```ts
import { mergeBindings, type InputManager } from "@web-games/input";
import { player1Controls, player2Controls } from "../controls";
import type { GameAudio } from "./audio";
import { saveProgress, unlockLevel, type Progress } from "./progress";
import type { Tileset } from "./tileset";
import type { Size } from "./types";

export type GameMode = "colin" | "ryan" | "coop";

/** Things every scene shares. BootScene creates them. */
export interface Services {
  input: InputManager;
  audio: GameAudio;
  progress: Progress;
  /** Size of each text drawing, by key. Sprites use it as their on-screen size. */
  artSizes: Map<string, Size>;
  tileset: Tileset;
}

let current: Services | null = null;

export function setServices(services: Services): void {
  current = services;
}

export function getServices(): Services {
  if (!current) throw new Error("BootScene hasn't finished setting up yet.");
  return current;
}

/**
 * Menus: anyone can drive. 1 player: player 1 can use either side of the
 * keyboard. Co-op: one side (and one gamepad) each.
 */
export function useControls(input: InputManager, mode: GameMode | "menu"): void {
  if (mode === "coop") {
    input.setBindings(1, player1Controls);
    input.setBindings(2, player2Controls);
  } else {
    input.setBindings(1, mergeBindings(player1Controls, player2Controls));
    if (mode === "menu") input.setBindings(2, player2Controls);
    else input.clearBindings(2);
  }
}

export function toggleMute(): void {
  const services = getServices();
  services.audio.toggleMute();
  services.progress = { ...services.progress, muted: services.audio.muted };
  saveProgress(services.progress);
}

/** Opens levels up to `levelNumber` (1-based) on the title screen. */
export function unlock(levelNumber: number): void {
  const services = getServices();
  services.progress = unlockLevel(services.progress, levelNumber);
  saveProgress(services.progress);
}

/** Runs every frame before the scenes: reads input, and handles keys that work everywhere. */
export function globalStep(): void {
  if (!current) return;
  current.input.update();
  if (current.input.anyJustPressed("mute")) toggleMute();
}
```

- [ ] **Step 4: Create sprites, tileset, audio backend, and UI helpers**

`super-flynn-bros/src/engine/sprites.ts`:
```ts
import type Phaser from "phaser";
import type { Size } from "./types";

export interface BodyFit {
  scale: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Works out how to show a frame at the art's size and where its hitbox goes
 * (centered, at the feet). Body sizes and offsets are in frame pixels.
 * A kid's PNG can be any size: it's scaled to fit inside the art's size.
 */
export function fitBody(frame: Size, art: Size, hitbox: Size = art): BodyFit {
  const scale = Math.min(art.width / frame.width, art.height / frame.height);
  const width = Math.min(frame.width, hitbox.width / scale);
  const height = Math.min(frame.height, hitbox.height / scale);
  return { scale, width, height, offsetX: (frame.width - width) / 2, offsetY: frame.height - height };
}

export function fitSprite(sprite: Phaser.Physics.Arcade.Sprite, art: Size, hitbox?: Size): void {
  const fit = fitBody({ width: sprite.frame.width, height: sprite.frame.height }, art, hitbox);
  sprite.setScale(fit.scale);
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setSize(fit.width, fit.height, false);
  body.setOffset(fit.offsetX, fit.offsetY);
}

/** A picture with no physics (title and ending screens), sized like the art. */
export function addPicture(scene: Phaser.Scene, key: string, x: number, y: number, art: Size): Phaser.GameObjects.Image {
  const image = scene.add.image(x, y, key, 0).setOrigin(0.5, 1);
  image.setScale(Math.min(art.width / image.frame.width, art.height / image.frame.height));
  return image;
}
```

`super-flynn-bros/src/engine/tileset.ts`:
```ts
import type Phaser from "phaser";
import { addTextureFromFrames, parseFrames, type ParsedGrid } from "./pixelArt";
import { TILE_SIZE, UNKNOWN_TILE_KEY } from "./levelLoader";
import type { TileDef } from "./types";

/** The yellow "?" block shown for map letters the game doesn't know. */
export const UNKNOWN_TILE: TileDef = {
  key: UNKNOWN_TILE_KEY,
  name: "Unknown",
  mapChar: "?",
  solid: true,
  colors: { Y: "#f6d020", y: "#b8901a", K: "#222222" },
  art: [
    "KKKKKKKKKKKKKKKK",
    "KYYYYYYYYYYYYYYK",
    "KYyYYYYYYYYYYyYK",
    "KYYYYYKKKKYYYYYK",
    "KYYYYKKYYKKYYYYK",
    "KYYYYKKYYKKYYYYK",
    "KYYYYYYYYKKYYYYK",
    "KYYYYYYYKKYYYYYK",
    "KYYYYYYKKYYYYYYK",
    "KYYYYYYKKYYYYYYK",
    "KYYYYYYYYYYYYYYK",
    "KYYYYYYKKYYYYYYK",
    "KYYYYYYKKYYYYYYK",
    "KYyYYYYYYYYYYyYK",
    "KYYYYYYYYYYYYYYK",
    "KKKKKKKKKKKKKKKK",
  ],
};

export type TileVariant = "art" | "under" | "left" | "right";

export interface Tileset {
  /** "sidewalk:under" → frame number in the tiles texture. */
  frames: Map<string, number>;
  /** Frame numbers you can stand on. */
  solidIndexes: number[];
}

const VARIANTS: TileVariant[] = ["art", "under", "left", "right"];

/** Crops or pads a drawing to exactly one tile. */
function toTileSize(grid: ParsedGrid): ParsedGrid {
  const pixels: (string | null)[] = [];
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      pixels.push(x < grid.width && y < grid.height ? grid.pixels[y * grid.width + x] : null);
    }
  }
  return { width: TILE_SIZE, height: TILE_SIZE, pixels };
}

/** Draws every tile (and its variants) into one strip texture for the tilemap. */
export function buildTileset(
  scene: Phaser.Scene,
  key: string,
  tiles: TileDef[],
  warn: (message: string) => void = console.warn,
): Tileset {
  const frames = new Map<string, number>();
  const solidIndexes: number[] = [];
  const grids: ParsedGrid[] = [];
  for (const tile of [...tiles, UNKNOWN_TILE]) {
    for (const variant of VARIANTS) {
      const art = tile[variant];
      if (!art) continue;
      const sheet = parseFrames([art], tile.colors, `${tile.key} (${variant})`);
      sheet.warnings.forEach((message) => warn(message));
      if (sheet.width !== TILE_SIZE || sheet.height !== TILE_SIZE) {
        warn(`${tile.key} (${variant}) is ${sheet.width} x ${sheet.height}, but tiles are ${TILE_SIZE} x ${TILE_SIZE}. Trimming it to fit.`);
      }
      frames.set(`${tile.key}:${variant}`, grids.length);
      if (tile.solid) solidIndexes.push(grids.length);
      grids.push(toTileSize(sheet.frames[0]));
    }
  }
  addTextureFromFrames(scene, key, grids, TILE_SIZE, TILE_SIZE);
  return { frames, solidIndexes };
}

/** Frame number for a tile variant, falling back to the tile's main drawing, then the ? block. */
export function tileFrame(tileset: Tileset, key: string, variant: TileVariant): number {
  return (
    tileset.frames.get(`${key}:${variant}`) ??
    tileset.frames.get(`${key}:art`) ??
    tileset.frames.get(`${UNKNOWN_TILE_KEY}:art`) ??
    0
  );
}
```

`super-flynn-bros/src/engine/phaserAudio.ts`:
```ts
import type Phaser from "phaser";
import type { AudioBackend } from "./audio";

type VolumeSound = Phaser.Sound.BaseSound & { setVolume(value: number): unknown };

/** Connects GameAudio to Phaser's sound system. */
export function phaserAudioBackend(manager: Phaser.Sound.BaseSoundManager): AudioBackend {
  return {
    play(cacheKey, { volume, loop }) {
      const sound = manager.add(cacheKey, { volume, loop }) as VolumeSound;
      let gone = false;
      const cleanUp = () => {
        if (gone) return;
        gone = true;
        sound.destroy();
      };
      if (!loop) sound.once("complete", cleanUp);
      sound.play();
      return {
        stop: () => {
          if (gone) return;
          sound.stop();
          cleanUp();
        },
        setVolume: (value) => {
          if (!gone) sound.setVolume(value);
        },
      };
    },
  };
}
```

`super-flynn-bros/src/engine/ui.ts`:
```ts
import type Phaser from "phaser";
import type { InputManager } from "@web-games/input";

export function textStyle(size = 8, color = "#ffffff"): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: `${size}px`,
    color,
    stroke: "#1a1c2c",
    strokeThickness: size >= 16 ? 4 : 2,
  };
}

/** Centered text that stays put when the camera scrolls. */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 8,
  color = "#ffffff",
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, textStyle(size, color)).setOrigin(0.5).setScrollFactor(0);
}

/** 83000 → "1:23" */
export function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function blink(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject): void {
  scene.tweens.add({ targets: target, alpha: 0, duration: 500, yoyo: true, repeat: -1 });
}

/** An up/down menu with a cursor. Up/down moves, confirm picks. */
export class Menu {
  private index = 0;
  private readonly texts: Phaser.GameObjects.Text[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly labels: () => string[],
    private readonly onPick: (index: number) => void,
    private readonly sfx: (key: "menuMove" | "menuSelect") => void,
    private readonly spacing = 12,
  ) {
    this.render();
  }

  update(input: InputManager): void {
    const count = this.labels().length;
    if (input.anyJustPressed("up")) {
      this.index = (this.index + count - 1) % count;
      this.sfx("menuMove");
    } else if (input.anyJustPressed("down")) {
      this.index = (this.index + 1) % count;
      this.sfx("menuMove");
    } else if (input.anyJustPressed("confirm")) {
      this.sfx("menuSelect");
      this.onPick(this.index);
      return;
    }
    this.render();
  }

  destroy(): void {
    this.texts.forEach((text) => text.destroy());
    this.texts.length = 0;
  }

  private render(): void {
    const labels = this.labels();
    while (this.texts.length < labels.length) {
      this.texts.push(addText(this.scene, this.x, this.y + this.texts.length * this.spacing, ""));
    }
    labels.forEach((label, i) => {
      const selected = i === this.index;
      this.texts[i].setText(selected ? `> ${label} <` : label).setColor(selected ? "#f6d860" : "#ffffff");
    });
  }
}
```

- [ ] **Step 5: Create the backgrounds**

`super-flynn-bros/src/engine/backgrounds.ts`:
```ts
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
```

- [ ] **Step 6: Create the Boot and Title scenes**

`super-flynn-bros/src/scenes/BootScene.ts`:
```ts
import Phaser from "phaser";
import type { InputManager } from "@web-games/input";
import { catalog, heroList } from "../engine/catalog";
import { makeSpriteSheet } from "../engine/pixelArt";
import { buildTileset } from "../engine/tileset";
import { GameAudio } from "../engine/audio";
import { phaserAudioBackend } from "../engine/phaserAudio";
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
  /** Sound and music files that exist: cache key → url. */
  audioFiles: Map<string, string>;
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
      console.info(`Couldn't load ${file.src}, so the game will skip it.`);
    });
    for (const [key, url] of this.boot.overrides) this.load.image(key, url);
    for (const [key, url] of this.boot.audioFiles) this.load.audio(key, url);
  }

  create(): void {
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

`super-flynn-bros/src/scenes/TitleScene.ts`:
```ts
import Phaser from "phaser";
import { createBackground } from "../engine/backgrounds";
import { tileFrame } from "../engine/tileset";
import { addPicture } from "../engine/sprites";
import { getServices, useControls, type GameMode } from "../engine/services";
import { addText, blink, Menu } from "../engine/ui";
import { levels } from "../levels";

const GROUND_Y = 144;
const MODES: GameMode[] = ["colin", "ryan", "coop"];

export class TitleScene extends Phaser.Scene {
  private state: "press" | "menu" = "press";
  private menu: Menu | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  private mode: GameMode = "colin";

  constructor() {
    super("Title");
  }

  create(): void {
    this.state = "press";
    this.menu = null;
    const { width } = this.scale;
    const { tileset, artSizes } = getServices();

    createBackground(this, "morning", GROUND_Y)(0);
    this.add.tileSprite(0, GROUND_Y, width, 16, "tiles", tileFrame(tileset, "sidewalk", "art")).setOrigin(0);
    this.add.tileSprite(0, GROUND_Y + 16, width, 16, "tiles", tileFrame(tileset, "sidewalk", "under")).setOrigin(0);
    addPicture(this, "colin", 140, GROUND_Y, artSizes.get("colin")!);
    addPicture(this, "ryan", 180, GROUND_Y, artSizes.get("ryan")!).setFlipX(true);

    addText(this, width / 2, 30, "SUPER FLYNN BROS", 24, "#f6d860");
    addText(this, width / 2, 52, "WOODLAND HILLS, CA", 8);
    this.prompt = addText(this, width / 2, 92, "PRESS START", 8);
    blink(this, this.prompt);
    addText(this, width / 2, 168, "P1: ARROWS + SPACE   P2: A D W   M: MUTE", 8, "#d4f1ff");
  }

  update(): void {
    const { input, audio } = getServices();
    if (this.state === "press") {
      if (input.anyJustPressed("confirm") || input.anyJustPressed("jump") || input.anyJustPressed("pause")) {
        // Browsers only allow sound after a key press, so the music starts here.
        audio.playMusic("title");
        audio.playSfx("menuSelect");
        this.prompt?.destroy();
        this.showModeMenu();
      }
      return;
    }
    this.menu?.update(input);
  }

  private showModeMenu(): void {
    this.state = "menu";
    this.setMenu(76, () => ["1P COLIN", "1P RYAN", "2P CO-OP"], (i) => this.pickMode(MODES[i]));
  }

  private pickMode(mode: GameMode): void {
    this.mode = mode;
    const unlocked = Math.min(getServices().progress.unlockedLevels, levels.length);
    if (unlocked <= 1) {
      this.startGame(0);
      return;
    }
    this.setMenu(
      70,
      () => levels.slice(0, unlocked).map((level, i) => `${i + 1}. ${level.name.toUpperCase()}`),
      (i) => this.startGame(i),
    );
  }

  private setMenu(y: number, labels: () => string[], onPick: (index: number) => void): void {
    this.menu?.destroy();
    const { audio } = getServices();
    this.menu = new Menu(this, this.scale.width / 2, y, labels, onPick, (key) => audio.playSfx(key));
  }

  private startGame(levelIndex: number): void {
    useControls(getServices().input, this.mode);
    this.scene.start("Play", { mode: this.mode, levelIndex, score: 0 });
  }
}
```

Stub scenes so `main.ts` compiles. Create each of these five files with this shape, swapping in the class name and key (`PlayScene`/`"Play"`, `HudScene`/`"Hud"`, `PauseScene`/`"Pause"`, `LevelCompleteScene`/`"LevelComplete"`, `EndingScene`/`"Ending"`):
```ts
import Phaser from "phaser";

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("Play");
  }

  create(): void {
    this.add.text(160, 88, "Play: coming in the next task", { fontFamily: "monospace", fontSize: "8px" }).setOrigin(0.5);
  }
}
```
`HudScene.ts`'s stub must also export the state type that Task 10's `PlayScene` imports:
```ts
export interface HudState {
  score: number;
  donuts: number;
  timeMs: number;
  heroes: { name: string; hearts: number; out: boolean }[];
  maxHearts: number;
  muted: boolean;
}
```

- [ ] **Step 7: Replace `main.ts`**

`super-flynn-bros/src/main.ts`:
```ts
import Phaser from "phaser";
import { InputManager } from "@web-games/input";
import { findAssets, makeHttpExists } from "./engine/assets";
import { audioCandidates } from "./engine/audio";
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
  if (!Number.isInteger(level) || level < 1 || level > levels.length) return null;
  const modes: GameMode[] = ["colin", "ryan", "coop"];
  const mode = params.get("mode") as GameMode | null;
  return { levelIndex: level - 1, mode: mode && modes.includes(mode) ? mode : "colin" };
}

async function start(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const exists = makeHttpExists();
  const [overrides, audioFiles] = await Promise.all([
    findAssets(spriteOverrideCandidates(), exists),
    findAssets(audioCandidates(soundEffects, musicTracks), exists),
  ]);
  const boot: BootData = {
    input: new InputManager(window),
    progress: loadProgress(),
    overrides,
    audioFiles,
    quickStart: readQuickStart(params),
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 320,
    height: 176,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#1a1c2c",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: "arcade",
      // ?debug=1 draws every hitbox
      arcade: { gravity: { x: 0, y: settings.gravity }, debug: params.has("debug") },
    },
    scene: [BootScene, TitleScene, PlayScene, HudScene, PauseScene, LevelCompleteScene, EndingScene],
    callbacks: {
      preBoot: (g) => {
        g.registry.set("boot", boot);
      },
    },
  });
  game.events.on(Phaser.Core.Events.PRE_STEP, globalStep);
}

void start();
```

- [ ] **Step 8: Verify**

Run: `npm test -w super-flynn-bros && npm run typecheck -w super-flynn-bros`
Expected: all tests pass (including `ui` and `sprites`), and tsc is clean.

Run: `npm run dev -w super-flynn-bros` and open `http://localhost:8001/`.
Expected:
- Title screen: "SUPER FLYNN BROS" in yellow over a morning sky with a sun, two mountain ridges, ranch houses with palm trees, hedges, a sidewalk, and Colin (tall, blonde, blue shirt, red backpack) and Ryan (shorter, brown hair, green shirt) facing each other.
- The browser console shows one `console.info` listing every missing sound and music file, and no errors or warnings from game code.
- Press Space: the menu "1P COLIN / 1P RYAN / 2P CO-OP" appears. ↑/↓ moves the yellow cursor. Enter/Space shows the Play stub text.

- [ ] **Step 9: Commit**

```bash
git add super-flynn-bros package-lock.json
git commit -m "Add boot (text art to textures), parallax backgrounds, and title menu"
```

---

### Task 10: Heroes and the play scene core

**Files:**
- Create: `super-flynn-bros/src/engine/Hero.ts`
- Create (stub, replaced in Task 11): `super-flynn-bros/src/engine/Hazard.ts`
- Modify: `super-flynn-bros/src/scenes/PlayScene.ts` (full version, final)
- Test: none new. Hero physics is checked by playing (Step 4).

**Interfaces:**
- Consumes: `fitSprite`, `getServices`, `unlock`, `createBackground`, `tileFrame`, `nextScrollX`, `loadLevel`, `findSafeSpawn`, `tileVariant`, `settings`, `levels`, `heroes`, `HudState`.
- Produces:
  - `interface HeroControls { left; right; jumpHeld; jumpPressed }`
  - `class Hero extends Phaser.Physics.Arcade.Sprite { hearts; isOut; lastSafe; landed; readonly def: HeroDef; readonly player: 1 | 2; move(now, deltaMs, controls): boolean; isSafe(now); bump(now, fromX): boolean; fall(now, spawn); heal(n); placeAt(x, y); knockOut(); revive(x, y, hearts, now); rememberSafeGround(isGroundAt) }`
  - `PlayScene` (key `"Play"`) with `interface PlayData { mode: GameMode; levelIndex: number; score: number }`. It emits `"hud"` with a `HudState` every frame, launches `"Hud"` and `"Pause"`, and starts `"LevelComplete"` with `{ mode, levelIndex, score, donuts, timeMs }`.

`PlayScene` is written in its final form here because hazards, items, co-op, and the goal all live in the same `create()`/`update()`. Tasks 11–13 make the scenes it hands off to real, and verify each feature in the browser.

- [ ] **Step 1: Create the Hero**

`super-flynn-bros/src/engine/Hero.ts`:
```ts
import Phaser from "phaser";
import { settings } from "../settings";
import { fitSprite } from "./sprites";
import type { HeroDef, Size } from "./types";

export interface HeroControls {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
}

/** Frame numbers in the hero's sprite sheet (same order as heroes.ts). */
const FRAME = { idle: 0, walk1: 1, walk2: 2, jump: 3 } as const;

/** Colin or Ryan: running, jumping, hearts, and blinking after a bump. */
export class Hero extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  hearts: number;
  /** Co-op: ran out of hearts and waiting to pop back in. */
  isOut = false;
  /** Last spot with ground under both feet; falling in a pit sends you back here. */
  lastSafe: { x: number; y: number };
  private safeUntil = 0;
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private jumpBufferedAt = Number.NEGATIVE_INFINITY;
  private rising = false;
  private wasOnGround = false;
  /** True for the one frame when the hero touches down after being in the air. */
  landed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: HeroDef,
    readonly player: 1 | 2,
    art: Size,
  ) {
    super(scene, x, y, def.key, FRAME.idle);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    fitSprite(this, art, def.hitbox);
    this.body.setMaxVelocity(10_000, settings.maxFallSpeed);
    this.hearts = Math.min(settings.hearts, settings.maxHearts);
    this.lastSafe = { x, y };
  }

  /** Runs every frame. Returns true if the hero jumped this frame. */
  move(now: number, deltaMs: number, controls: HeroControls): boolean {
    if (this.isOut) return false;
    const body = this.body;
    const dt = deltaMs / 1000;
    const onGround = body.blocked.down;
    if (onGround) this.lastGroundedAt = now;
    this.landed = onGround && !this.wasOnGround;
    this.wasOnGround = onGround;

    // Running: speed up toward the top speed, slow down when you let go.
    const dir = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const control = onGround ? 1 : settings.airControl;
    let vx = body.velocity.x;
    if (dir !== 0) {
      vx = Phaser.Math.Clamp(vx + dir * settings.acceleration * control * dt, -this.def.runSpeed, this.def.runSpeed);
      this.setFlipX(dir < 0);
    } else {
      const slow = settings.deceleration * control * dt;
      vx = Math.abs(vx) <= slow ? 0 : vx - Math.sign(vx) * slow;
    }
    body.setVelocityX(vx);

    // Jumping, with a little forgiveness on both sides.
    if (controls.jumpPressed) this.jumpBufferedAt = now;
    const buffered = now - this.jumpBufferedAt <= settings.jumpBufferMs;
    const coyote = now - this.lastGroundedAt <= settings.coyoteTimeMs;
    let jumped = false;
    if (buffered && coyote && !this.rising) {
      body.setVelocityY(-this.def.jumpPower);
      this.rising = true;
      jumped = true;
      this.jumpBufferedAt = Number.NEGATIVE_INFINITY;
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    }
    // Let go early = smaller hop.
    if (this.rising && !controls.jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * settings.jumpCut);
      this.rising = false;
    }
    if (!jumped && (body.velocity.y >= 0 || onGround)) this.rising = false;

    this.showFrame(now, onGround, dir);
    this.setAlpha(now < this.safeUntil && Math.floor(now / 80) % 2 === 0 ? 0.3 : 1);
    return jumped;
  }

  /** Can't be hurt right now (just got bumped, or waiting to pop back in). */
  isSafe(now: number): boolean {
    return this.isOut || now < this.safeUntil;
  }

  /** Touched a hazard at `fromX`. Returns true if a heart was lost. */
  bump(now: number, fromX: number): boolean {
    if (this.isSafe(now)) return false;
    this.hearts = Math.max(0, this.hearts - 1);
    this.safeUntil = now + settings.safeTimeMs;
    const away = this.x < fromX ? -1 : 1;
    this.body.setVelocity(away * settings.knockback, -settings.knockback);
    return true;
  }

  /** Fell in a pit: lose a heart and go back to safe ground. */
  fall(now: number, spawn: { x: number; y: number }): void {
    this.hearts = Math.max(0, this.hearts - 1);
    this.safeUntil = now + settings.safeTimeMs;
    this.placeAt(spawn.x, spawn.y);
  }

  heal(amount: number): void {
    this.hearts = Math.min(settings.maxHearts, this.hearts + amount);
  }

  placeAt(x: number, y: number): void {
    this.body.reset(x, y);
    this.lastSafe = { x, y };
  }

  knockOut(): void {
    this.isOut = true;
    this.setVisible(false);
    this.body.enable = false;
  }

  revive(x: number, y: number, hearts: number, now: number): void {
    this.isOut = false;
    this.setVisible(true);
    this.body.enable = true;
    this.placeAt(x, y);
    this.hearts = hearts;
    this.safeUntil = now + settings.safeTimeMs;
  }

  /** Remembers this spot if there's ground under both feet. */
  rememberSafeGround(isGroundAt: (x: number, y: number) => boolean): void {
    const body = this.body;
    if (body.blocked.down && isGroundAt(body.left + 1, body.bottom + 1) && isGroundAt(body.right - 1, body.bottom + 1)) {
      this.lastSafe = { x: this.x, y: this.y };
    }
  }

  private showFrame(now: number, onGround: boolean, dir: number): void {
    if (!onGround) this.setFrame(FRAME.jump);
    else if (dir !== 0 || Math.abs(this.body.velocity.x) > 10) this.setFrame(Math.floor(now / 120) % 2 ? FRAME.walk1 : FRAME.walk2);
    else this.setFrame(FRAME.idle);
  }
}
```

- [ ] **Step 2: Create the Hazard stub (Task 11 replaces it)**

`super-flynn-bros/src/engine/Hazard.ts`:
```ts
import Phaser from "phaser";
import type { HazardDef, Size } from "./types";

export interface Target {
  x: number;
  isOut: boolean;
}

export class Hazard extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, readonly def: HazardDef, _art: Size) {
    super(scene, x, y, def.key, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this); // colliders need a body, even on a stub
    this.setOrigin(0.5, 1);
  }

  get harmful(): boolean {
    return false;
  }

  think(_now: number, _left: number, _right: number, _targets: Target[], _ground: (x: number, y: number) => boolean): "bark" | null {
    return null;
  }
}
```

- [ ] **Step 3: Write the PlayScene**

`super-flynn-bros/src/scenes/PlayScene.ts`:
```ts
import Phaser from "phaser";
import { settings } from "../settings";
import { levels } from "../levels";
import { heroes as heroDefs } from "../heroes";
import { catalog } from "../engine/catalog";
import { findSafeSpawn, loadLevel, tileVariant, TILE_SIZE, type Cell, type LoadedLevel } from "../engine/levelLoader";
import { tileFrame } from "../engine/tileset";
import { createBackground } from "../engine/backgrounds";
import { nextScrollX } from "../engine/camera";
import { fitSprite } from "../engine/sprites";
import { getServices, unlock, type GameMode } from "../engine/services";
import { addText, textStyle } from "../engine/ui";
import { Hero } from "../engine/Hero";
import { Hazard } from "../engine/Hazard";
import type { HeroDef, ItemDef, LevelDef } from "../engine/types";
import type { MusicKey } from "../sounds";
import type { HudState } from "./HudScene";

export interface PlayData {
  mode: GameMode;
  levelIndex: number;
  /** Score carried over from earlier levels. */
  score: number;
}

/** Where a sprite stands when it's placed in map cell `cell` (bottom-center of the cell). */
const feetOf = (cell: Cell) => ({ x: cell.col * TILE_SIZE + TILE_SIZE / 2, y: (cell.row + 1) * TILE_SIZE });

export class PlayScene extends Phaser.Scene {
  private run!: PlayData;
  private def!: LevelDef;
  private level!: LoadedLevel;
  private heroes: Hero[] = [];
  private hazards!: Phaser.GameObjects.Group;
  private items!: Phaser.GameObjects.Group;
  private updateBackground: (scrollX: number) => void = () => {};
  private score = 0;
  private donuts = 0;
  private startedAt = 0;
  private finished = false;

  constructor() {
    super("Play");
  }

  init(run: PlayData): void {
    this.run = run;
    this.heroes = [];
    this.score = run.score;
    this.donuts = 0;
    this.finished = false;
  }

  create(): void {
    const { audio, tileset, artSizes } = getServices();
    this.def = levels[this.run.levelIndex] ?? levels[0];
    this.level = loadLevel(this.def.map, catalog, this.def.name);
    this.level.warnings.forEach((message) => console.warn(message));
    const worldWidth = this.level.cols * TILE_SIZE;
    const worldHeight = this.level.rows * TILE_SIZE;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldWidth, Math.max(worldHeight, this.scale.height));
    cam.setScroll(0, 0);

    this.updateBackground = createBackground(this, this.def.theme, worldHeight - 2 * TILE_SIZE);

    // Tiles
    const data = this.level.tiles.map((row, r) =>
      row.map((key, c) => (key ? tileFrame(tileset, key, tileVariant(this.level.tiles, c, r)) : -1)),
    );
    const map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tilesetImage = map.addTilesetImage("tiles", "tiles", TILE_SIZE, TILE_SIZE, 0, 0);
    const layer = tilesetImage ? map.createLayer(0, tilesetImage, 0, 0) : null;
    if (!layer) throw new Error("Couldn't build the level's tiles.");
    layer.setCollision(tileset.solidIndexes);

    // Goal sign
    const goal = feetOf(this.level.goal);
    this.add.image(goal.x, goal.y, "goal").setOrigin(0.5, 1);
    const labelSize = this.def.goalLabel.length > 6 ? 6 : 8;
    this.add.text(goal.x, goal.y - 40, this.def.goalLabel, textStyle(labelSize)).setOrigin(0.5);
    const goalZone = this.add.zone(goal.x, 0, TILE_SIZE, worldHeight).setOrigin(0.5, 0);
    this.physics.add.existing(goalZone, true);

    // Items float and bob
    this.items = this.add.group();
    for (const placed of this.level.items) {
      const def = catalog.items.find((i) => i.key === placed.key);
      if (!def) continue;
      const sprite = this.physics.add.sprite(placed.col * TILE_SIZE + TILE_SIZE / 2, placed.row * TILE_SIZE + TILE_SIZE / 2, def.key, 0);
      fitSprite(sprite, artSizes.get(def.key) ?? { width: 16, height: 16 });
      (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      sprite.setData("def", def);
      this.items.add(sprite);
      this.tweens.add({ targets: sprite, y: sprite.y - 2, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: (placed.col % 5) * 100 });
    }

    // Hazards
    this.hazards = this.add.group();
    for (const placed of this.level.hazards) {
      const def = catalog.hazards.find((h) => h.key === placed.key);
      if (!def) continue;
      const at = feetOf(placed);
      this.hazards.add(new Hazard(this, at.x, at.y, def, artSizes.get(def.key) ?? { width: 16, height: 16 }));
    }

    // Heroes
    const { starts } = this.level;
    const lineup: { def: HeroDef; player: 1 | 2; start: Cell }[] =
      this.run.mode === "coop"
        ? [
            { def: heroDefs.colin, player: 1, start: starts[1] },
            { def: heroDefs.ryan, player: 2, start: starts[2] },
          ]
        : [{ def: this.run.mode === "ryan" ? heroDefs.ryan : heroDefs.colin, player: 1, start: starts[1] }];
    this.heroes = lineup.map(({ def, player, start }) => {
      const at = feetOf(start);
      return new Hero(this, at.x, at.y, def, player, artSizes.get(def.key) ?? { width: 16, height: 32 });
    });

    // Who bumps into what
    this.physics.add.collider(this.heroes, layer);
    this.physics.add.collider(this.hazards, layer);
    this.physics.add.overlap(this.heroes, this.hazards, (a, b) => this.onBump(a as unknown as Hero, b as unknown as Hazard));
    this.physics.add.overlap(this.heroes, this.items, (a, b) =>
      this.onCollect(a as unknown as Hero, b as unknown as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.heroes, goalZone, () => this.onGoal());

    const banner = addText(this, this.scale.width / 2, 60, `LEVEL ${this.run.levelIndex + 1}: ${this.def.name.toUpperCase()}`, 8, "#f6d860");
    this.tweens.add({ targets: banner, alpha: 0, delay: 2000, duration: 600, onComplete: () => banner.destroy() });

    this.scene.launch("Hud");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop("Hud"));
    this.startedAt = this.time.now;
    audio.playMusic(this.def.music ?? (`level${this.run.levelIndex + 1}` as MusicKey));
    cam.fadeIn(300);
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;
    const { input, audio } = getServices();
    const now = this.time.now;

    if (input.anyJustPressed("pause")) {
      audio.playSfx("pause");
      this.scene.launch("Pause");
      this.scene.pause();
      return;
    }

    for (const hero of this.heroes) {
      if (hero.isOut) continue;
      const p = hero.player;
      const jumped = hero.move(now, delta, {
        left: input.isDown(p, "left"),
        right: input.isDown(p, "right"),
        jumpHeld: input.isDown(p, "jump"),
        jumpPressed: input.justPressed(p, "jump"),
      });
      if (jumped) audio.playSfx("jump");
      else if (hero.landed) audio.playSfx("land");
      hero.rememberSafeGround(this.isGroundAt);
    }

    const cam = this.cameras.main;
    const worldWidth = this.level.cols * TILE_SIZE;
    const worldHeight = this.level.rows * TILE_SIZE;
    const active = this.heroes.filter((h) => !h.isOut);
    if (active.length > 0) {
      cam.scrollX = nextScrollX(cam.scrollX, Math.max(...active.map((h) => h.x)), cam.width, worldWidth);
      this.keepOnScreen(active, cam.scrollX, worldWidth);
    }

    for (const hero of active) {
      if (hero.y > worldHeight + TILE_SIZE) this.onFall(hero);
    }

    const cameraRight = cam.scrollX + cam.width;
    for (const hazard of [...this.hazards.getChildren()] as unknown as Hazard[]) {
      if (hazard.y > worldHeight + 64) {
        hazard.destroy();
        continue;
      }
      if (hazard.think(now, cam.scrollX, cameraRight, active, this.isGroundAt) === "bark") audio.playSfx("bark");
    }

    this.updateBackground(cam.scrollX);
    this.events.emit("hud", this.hudState(now));
  }

  private readonly isGroundAt = (x: number, y: number): boolean =>
    this.level.solid[Math.floor(y / TILE_SIZE)]?.[Math.floor(x / TILE_SIZE)] === true;

  /** Nobody can walk off the left of the screen. In co-op the camera pushes the trailing brother along. */
  private keepOnScreen(active: Hero[], scrollX: number, worldWidth: number): void {
    const leader = active.reduce((a, b) => (b.x > a.x ? b : a));
    for (const hero of active) {
      const body = hero.body;
      if (body.left < scrollX) {
        if (hero !== leader && body.blocked.right) {
          // Stuck behind a wall while being pushed: pop over next to the leader.
          const spot = this.spawnPoint(leader.x);
          hero.placeAt(spot.x, spot.y);
          continue;
        }
        hero.setX(hero.x + (scrollX - body.left));
        if (body.velocity.x < 0) body.setVelocityX(0);
      }
      const maxX = worldWidth - body.halfWidth;
      if (hero.x > maxX) hero.setX(maxX);
    }
  }

  /** A safe place to stand at or after `x` that's on screen. */
  private spawnPoint(x: number): { x: number; y: number } {
    const firstVisibleCol = Math.ceil(this.cameras.main.scrollX / TILE_SIZE) + 1;
    const col = Math.max(Math.floor(x / TILE_SIZE), firstVisibleCol);
    return feetOf(findSafeSpawn(this.level, col) ?? this.level.starts[1]);
  }

  private onBump(hero: Hero, hazard: Hazard): void {
    if (this.finished || hero.isOut || !hazard.harmful) return;
    if (hero.bump(this.time.now, hazard.x)) {
      getServices().audio.playSfx("hurt");
      this.checkHearts(hero);
    }
  }

  private onFall(hero: Hero): void {
    getServices().audio.playSfx("fall");
    hero.fall(this.time.now, this.spawnPoint(hero.lastSafe.x));
    this.checkHearts(hero);
  }

  private checkHearts(hero: Hero): void {
    if (hero.hearts > 0) return;
    const others = this.heroes.filter((h) => h !== hero && !h.isOut);
    if (others.length === 0) {
      this.restartLevel();
      return;
    }
    hero.knockOut();
    this.time.delayedCall(settings.respawnDelayMs, () => {
      const buddy = this.heroes.find((h) => h !== hero && !h.isOut);
      if (!buddy || this.finished) return;
      const spot = this.spawnPoint(buddy.x);
      hero.revive(spot.x, spot.y, 1, this.time.now);
      getServices().audio.playSfx("respawn");
    });
  }

  private restartLevel(): void {
    if (this.finished) return;
    this.finished = true;
    getServices().audio.playSfx("levelRestart");
    this.physics.pause();
    this.cameras.main.fadeOut(500);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ ...this.run }));
  }

  private onCollect(hero: Hero, sprite: Phaser.Physics.Arcade.Sprite): void {
    if (!sprite.active || hero.isOut) return;
    const def = sprite.getData("def") as ItemDef;
    sprite.destroy();
    this.score += def.score;
    if (def.key === "donut") this.donuts++;
    if (def.hearts > 0) hero.heal(def.hearts);
    getServices().audio.playSfx(def.sound);
  }

  private onGoal(): void {
    if (this.finished) return;
    this.finished = true;
    const { audio } = getServices();
    audio.stopMusic();
    audio.playSfx("goal");
    unlock(Math.min(levels.length, this.run.levelIndex + 2));
    this.physics.pause();
    const timeMs = this.time.now - this.startedAt;
    this.time.delayedCall(1200, () =>
      this.scene.start("LevelComplete", {
        mode: this.run.mode,
        levelIndex: this.run.levelIndex,
        score: this.score,
        donuts: this.donuts,
        timeMs,
      }),
    );
  }

  private hudState(now: number): HudState {
    return {
      score: this.score,
      donuts: this.donuts,
      timeMs: now - this.startedAt,
      heroes: this.heroes.map((h) => ({ name: h.def.name, hearts: h.hearts, out: h.isOut })),
      maxHearts: settings.maxHearts,
      muted: getServices().audio.muted,
    };
  }
}
```

- [ ] **Step 4: Verify**

Run: `npm test -w super-flynn-bros && npm run typecheck -w super-flynn-bros`
Expected: all pass, and tsc is clean.

Run: `npm run dev -w super-flynn-bros` and open `http://localhost:8001/?level=1`.
Expected:
- The "LEVEL 1: WALK TO SCHOOL" banner fades out after about 2 seconds.
- → runs Colin right with a two-frame walk. ↑/Space jumps. Holding jump goes higher than tapping it (about 4 tiles vs. about 1).
- The camera starts following once Colin passes about 40% of the screen, never scrolls back, and Colin can't walk off the left edge.
- Background layers scroll at different speeds (mountains slowest).
- Trash bins, cars, and brick steps are solid. Hazards are drawn but stand still and are harmless (stub).
- Walking into a pit (columns 36–37): Colin drops out of sight and reappears on safe ground before the pit. The HUD stub shows nothing yet.
- Falling into pits 3 times restarts the level (fade out, then back at the start).
- `?level=1&mode=ryan`: Ryan is shorter, runs faster, and jumps a bit lower but still clears every bin.
- `?debug=1`: hitboxes sit at the feet and are narrower than the drawings.

- [ ] **Step 5: Commit**

```bash
git add super-flynn-bros/src
git commit -m "Add heroes, tilemap levels, forward-only camera, and pits"
```

---

### Task 11: Hazards, items, hearts, and the HUD

**Files:**
- Modify: `super-flynn-bros/src/engine/Hazard.ts` (full version)
- Modify: `super-flynn-bros/src/scenes/HudScene.ts` (full version)

**Interfaces:**
- Consumes: `fitSprite`, `settings`, `HazardDef`, `formatTime`, `textStyle`, the `"heart"` and `"donut"` textures from Boot.
- Produces:
  - `class Hazard extends Phaser.Physics.Arcade.Sprite { readonly def; harmful: boolean; think(now, cameraLeft, cameraRight, targets: Target[], isGroundAt): "bark" | null }` with behaviors `patrol`, `slowWalk`, `rollAcross`, `bounce`, `chase`, and `toggle`.
  - `HudScene` (key `"Hud"`) and `interface HudState { score; donuts; timeMs; heroes: { name; hearts; out }[]; maxHearts; muted }`. It listens to `"hud"` on the Play scene's events.

- [ ] **Step 1: Write the Hazard**

`super-flynn-bros/src/engine/Hazard.ts`:
```ts
import Phaser from "phaser";
import { settings } from "../settings";
import { fitSprite } from "./sprites";
import type { HazardDef, Size } from "./types";

/** Anything a hazard might chase. */
export interface Target {
  x: number;
  isOut: boolean;
}

/**
 * A dog, neighbor, sprinkler... Behaviors come from hazards.ts. Hazards wait
 * ("sleep") until they're about to come on screen, like in the original Mario.
 */
export class Hazard extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private awake = false;
  private direction: -1 | 1;
  private spraying = true;
  private nextToggleAt = 0;
  private chasing = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: HazardDef,
    art: Size,
  ) {
    super(scene, x, y, def.key, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    fitSprite(this, art, def.hitbox);
    this.direction = def.direction ?? -1;
    if (def.behavior === "toggle") {
      this.body.setAllowGravity(false);
      this.body.setImmovable(true);
    }
  }

  /** Sprinklers only hurt while they're spraying. */
  get harmful(): boolean {
    return this.def.behavior !== "toggle" || this.spraying;
  }

  /** Runs every frame. Returns "bark" when a chasing dog spots a hero. */
  think(
    now: number,
    cameraLeft: number,
    cameraRight: number,
    targets: Target[],
    isGroundAt: (x: number, y: number) => boolean,
  ): "bark" | null {
    if (!this.awake) {
      if (this.x - this.displayWidth / 2 > cameraRight + 16) return null;
      this.awake = true;
      this.nextToggleAt = now + (this.def.onMs ?? 1500);
    }
    if (this.def.behavior === "rollAcross" && this.x < cameraLeft - 64) {
      this.destroy();
      return null;
    }

    let event: "bark" | null = null;
    const speed = this.def.speed ?? 40;
    const body = this.body;
    switch (this.def.behavior) {
      case "patrol":
        this.walk(speed, true, isGroundAt);
        break;
      case "slowWalk":
        this.walk(speed, false, isGroundAt);
        break;
      case "rollAcross":
        body.setVelocityX(this.direction * speed);
        break;
      case "bounce":
        if (body.blocked.left) this.direction = 1;
        else if (body.blocked.right) this.direction = -1;
        body.setVelocityX(this.direction * speed);
        if (body.blocked.down) body.setVelocityY(-Math.sqrt(2 * settings.gravity * (this.def.bounceHeight ?? 32)));
        break;
      case "chase": {
        const target = this.nearest(targets);
        const distance = target ? target.x - this.x : Number.POSITIVE_INFINITY;
        if (target && Math.abs(distance) < (this.def.range ?? 120)) {
          if (!this.chasing) event = "bark";
          this.chasing = true;
          this.direction = distance < 0 ? -1 : 1;
          body.setVelocityX(this.ledgeAhead(isGroundAt) ? 0 : this.direction * speed);
        } else {
          this.chasing = false;
          body.setVelocityX(0);
        }
        break;
      }
      case "toggle":
        if (now >= this.nextToggleAt) {
          this.spraying = !this.spraying;
          this.nextToggleAt = now + (this.spraying ? (this.def.onMs ?? 1500) : (this.def.offMs ?? 1500));
        }
        break;
    }

    this.setFlipX(this.direction > 0); // the drawings face left
    this.showFrame(now);
    return event;
  }

  private walk(speed: number, turnAtLedges: boolean, isGroundAt: (x: number, y: number) => boolean): void {
    const body = this.body;
    if (body.blocked.left) this.direction = 1;
    else if (body.blocked.right) this.direction = -1;
    else if (turnAtLedges && body.blocked.down && this.ledgeAhead(isGroundAt)) this.direction = this.direction === 1 ? -1 : 1;
    body.setVelocityX(this.direction * speed);
  }

  private ledgeAhead(isGroundAt: (x: number, y: number) => boolean): boolean {
    const aheadX = this.direction < 0 ? this.body.left - 2 : this.body.right + 2;
    return !isGroundAt(aheadX, this.body.bottom + 2);
  }

  private nearest(targets: Target[]): Target | null {
    let best: Target | null = null;
    for (const t of targets) {
      if (!t.isOut && (!best || Math.abs(t.x - this.x) < Math.abs(best.x - this.x))) best = t;
    }
    return best;
  }

  private showFrame(now: number): void {
    const count = this.def.frames.length;
    if (this.def.behavior === "toggle") this.setFrame(this.spraying ? Math.min(1, count - 1) : 0);
    else if (count > 1) this.setFrame(Math.floor(now / this.def.frameMs) % count);
  }
}
```

- [ ] **Step 2: Write the HUD**

`super-flynn-bros/src/scenes/HudScene.ts`:
```ts
import Phaser from "phaser";
import { formatTime, textStyle } from "../engine/ui";

export interface HudState {
  score: number;
  donuts: number;
  timeMs: number;
  heroes: { name: string; hearts: number; out: boolean }[];
  maxHearts: number;
  muted: boolean;
}

/** Hearts, donuts, time, and score, drawn on top of the level. */
export class HudScene extends Phaser.Scene {
  private last = "";
  private shown: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("Hud");
  }

  create(): void {
    this.last = "";
    this.shown = [];
    const play = this.scene.get("Play");
    play.events.on("hud", this.draw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => play.events.off("hud", this.draw, this));
  }

  private draw(state: HudState): void {
    // Only redraw when something you can see changed.
    const key = JSON.stringify({ ...state, timeMs: Math.floor(state.timeMs / 1000) });
    if (key === this.last) return;
    this.last = key;
    this.shown.forEach((thing) => thing.destroy());
    this.shown = [];
    const keep = <T extends Phaser.GameObjects.GameObject>(thing: T): T => {
      this.shown.push(thing);
      return thing;
    };

    state.heroes.forEach((hero, row) => {
      const y = 7 + row * 11;
      keep(this.add.text(4, y, hero.name.toUpperCase(), textStyle(8)).setOrigin(0, 0.5));
      for (let i = 0; i < state.maxHearts; i++) {
        keep(this.add.image(44 + i * 10, y, "heart", i < hero.hearts ? 0 : 1).setAlpha(hero.out ? 0.4 : 1));
      }
    });
    keep(this.add.image(200, 7, "donut", 0).setScale(0.8));
    keep(this.add.text(208, 7, `x${state.donuts}`, textStyle(8)).setOrigin(0, 0.5));
    keep(this.add.text(316, 7, formatTime(state.timeMs), textStyle(8)).setOrigin(1, 0.5));
    keep(this.add.text(316, 18, `SCORE ${state.score}`, textStyle(8)).setOrigin(1, 0.5));
    if (state.muted) keep(this.add.text(316, 29, "MUTED (M)", textStyle(8, "#d4f1ff")).setOrigin(1, 0.5));
  }
}
```

- [ ] **Step 3: Verify**

Run: `npm test -w super-flynn-bros && npm run typecheck -w super-flynn-bros`
Expected: all pass, and tsc is clean.

Run: `npm run dev -w super-flynn-bros`, then open `http://localhost:8001/?level=1`.
Expected:
- HUD: "COLIN" with 3 red hearts at top left, a donut icon with "x0" at the top middle, and time plus "SCORE 0" at top right.
- Donuts bob gently. Touching one removes it, adds 1 to the count and 10 to the score.
- The dog (column 25) walks back and forth between the two trash bins, legs animating and tail wagging, and flips to face where it's walking. Touching it: one heart turns grey, Colin is knocked back and blinks for about 1.5 s, and touching it again while blinking doesn't hurt.
- Sprinklers (column 43) switch between spraying and off about every 1.5 s, and only hurt while spraying.
- The burger (column 85) gives back a heart, never above 3.

Open `?level=2`: neighbors shuffle slowly and wave, and skateboarders zoom in from the right once they're near the screen and leave off the left.
Open `?level=3`: baseballs bounce along, and lawn mowers patrol.
Open `?level=4`: black dogs sit still until you're close, then chase you. Each one stops at pit edges.

- [ ] **Step 4: Commit**

```bash
git add super-flynn-bros/src
git commit -m "Add hazard behaviors, donuts and burgers, hearts, and the HUD"
```

---

### Task 12: Two-player co-op

**Files:**
- No new code. `PlayScene` (Task 10) already builds the co-op lineup, pushes the trailing brother along, warps him if he's stuck, and handles respawns. `useControls` (Task 9) already splits the controls. This task verifies co-op end to end and fixes anything that misbehaves.

**Interfaces:**
- Consumes: `useControls(input, "coop")`, `PlayScene.checkHearts`, `keepOnScreen`, `spawnPoint`.

- [ ] **Step 1: Verify co-op from the title screen**

Run: `npm run dev -w super-flynn-bros`, open `http://localhost:8001/`, press Space, and pick "2P CO-OP".
Expected:
- Colin (arrows + Space) and Ryan (A/D/W) move independently. The HUD shows both rows of hearts.
- The camera follows whoever is ahead. If Ryan stands still, the left edge of the screen pushes him along.
- Leaving Ryan behind a trash bin while Colin runs ahead: when the screen edge reaches Ryan and he's blocked, he pops over next to Colin.
- Run Ryan into the first dog until his hearts run out: he disappears, his hearts dim, and about 2 s later he reappears next to Colin with 1 heart and blinking.
- Run both brothers out of hearts: the level restarts.

- [ ] **Step 2: Verify the controls don't overlap in 1P**

Back on the title screen, pick "1P RYAN".
Expected: both arrows/Space and A/D/W control Ryan, and there's only one HUD row.

- [ ] **Step 3: Fix and commit only if something was wrong**

If a check failed, fix it in `src/scenes/PlayScene.ts` (co-op logic) or `src/engine/services.ts` (bindings), rerun Steps 1–2, then:
```bash
git add super-flynn-bros/src
git commit -m "Fix co-op <what was wrong>"
```
If everything passed, there's nothing to commit.

---

### Task 13: Goal, level complete, ending, level select, pause, and mute

**Files:**
- Modify: `super-flynn-bros/src/scenes/LevelCompleteScene.ts`, `super-flynn-bros/src/scenes/EndingScene.ts`, `super-flynn-bros/src/scenes/PauseScene.ts` (full versions)

**Interfaces:**
- Consumes: `getServices`, `useControls`, `toggleMute`, `addText`, `blink`, `formatTime`, `Menu`, `levels`, `createBackground`, `addPicture`, `tileFrame`.
- Produces:
  - `LevelCompleteScene` (key `"LevelComplete"`, data `LevelCompleteData { mode; levelIndex; score; donuts; timeMs }`). It starts `"Play"` for the next level, or `"Ending"` with `{ score }` after level 4.
  - `EndingScene` (key `"Ending"`). It returns to `"Title"`.
  - `PauseScene` (key `"Pause"`). It resumes `"Play"`, toggles mute, or quits to `"Title"`.

- [ ] **Step 1: Write the three scenes**

`super-flynn-bros/src/scenes/LevelCompleteScene.ts`:
```ts
import Phaser from "phaser";
import { getServices, type GameMode } from "../engine/services";
import { addText, blink, formatTime } from "../engine/ui";
import { levels } from "../levels";

export interface LevelCompleteData {
  mode: GameMode;
  levelIndex: number;
  score: number;
  donuts: number;
  timeMs: number;
}

/** "You made it!" Then on to the next level (or the ending). */
export class LevelCompleteScene extends Phaser.Scene {
  private result!: LevelCompleteData;
  private ready = false;
  private leaving = false;

  constructor() {
    super("LevelComplete");
  }

  create(result: LevelCompleteData): void {
    this.result = result;
    this.ready = false;
    this.leaving = false;
    const { width, height } = this.scale;
    const level = levels[result.levelIndex];
    this.add.rectangle(0, 0, width, height, 0x1a1c2c).setOrigin(0);
    addText(this, width / 2, 36, "YOU MADE IT!", 24, "#f6d860");
    addText(this, width / 2, 62, `LEVEL ${result.levelIndex + 1}: ${level.name.toUpperCase()}`, 8);
    addText(this, width / 2, 88, `DONUTS  x${result.donuts}`, 8);
    addText(this, width / 2, 100, `TIME    ${formatTime(result.timeMs)}`, 8);
    addText(this, width / 2, 112, `SCORE   ${result.score}`, 8);
    blink(this, addText(this, width / 2, 146, "PRESS START", 8));
    getServices().audio.playMusic("levelComplete");
    this.time.delayedCall(800, () => {
      this.ready = true;
    });
    this.time.delayedCall(8000, () => this.next());
  }

  update(): void {
    const { input } = getServices();
    if (this.ready && (input.anyJustPressed("confirm") || input.anyJustPressed("jump"))) this.next();
  }

  private next(): void {
    if (this.leaving) return;
    this.leaving = true;
    const { mode, levelIndex, score } = this.result;
    if (levelIndex + 1 < levels.length) this.scene.start("Play", { mode, levelIndex: levelIndex + 1, score });
    else this.scene.start("Ending", { score });
  }
}
```

`super-flynn-bros/src/scenes/EndingScene.ts`:
```ts
import Phaser from "phaser";
import { createBackground } from "../engine/backgrounds";
import { tileFrame } from "../engine/tileset";
import { addPicture } from "../engine/sprites";
import { getServices, useControls } from "../engine/services";
import { addText, blink } from "../engine/ui";

const GROUND_Y = 144;

/** Home sweet home! */
export class EndingScene extends Phaser.Scene {
  private ready = false;

  constructor() {
    super("Ending");
  }

  create({ score }: { score: number }): void {
    this.ready = false;
    const { width } = this.scale;
    const { tileset, artSizes, audio } = getServices();
    createBackground(this, "sunset", GROUND_Y)(0);
    this.add.tileSprite(0, GROUND_Y, width, 16, "tiles", tileFrame(tileset, "sidewalk", "art")).setOrigin(0);
    this.add.tileSprite(0, GROUND_Y + 16, width, 16, "tiles", tileFrame(tileset, "sidewalk", "under")).setOrigin(0);
    addPicture(this, "colin", 145, GROUND_Y, artSizes.get("colin")!);
    addPicture(this, "ryan", 175, GROUND_Y, artSizes.get("ryan")!).setFlipX(true);
    addText(this, width / 2, 32, "HOME SWEET HOME!", 24, "#f6d860");
    addText(this, width / 2, 58, `TOTAL SCORE ${score}`, 8);
    addText(this, width / 2, 70, "THANKS FOR PLAYING!", 8);
    blink(this, addText(this, width / 2, 92, "PRESS START", 8));
    audio.playMusic("ending");
    this.time.delayedCall(1000, () => {
      this.ready = true;
    });
  }

  update(): void {
    const { input } = getServices();
    if (this.ready && (input.anyJustPressed("confirm") || input.anyJustPressed("jump"))) {
      useControls(input, "menu");
      this.scene.start("Title");
    }
  }
}
```

`super-flynn-bros/src/scenes/PauseScene.ts`:
```ts
import Phaser from "phaser";
import { getServices, toggleMute, useControls } from "../engine/services";
import { addText, Menu } from "../engine/ui";

export class PauseScene extends Phaser.Scene {
  private menu!: Menu;

  constructor() {
    super("Pause");
  }

  create(): void {
    const { width, height } = this.scale;
    const { audio } = getServices();
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    addText(this, width / 2, 50, "PAUSED", 16, "#f6d860");
    this.menu = new Menu(
      this,
      width / 2,
      82,
      () => ["RESUME", `SOUND: ${getServices().audio.muted ? "OFF" : "ON"}`, "QUIT TO TITLE"],
      (i) => this.pick(i),
      (key) => audio.playSfx(key),
    );
  }

  update(): void {
    const { input } = getServices();
    if (input.anyJustPressed("pause")) {
      this.resume();
      return;
    }
    this.menu.update(input);
  }

  private pick(index: number): void {
    if (index === 0) this.resume();
    else if (index === 1) toggleMute();
    else this.quit();
  }

  private resume(): void {
    this.scene.resume("Play");
    this.scene.stop();
  }

  private quit(): void {
    this.scene.stop("Hud");
    this.scene.stop("Play");
    useControls(getServices().input, "menu");
    this.scene.start("Title");
  }
}
```

- [ ] **Step 2: Verify**

Run: `npm test -w super-flynn-bros && npm run typecheck -w super-flynn-bros && npm run build -w super-flynn-bros`
Expected: all pass, and the build succeeds.

Run: `npm run dev -w super-flynn-bros` and play through.
Expected:
- **Goal:** each level ends at a green street sign labelled SCHOOL / TRACK / BASEBALL / HOME. Touching it freezes play, then shows "YOU MADE IT!" with donuts, time, and score. Space (or waiting 8 s) starts the next level with the score carried over.
- **Ending:** after level 4, "HOME SWEET HOME!" over a sunset with both brothers and the total score. Space returns to the title.
- **Every level finishable:** play each of the 4 levels to the goal as Colin and as Ryan (use `?level=N&mode=ryan` to jump in).
- **Level select:** after finishing level 1, reload `/` and pick a mode: a level list appears with "1. WALK TO SCHOOL" and "2. WALK TO TRACK PRACTICE". Reload again and it's still there (localStorage).
- **Pause:** Esc during a level dims the screen and shows "PAUSED / RESUME / SOUND: ON / QUIT TO TITLE". Esc again or RESUME continues exactly where you left off. QUIT returns to the title.
- **Mute:** M anywhere (or SOUND in the pause menu) toggles mute. The HUD shows "MUTED (M)", and it's remembered after reloading.
- **Missing audio:** with `public/assets/sounds/` and `music/` empty, the console shows only the one `console.info` about missing files, with no errors.

- [ ] **Step 3: Commit**

```bash
git add super-flynn-bros/src
git commit -m "Add level complete, ending, level select, pause menu, and mute"
```

---

### Task 14: Docker, compose, READMEs, and the repo registry

**Files:**
- Create: `super-flynn-bros/Dockerfile`, `super-flynn-bros/nginx.conf`, `super-flynn-bros/README.md`
- Modify: `docker-compose.yml`, `README.md` (games table), `CLAUDE.md` (port registry), `docs/superpowers/specs/2026-10-18-super-flynn-bros-design.md` (record the two deviations)

**Interfaces:**
- Produces: compose service `super-flynn-bros` on host port 8001 → nginx :80.

- [ ] **Step 1: Docker files**

`super-flynn-bros/Dockerfile`:
```dockerfile
# Built from the repo root so the shared lib/ packages are available:
#   docker compose up --build super-flynn-bros
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build -w super-flynn-bros

FROM nginx:1.27-alpine
COPY super-flynn-bros/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/super-flynn-bros/dist /usr/share/nginx/html
```

`super-flynn-bros/nginx.conf`:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Missing files must be real 404s: that's how the game knows to skip a
  # sound or custom picture that hasn't been added yet.
  location / {
    try_files $uri $uri/ =404;
  }
}
```

Replace `docker-compose.yml` with:
```yaml
# Master compose file — one service per game (see CLAUDE.md §4).
# Add/update a service every time a game is created, renamed, or removed.
#
# Multiplayer server (add when the first game needs it):
#   server:
#     build:
#       context: .
#       dockerfile: server/Dockerfile
#     ports:
#       - "3000:3000"

services:
  super-flynn-bros:
    build:
      context: .
      dockerfile: super-flynn-bros/Dockerfile
    ports:
      - "8001:80"
    restart: unless-stopped
```

- [ ] **Step 2: Verify Docker**

Run: `docker compose up --build -d super-flynn-bros && sleep 3 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/ && curl -s -o /dev/null -w "%{http_code}\n" -I http://localhost:8001/assets/sounds/jump.mp3`
Expected: `200` then `404` (missing sound files are real 404s). Open `http://localhost:8001/`: the title screen works the same as in dev. Then run `docker compose down`.

- [ ] **Step 3: Game README**

`super-flynn-bros/README.md`:
````markdown
# 🏃 Super Flynn Bros 🏃

Colin and Ryan have places to be! Run, jump, and dodge your way through four
walks around Woodland Hills: to school, to track practice, to baseball
practice, and back home. Watch out for dogs, sprinklers, skateboarders, and
the neighbors who walk *really* slowly. Grab donuts on the way! 🍩

- **Players:** 1 (pick Colin or Ryan) or 2 (play together)
- **Multiplayer server:** not needed. Both players share one keyboard (or two gamepads).
- **Port:** 8001, at <http://localhost:8001>

---

## 🎮 How to Play

| | Player 1 (Colin) | Player 2 (Ryan) |
|---|---|---|
| Move | ← → | A / D |
| Jump | ↑ or Space | W |
| Gamepad | First gamepad | Second gamepad |

- **Esc** pauses. **M** turns the sound on and off.
- Hold jump longer to jump higher. Tap it for a little hop.
- **Colin** is taller and jumps higher. **Ryan** is shorter and runs faster.
- Each hero has **3 hearts**. Bumping a hazard or falling in a pit costs one.
- 🍩 **Donuts** are worth 10 points. 🍔 **Burgers** give back a heart.
- Run out of hearts and the level starts over. No game over, ever!
- **Co-op:** if one brother runs out of hearts, he pops back in next to the
  other one. The level only starts over if you're *both* out.
- Reach the sign at the end of the street to finish the level.

---

## 🔍 How It Works

A peek behind the curtain at what makes the game tick.

**Scenes.** The game is split into *scenes*, like scenes in a play. Each one
is a file in [`src/scenes/`](src/scenes/):

| Scene | What it does |
|---|---|
| `BootScene` | Starts the game: turns all the text drawings into pictures |
| `TitleScene` | The title screen and menus |
| `PlayScene` | The actual level: heroes, hazards, donuts, the camera |
| `HudScene` | Hearts, donuts, time, and score at the top of the screen |
| `PauseScene` | The pause menu |
| `LevelCompleteScene` | "YOU MADE IT!" |
| `EndingScene` | "HOME SWEET HOME!" |

**The game loop.** About 60 times every second, `PlayScene.update()` runs. It
reads the keyboard, moves the heroes, moves the camera, lets each hazard
decide what to do, and redraws everything. That's how every video game works:
check input, update, draw, repeat, really fast.

**Physics.** Gravity pulls everyone down a little every frame. Jumping just
means "go up really fast for a moment" and gravity does the rest. The game
uses Phaser's *Arcade Physics* to figure out when things bump into each other.

**Pixel art from letters.** Every character in the game is drawn with letters
in a text file. When the game starts, [`src/engine/pixelArt.ts`](src/engine/pixelArt.ts)
reads each letter, looks up its color, and paints one pixel. So the letter
`H` in Colin's drawing becomes a blonde pixel.

**Levels from letters.** Levels work the same way. [`src/engine/levelLoader.ts`](src/engine/levelLoader.ts)
reads a level map line by line. Each `#` becomes a sidewalk tile, each `D`
becomes a dog, each `o` becomes a donut.

**The background.** The sky, mountains, houses, and palm trees aren't
pictures. They're drawn by code in [`src/engine/backgrounds.ts`](src/engine/backgrounds.ts),
using the colors in [`src/levels/themes.ts`](src/levels/themes.ts). They're in
layers that scroll at different speeds (far things slower), which makes the
world look deep. That trick is called *parallax*.

---

## 🛠️ Make It Your Own

### 1. Getting started (with a grown-up)

From the top folder of the arcade, run:

```bash
npm install
npm run dev -w super-flynn-bros
```

Open <http://localhost:8001>. Now open any file in `src/` in a text editor
(like VS Code). When you save a change, the game reloads with it!

> **Shortcut:** add `?level=3` to the address (like `http://localhost:8001/?level=3`)
> to jump straight into level 3. Add `&mode=ryan` or `&mode=coop` to pick who plays.
> `?debug=1` shows everyone's hitboxes as boxes.

### 2. Easy tweaks

These are all in [`src/settings.ts`](src/settings.ts):

| Setting | What it does | Try |
|---|---|---|
| `gravity` | How hard you get pulled down | `400` for moon jumps! |
| `hearts` | Hearts you start with | `10` for easy mode |
| `maxHearts` | Most hearts you can have | `10` |
| `deceleration` | How fast you stop | `200` for slippery ice |
| `knockback` | How hard bumps push you | `300` to go flying |
| `coyoteTimeMs` | Forgiving jumps off ledges | `0` to see how hard it gets |

And in [`src/heroes.ts`](src/heroes.ts), each hero has `runSpeed` and `jumpPower`.

In [`src/hazards.ts`](src/hazards.ts), every hazard has a `speed`. Make the
dogs super slow (`10`) or super fast (`150`)!

### 3. Make the hero look like you

**Option A: change the colors.** Open [`src/heroes.ts`](src/heroes.ts). Each
hero has a `colors` list:

```ts
H: "#f6d860", // hair (blonde)
T: "#3d7be0", // shirt
```

Change the color codes to yours. Search "hex color picker" to find the code
for any color.

**Option B: redraw them.** The rows of letters below `colors` are the drawing.
Each letter is one pixel and `.` is see-through. Change letters to change the
picture. **Keep every row the same length!** (If a row is too short or uses a
letter with no color, the game tells you in the browser console and shows pink.)

**Option C: use your own picture.** Draw a picture (or crop a photo) and save
it as a PNG in `public/assets/`:

| Hero | File name | Size to aim for |
|---|---|---|
| Colin | `colin.png` | 16 wide × 32 tall (or any size that shape, like 64 × 128) |
| Ryan | `ryan.png` | 16 wide × 24 tall (or 64 × 96) |

Use a see-through background if you can. You can also make a *strip* of 4
pictures side by side (standing, walking, walking, jumping). The game spots a
strip by its shape. Bigger pictures get shrunk to fit.

This works for hazards and items too: `dog.png`, `neighbor.png`, `donut.png`,
`burger.png`, and so on (the name is the `key` in the file).

### 4. Add a custom enemy, item, or level

**A new hazard:** open [`src/hazards.ts`](src/hazards.ts) and copy the whole
`dog` block. Then:

1. Change `key` to something new, like `"goose"`.
2. Change `mapChar` to a letter nobody uses yet, like `"Q"`.
3. Draw it in `frames` and set its `colors`.
4. Pick a `behavior`: `"patrol"`, `"slowWalk"`, `"rollAcross"`, `"bounce"`,
   `"chase"`, or `"toggle"`.
5. Add it to the `hazards` list at the bottom of the file.
6. Put a `Q` in a level map!

**A new item:** same idea in [`src/items.ts`](src/items.ts). Set `score` for
points and `hearts` for health.

**Change a level:** open a level in [`src/levels/`](src/levels/). Each line is
one row; each letter is one tile:

```
"  1 2         B    D    B",
"#########################",
```

That's Colin (`1`) and Ryan (`2`) on the sidewalk, with a dog (`D`) between
two trash bins (`B`). The list of letters is at the top of each level file.
Keep pits 3 tiles wide or less so you can jump them.

**A brand-new level:** copy `level4-home.ts` to `level5-park.ts`, rename
`level4` to `level5` inside it, then add it to the list in
[`src/levels/index.ts`](src/levels/index.ts).

### 5. Make your own sounds

The game has spots for sounds but comes with none, so it's quiet until you
add some! Record a sound on a phone or computer, save it as `.mp3`, and put it
in `public/assets/sounds/` with one of these names:

`jump` `land` `donut` `burger` `hurt` `fall` `respawn` `level-restart` `goal`
`menu-move` `menu-select` `pause` `bark`

Music goes in `public/assets/music/`: `title` `level1` `level2` `level3`
`level4` `level-complete` `ending`.

The full list, with volumes, is in [`src/sounds.ts`](src/sounds.ts). The
browser console shows which ones are still missing.

### 6. Challenges 🏆

- **Can you make a night level?** Copy the `sunset` theme in
  [`src/levels/themes.ts`](src/levels/themes.ts), make it dark blue, and use it.
- **Can you give Ryan a double jump?** (Hint: look at how `move` in
  [`src/engine/Hero.ts`](src/engine/Hero.ts) decides when a jump is allowed.)
- **Can you make donuts give back a heart every 10 donuts?** (Hint: look at
  `onCollect` in [`src/scenes/PlayScene.ts`](src/scenes/PlayScene.ts).)
- **Can you make the dogs get faster as your score goes up?** (Hint: look for
  `const speed` in [`src/engine/Hazard.ts`](src/engine/Hazard.ts).)
- **Can you find the 🛠️ TRY THIS comments?** There's one in almost every file
  you're meant to change.

### 7. Oops, I broke it

That's OK. Everybody breaks things, and it's how you learn!

- **The game shows a pink blob or a yellow `?` block:** you used a letter the
  game doesn't know. Press **F12** and look at the *Console* tab: it says
  exactly which letter and where.
- **A setting is way off:** the game fixes it and says so in the console.
- **Put a file back the way it was:** ask a grown-up to run
  `git checkout -- super-flynn-bros/src/settings.ts` (use the file you changed).
- **Put everything back:** `git checkout -- super-flynn-bros/`

---

## 🧰 For Grown-Ups

- `npm run dev -w super-flynn-bros`: dev server with hot reload on port 8001
- `npm test -w super-flynn-bros`: unit tests (art, level maps, engine logic)
- `npm run build -w super-flynn-bros`: type-check and production build into `dist/`
- `docker compose up --build super-flynn-bros`: serve the production build on port 8001
- Saves (unlocked levels, mute) live in the browser's `localStorage` under
  `super-flynn-bros:progress`. Clearing site data resets them.
- Optional files (custom PNGs, sounds, music) are found at startup with `HEAD`
  requests, and missing ones are skipped. The network panel shows the 404s for
  files that haven't been added. That's expected.
- Kid-editable files: `src/settings.ts`, `src/heroes.ts`, `src/hazards.ts`,
  `src/items.ts`, `src/tiles.ts`, `src/sounds.ts`, `src/controls.ts`,
  `src/levels/*`. Everything in `src/engine/` and `src/scenes/` is the machinery.
- Shared library used: [`lib/input`](../lib/input) (keyboard + gamepad).
- **Asset credits:** all art is drawn in code in this repo. No third-party assets.
````

- [ ] **Step 4: Root README, CLAUDE.md, and spec updates**

In `README.md`, replace the placeholder row of the games table:
```markdown
| _Coming soon…_ | The first cabinet is still being built! 🔧 | | |
```
with:
```markdown
| [**Super Flynn Bros**](super-flynn-bros/) 🏃 | An 8-bit side scroller: help Colin and Ryan walk to school, practice, and back home through Woodland Hills. Dodge dogs and sprinklers, grab donuts! 🍩 | 1–2 (co-op) | Make the hero look like you, change gravity for moon jumps, invent new hazards, build your own street |
```

In `CLAUDE.md` §4 Port Registry, replace:
```markdown
| _(next game)_ | 8001 | Games get 8001, 8002, … in order |
```
with:
```markdown
| super-flynn-bros | 8001 | 8-bit side scroller (1–2 players, local) |
| _(next game)_ | 8002 | Games get 8001, 8002, … in order |
```
And add to the top of the Amendment Log:
```markdown
- 2026-10-18 — First game: Super Flynn Bros on port 8001. Added the root
  npm workspace (`package.json`, `tsconfig.base.json`) and the first shared
  library, `lib/input` (keyboard + gamepad).
```

In the spec `docs/superpowers/specs/2026-10-18-super-flynn-bros-design.md`:
- In **Camera**, change "Logical resolution **320×180**" to "Logical resolution **320×176** (exactly 11 tile rows)".
- In **Level maps**, replace the sentence starting "A shared legend (in `src/levels/legend.ts`)" with: "Each tile, hazard, and item declares its own `mapChar` in `tiles.ts`, `hazards.ts`, or `items.ts`. The markers `1`, `2`, `G` are fixed in `engine/levelLoader.ts`. Unknown characters render as a "?" block with a console warning."
- In **Code Structure**, replace the `legend.ts` line with `tiles.ts` under `src/` (`# 🛠️ tiles + goal sign art`).

- [ ] **Step 5: Final verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: every workspace passes, and the build succeeds.

- [ ] **Step 6: Commit**

```bash
git add super-flynn-bros/Dockerfile super-flynn-bros/nginx.conf super-flynn-bros/README.md docker-compose.yml README.md CLAUDE.md docs
git commit -m "Add Docker setup and docs for Super Flynn Bros"
```
