# Flynn Arcade Poster Front Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the arcade's fixed 320 × 176 Phaser select screen with a full-window, responsive HTML/CSS "gig poster" where games pop in color from a monochrome background, with screenshots that switch to looping clips when selected.

**Architecture:** `arcade/` becomes a plain Vite + TypeScript DOM page: pure logic modules (selection, attract timing, media lookup, settings), a small DOM view (`src/poster/`), and a controller that wires `lib/input`, `lib/audio` (new HTML audio backend) and the view together. Each game ships optional `arcade-media/screenshot.png` + `clip.mp4`, made by a dev-only Playwright + ffmpeg capture script driven by an optional `capture` recipe in its `arcade.ts`.

**Tech Stack:** TypeScript strict, Vite 7, Vitest 5 (node environment), npm workspaces, `lib/input`, `lib/audio`, `lib/arcade`, `lib/settings`; Playwright (root dev dependency, capture only) and `ffmpeg` (on the owner's machine).

**Spec:** `docs/superpowers/specs/2026-10-29-arcade-poster-design.md` (mockup: `docs/superpowers/specs/2026-10-29-arcade-poster-mockups.html`, direction A)

## Global Constraints

- Poster chrome is monochrome: background `#18171b`, ink `#efe6cf`, selection highlight `#ffd23b`. No per-game colors anywhere on the poster.
- All poster text is crisp vector type (Archivo Black for logo/titles, Space Mono for everything else, both served from `arcade/public/assets/fonts/` with their OFL licenses, system-font fallbacks). Only game pictures are pixel art (`image-rendering: pixelated`).
- Fills the whole window with no letterboxing; desktop first, responsive down to a 390px-wide phone; no horizontal page scroll.
- `prefers-reduced-motion`: tickers and the blinking cursor stop, and clips are never played (screenshots instead).
- Picture fallback chain per game: clip (selected only) → screenshot → 32 × 24 `screenArt`.
- Clips: MP4 H.264, silent, 5–8 s, under ~1.5 MB; screenshots PNG under ~300 KB.
- No Phaser and no UI framework in `arcade/`. Games stay Phaser.
- Kid-file test rule (CLAUDE.md §7): tests never pin values kids are invited to change in `settings.ts`; logic is tested with fixtures.
- Forgiving: a missing media file, an old `arcade.ts` with `colors`, a bad `tagline`, a bad color in `settings.ts`, or a font that fails must never blank the page.
- Capture is dev-only: never in CI, `npm test`, or the Docker build; its outputs are committed.
- Commits follow the repo memory: commit freely; never push or merge to `main` without the owner's go-ahead.

## Review Focus

1. **A clip that won't load or play** (missing file, codec, autoplay refused): the panel must quietly show the screenshot, never a black box. (Task 3 `pictureFor` test, Task 5 `onClipFailed`.)
2. **Resizing the window or rotating a phone** changes the column count: up/down must use the current column count and the selected panel must stay fully visible. (Task 3 `moveSelection` tests; Task 5 reads `view.columns()` on every key press.)
3. **An old or kid-edited `arcade.ts`** (still has `colors`, a 200-letter `tagline`, a broken `capture`): the game still appears; only the bad field is dropped with a console note. (Task 1 tests.)
4. **Back button from a game** (bfcache): the arcade must reload fresh, not freeze mid "GAME START!". (Task 5 keeps the `pageshow` reload.)
5. **Bad colors or numbers in `settings.ts`** (e.g. `ink: "red"`, `tickerSecondsPerLoop: -3`): fall back to defaults / clamp, page still renders. (Task 2 tests.)

---

## File Structure

```
lib/arcade/src/index.ts           GameInfo: colors removed, tagline + capture added; forgiving validation
lib/audio/src/htmlAudio.ts        NEW: AudioBackend on HTMLAudioElement (no Phaser)
super-flynn-bros/arcade.ts        colors removed; tagline + capture recipe
flynn-family-fighters/arcade.ts   same
<game>/arcade-media/              NEW: screenshot.png + clip.mp4 (made by capture)

arcade/
  index.html                      poster skeleton mount + stylesheet
  public/assets/fonts/            NEW: ArchivoBlack-Regular.ttf, SpaceMono-Regular.ttf, SpaceMono-Bold.ttf, OFL.txt
  src/settings.ts                 rewritten for the poster (kid file)
  src/limits.ts                   new ranges
  src/colors.ts                   NEW: safeColor
  src/ticker.ts                   NEW: tickerLine
  src/badges.ts                   playerLabel (replaces playerBadges)
  src/selection.ts                + moveSelection, keeps buildSlots/wrap/initialIndex/nextAttractIndex
  src/attract.ts                  NEW: AttractClock
  src/media.ts                    NEW: mediaByGame, pictureFor
  src/screenArt.ts                NEW: drawScreenArt (canvas)
  src/controls.ts                 + up/down
  src/controller.ts               NEW: ArcadeController (input, attract, start sequence, mute)
  src/poster/poster.css           NEW: all poster styles
  src/poster/poster.ts            NEW: buildPoster → PosterView
  src/poster/panel.ts             NEW: Panel (still/clip switching)
  src/main.ts                     rewritten: boot without Phaser
  src/games.ts, storage.ts, sounds.ts   kept
  src/scene/*, src/cabinet.ts, src/layout.ts   DELETED
  capture/capture.ts              NEW: dev-only capture script
  tests/*.test.ts                 updated / new
```

---

### Task 1: Game info contract: drop colors, add tagline and capture

**Files:**
- Modify: `lib/arcade/src/index.ts`
- Modify: `super-flynn-bros/arcade.ts`, `flynn-family-fighters/arcade.ts`
- Modify: `super-flynn-bros/README.md:243` (and any other "cabinet colors" mention found by `grep -rn -i "cabinet colors\|colors: { primary" --include=*.md --include=*.ts . | grep -v node_modules`)
- Modify: `arcade/src/badges.ts` and any arcade code reading `game.colors` just enough to keep `npm run typecheck -w arcade` green (the Phaser scene is deleted in Task 4; until then, replace `game.colors.*` reads with `"#9aa3b5"` / `"#d6dbe6"`)
- Test: `lib/arcade/tests/arcade.test.ts`

**Interfaces:**
- Produces (in `@web-games/arcade`):
  ```ts
  export interface CaptureStep { hold?: string[]; press?: string[]; ms: number } // KeyboardEvent codes
  export interface CapturePlan { query?: string; warmupMs?: number; clipMs?: number; steps?: CaptureStep[] }
  export interface GameInfo { id; title; blurb; tagline?: string; players; devPort; order?; screenArt; capture?: CapturePlan }
  export const TAGLINE_MAX = 40;
  ```
  `validateGames` returns cleaned copies: no `colors` key, `tagline` only if valid, `capture` only if valid.

- [ ] **Step 1: Write the failing tests** in `lib/arcade/tests/arcade.test.ts` (update the fixture to drop `colors`):
  - `it("still accepts an old arcade.ts that has cabinet colors, and drops them")`: registration with `colors: { primary: "#000000", secondary: "#ffffff" }` → one game, `expect("colors" in games[0]).toBe(false)`, no warning.
  - `it("keeps a short tagline")`: `tagline: "Dodge dogs, grab donuts"` → kept.
  - `it("drops a tagline that is too long or not text, with a note")`: `"x".repeat(TAGLINE_MAX + 1)` and `42` → game kept, `tagline` undefined, `warn` called with a message containing `"tagline"`.
  - `it("drops a broken capture recipe, with a note")`: `capture: { steps: "go right" }` → game kept, `capture` undefined, warned; a valid `capture: { query: "?level=1", steps: [{ hold: ["ArrowRight"], ms: 500 }] }` is kept.
- [ ] **Step 2: Run** `npm test -w @web-games/arcade`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** in `lib/arcade/src/index.ts`: remove `colors` from `GameInfo` and from `problemWith`; add the types above; in `validateGames`, build the returned game as `{ ...info }` minus `colors`, then check `tagline` (string, 1..TAGLINE_MAX after trim) and `capture` (object; `query` string if present; `warmupMs`/`clipMs` positive numbers if present; `steps` array of objects with numeric `ms > 0` and string-array `hold`/`press`), deleting the bad one and warning `🕹️ <folder>/arcade.ts: <field> ... Leaving it out.`
- [ ] **Step 4: Update both games' `arcade.ts`:** delete `colors` and its TRY THIS mention; add `tagline: "Dodge dogs, grab donuts!"` (Super Flynn Bros) and `tagline: "Pick a Flynn, throw fireballs!"` (Fighters) with a friendly comment (`// The short line under the title on the arcade poster (up to 40 letters).`). Add capture recipes:
  - Fighters: `capture: { query: "?fight=colin,ryan&cpu2", warmupMs: 6000, clipMs: 7000 }` (the computer plays both sides).
  - Super Flynn Bros: `capture: { query: "?level=1&mode=colin", warmupMs: 2500, clipMs: 7000, steps: [{ hold: ["ArrowRight"], ms: 900 }, { hold: ["ArrowRight"], press: ["Space"], ms: 700 }, { hold: ["ArrowRight"], ms: 1200 }, { press: ["Space"], ms: 600 }, { hold: ["ArrowRight"], press: ["Space"], ms: 900 }] }` (steps repeat until `clipMs` runs out; tune by watching the clip).
  Comment the `capture` block as "how the arcade's capture script plays this game to record its clip".
- [ ] **Step 5: Fix the docs** found by the grep (Super Flynn Bros README line 243 → "blurb, tagline, and the picture on its screen").
- [ ] **Step 6: Run** `npm test && npm run typecheck` from the repo root. Expected: all PASS.
- [ ] **Step 7: Commit** `feat(arcade): drop cabinet colors, add tagline and capture recipes to GameInfo`.

---

### Task 2: HTML audio backend, poster settings, and small pure helpers

**Files:**
- Create: `lib/audio/src/htmlAudio.ts`; Modify: `lib/audio/src/index.ts` (export it)
- Test: `lib/audio/tests/htmlAudio.test.ts`
- Rewrite: `arcade/src/settings.ts`, `arcade/src/limits.ts`
- Create: `arcade/src/colors.ts`, `arcade/src/ticker.ts`; Modify: `arcade/src/badges.ts`
- Test: `arcade/tests/arcade.test.ts` (replace the `settings.ts` and `player badges` blocks; add `colors`, `ticker` blocks)

**Interfaces:**
- Produces:
  ```ts
  // lib/audio
  export type AudioFactory = (url: string) => { volume: number; loop: boolean; play(): Promise<void> | void; pause(): void; addEventListener(type: "ended" | "error", fn: () => void): void };
  export function htmlAudioBackend(files: ReadonlyMap<string, string[]>, make?: AudioFactory): AudioBackend; // default make = (url) => new Audio(url)
  // arcade
  export function safeColor(value: unknown, fallback: string): string;           // src/colors.ts
  export function tickerLine(messages: readonly string[], gameCount: number): string; // src/ticker.ts
  export function playerLabel(players: { min: number; max: number; coop: boolean }): string; // src/badges.ts
  export const logoLines: string[]; export const tickerTop: string[]; export const tickerBottom: string[];
  export const colors: { background: string; ink: string; highlight: string };
  export const settings: { tickerSecondsPerLoop; attractDelayMs; attractStepMs; comingSoonPanels; typeLettersPerSecond; musicVolume; sfxVolume; showScanlines: boolean };
  ```

- [ ] **Step 1: Write failing tests.**
  - `htmlAudio.test.ts` with a fake factory recording created URLs: `play("sfx:coin", {volume: .5, loop: false})` uses the first URL from the map and sets volume/loop; an unknown key returns `null`; a `play()` that rejects or throws does not throw out of `play` and still returns a handle; `stop()` pauses; `error` on the first URL makes the *next* `play` of that key use the second URL (the `.ogg` backup).
  - `safeColor("#AbCdEf", "#000000") === "#AbCdEf"`; `safeColor("red", "#18171b") === "#18171b"`; `safeColor(undefined, …)` → fallback.
  - `tickerLine(["INSERT COIN", "{games} ON THE FLOOR"], 2) === "INSERT COIN ✦ 2 GAMES ON THE FLOOR ✦ "`; with `1` → `"1 GAME ON THE FLOOR"`; with `[]` → `""`.
  - `playerLabel({min:1,max:2,coop:true}) === "1–2P CO-OP"`; `{min:1,max:2,coop:false}` → `"1–2P VS"`; `{min:1,max:1,coop:false}` → `"1P"`.
  - Settings block (shape only, per §7): every key in `settingLimits` exists in `mySettings` and vice versa for numbers; `settings` values are inside their limits; `logoLines`, `tickerTop`, `tickerBottom` are non-empty string arrays.
- [ ] **Step 2: Run** `npm test -w @web-games/audio && npm test -w arcade`. Expected: new tests FAIL.
- [ ] **Step 3: Implement.**
  - `htmlAudioBackend`: per cache key remember which URL index works; on `error` advance it; `play` creates a fresh element per call (sound effects may overlap); `PlayingSound.setVolume` clamps to 0..1.
  - `settings.ts`: keep the header style and per-value friendly comments with ranges and `// 🛠️ TRY THIS:` hints. Starting values: `logoLines = ["FLYNN", "ARCADE"]`; `tickerTop = ["INSERT COIN", "{games} ON THE FLOOR", "PRESS START", "FREE PLAY", "THE FLYNN ARCADE"]`; `tickerBottom = ["← → CHOOSE", "ENTER TO PLAY", "M FOR SOUND"]`; `colors = { background: "#18171b", ink: "#efe6cf", highlight: "#ffd23b" }`; `tickerSecondsPerLoop: 22`, `attractDelayMs: 30000`, `attractStepMs: 6000`, `comingSoonPanels: 1`, `typeLettersPerSecond: 40`, `musicVolume: 0.5`, `sfxVolume: 0.7`, `showScanlines: true`. Export `settings = clampSettings(mySettings, settingLimits)`. Remove sunburst/speed-line/sparkle/floor/logo-gradient settings.
  - `limits.ts`: `tickerSecondsPerLoop 5–120`, `attractDelayMs 5000–300000`, `attractStepMs 2000–15000`, `comingSoonPanels 0–5`, `typeLettersPerSecond 5–200`, `musicVolume 0–1`, `sfxVolume 0–1`.
- [ ] **Step 4: Run** the same commands. Expected: PASS. (`typecheck -w arcade` may still fail on the old Phaser scene's settings reads: replace those reads with literals or delete the dead lines; the scene goes away in Task 4.)
- [ ] **Step 5: Commit** `feat(arcade): HTML audio backend, poster settings and helpers`.

---

### Task 3: Selection, attract clock, and game media

**Files:**
- Modify: `arcade/src/selection.ts`
- Create: `arcade/src/attract.ts`, `arcade/src/media.ts`, `arcade/src/screenArt.ts`
- Test: `arcade/tests/arcade.test.ts` (new `selection`, `attract`, `media`, `screenArt` blocks; keep existing selection tests, renaming "cabinet" wording to "panel")

**Interfaces:**
- Consumes: `Slot`, `buildSlots`, `wrap`, `initialIndex`, `nextAttractIndex` (existing in `selection.ts`).
- Produces:
  ```ts
  export type Direction = "left" | "right" | "up" | "down";
  export function moveSelection(index: number, dir: Direction, columns: number, count: number): number;
  export class AttractClock { constructor(delayMs: number, stepMs: number, now: number); get active(): boolean; poke(now: number): void; tick(now: number): boolean } // tick → true when attract should advance one panel
  export interface GameMedia { screenshot?: string; clip?: string }
  export function mediaByGame(urls: Record<string, string>): Map<string, GameMedia>; // keys like "../../super-flynn-bros/arcade-media/clip.mp4"
  export type Picture = "clip" | "screenshot" | "art";
  export function pictureFor(media: GameMedia | undefined, o: { selected: boolean; reducedMotion: boolean; clipFailed: boolean }): Picture;
  export interface PixelTarget { fillStyle: string | CanvasGradient | CanvasPattern; fillRect(x: number, y: number, w: number, h: number): void }
  export function drawScreenArt(ctx: PixelTarget, art: GameInfo["screenArt"]): { width: number; height: number };
  ```

- [ ] **Step 1: Write failing tests.**
  - `moveSelection`: count 5, columns 3: `right` from 4 → 0 (wraps), `left` from 0 → 4; `down` from 1 → 4; `down` from 2 → 2 (no panel below: stay); `up` from 4 → 1; `up` from 0 → 0; columns 1: `down` from 0 → 1; columns ≤ 0 treated as 1; count 0 → 0.
  - `AttractClock(30000, 6000, 0)`: `tick(29999) === false && !active`; `tick(30001) === true && active` (first advance immediately); `tick(30002) === false`; `tick(36001) === true`; `poke(40000)` → `!active`, and `tick(69999) === false`.
  - `mediaByGame({"../../a/arcade-media/screenshot.png": "/s.png", "../../a/arcade-media/clip.mp4": "/c.mp4", "../../b/arcade-media/notes.txt": "/n"})` → `a` has both, `b` absent.
  - `pictureFor`: selected + clip → `"clip"`; not selected → `"screenshot"`; reducedMotion → `"screenshot"`; clipFailed → `"screenshot"`; no screenshot and not playing clip → `"art"`; `undefined` media → `"art"`.
  - `drawScreenArt` with a fake ctx: 2 rows `["AB", "B"]`, colors `{A: "#ff0000", B: "#00ff00"}` → 3 `fillRect` calls of size 1, returns `{ width: 2, height: 2 }`; an unknown letter is skipped.
- [ ] **Step 2: Run** `npm test -w arcade`. Expected: FAIL.
- [ ] **Step 3: Implement** in the listed files. `mediaByGame` takes the folder name as the path segment before `arcade-media` and recognizes exactly `screenshot.png` and `clip.mp4`.
- [ ] **Step 4: Run** `npm test -w arcade`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(arcade): 2D selection, attract clock, media lookup`.

---

### Task 4: The poster page (DOM + CSS), Phaser removed

**Files:**
- Rewrite: `arcade/index.html`, `arcade/src/main.ts`
- Create: `arcade/src/poster/poster.css`, `arcade/src/poster/poster.ts`, `arcade/src/poster/panel.ts`
- Create: `arcade/public/assets/fonts/ArchivoBlack-Regular.ttf`, `SpaceMono-Regular.ttf`, `SpaceMono-Bold.ttf`, `OFL.txt` (from `github.com/google/fonts` `ofl/archivoblack/` and `ofl/spacemono/`; both OFL 1.1)
- Delete: `arcade/src/scene/` (all), `arcade/src/cabinet.ts`, `arcade/src/layout.ts`, and their tests in `arcade/tests/arcade.test.ts`
- Modify: `arcade/package.json` (remove `phaser`, `@web-games/pixel-art`), `arcade/vite.config.ts` (drop the Phaser chunk-size comment/limit)

**Interfaces:**
- Consumes: Task 1 `GameInfo`; Task 2 `settings`, `colors`, `logoLines`, `tickerTop`, `tickerBottom`, `safeColor`, `tickerLine`, `playerLabel`; Task 3 `Slot`, `GameMedia`, `pictureFor`, `drawScreenArt`.
- Produces:
  ```ts
  export interface PosterData { slots: Slot[]; media: Map<string, GameMedia>; gameCount: number; reducedMotion: boolean }
  export interface PosterView {
    select(index: number): void;          // highlight, info bar, clip on/off, scrollIntoView({ block: "nearest", inline: "nearest" })
    columns(): number;                     // current grid column count, read from the live layout
    onHover(fn: (index: number) => void): void;
    onClick(fn: (index: number) => void): void;
    setCredit(text: string): void;         // stamp box line: "CREDITS ∞" → "CREDIT 1"
    notYet(index: number): void;           // short shake on a coming-soon panel
    showGameStart(): void;                 // "GAME START!" moment
    fadeOut(ms: number): Promise<void>;
  }
  export function buildPoster(root: HTMLElement, data: PosterData): PosterView; // src/poster/poster.ts
  export class Panel { readonly el: HTMLElement; constructor(slot: Slot, number: number, media: GameMedia | undefined, reducedMotion: boolean); setSelected(on: boolean): void; onClipFailed(): void }
  ```

- [ ] **Step 1: Build the page** to match mockup A (open `docs/superpowers/specs/2026-10-29-arcade-poster-mockups.html` and copy its `.a` styles as the starting point, converting `cqw` units to `vw`/`clamp()` sizes for a full window):
  - Body is a full-viewport grid (`min-height: 100dvh`) with rows: top ticker, logo row (logo lines from `logoLines` + stamp box "EST. 2026 / THE FLYNN ARCADE / CREDITS ∞"), info bar (PLAYER SELECT · blinking ▮ · typed title + blurb · `playerLabel` · live clock), panel grid (`1fr`), bottom ticker.
  - Colors come from CSS custom properties `--bg`, `--ink`, `--hi` set from `safeColor(colors.x, default)`; ticker speed from `--ticker-s`; scanlines layer only when `showScanlines`.
  - Logo is sized with `clamp()` so "ARCADE" fills the logo column at any width and never overflows.
  - Panel grid: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr))`; the picture area keeps 16:9 with the image `object-fit: contain` on a near-black fill; screenArt canvas uses `image-rendering: pixelated`. On short wide windows the panel row fits without page scroll; when panels wrap past the window the page scrolls vertically.
  - Panel: header "GAME 01" + `playerLabel`, picture, footer title + `tagline` (omitted when absent). Coming-soon panels: hatched picture "COMING SOON", title "???", tagline "Your game here".
  - `Panel` shows the still (`<img>` screenshot or screenArt `<canvas>`) and, when selected and `pictureFor` says `"clip"`, a `<video muted loop playsinline preload="none">` laid over it; `video.play()` rejection or an `error` event calls `onClipFailed()` → back to the still for the rest of the session.
  - Selected panel: `--hi` outline, `--hi` header background, "▶" after the title.
  - `@media (prefers-reduced-motion: reduce)`: tickers and blink stop.
  - `@font-face` for the three font files with `font-display: swap`; stacks `"Archivo Black", "Arial Black", system-ui, sans-serif` and `"Space Mono", ui-monospace, Menlo, monospace`.
  - `showGameStart()`: a full-poster "GAME START!" stamp in Archivo Black, ink on `--hi`, scaling in over 400 ms, with the selected panel flashing; monochrome + yellow only.
- [ ] **Step 2: Rewrite `main.ts`** to: keep the `pageshow` persisted → reload handler; load games (`loadGames`), media (`mediaByGame(import.meta.glob("../../*/arcade-media/*.{png,mp4}", { eager: true, query: "?url", import: "default" }))`), audio files, mute setting; read `matchMedia("(prefers-reduced-motion: reduce)").matches`; `buildPoster(document.getElementById("poster")!, …)`; select `initialIndex(slots, fromGameId(location.search))`. (Task 5 adds the controller; for now only render.)
- [ ] **Step 3: Delete** the Phaser scene files, `cabinet.ts`, `layout.ts`, their tests, and the two dependencies; run `npm install` at the root to update the lockfile.
- [ ] **Step 4: Run** `npm test -w arcade && npm run typecheck -w arcade && npm run build -w arcade`. Expected: PASS, and `grep -r phaser arcade/dist` finds nothing.
- [ ] **Step 5: Look at it.** `npm run dev -w arcade`, open `http://localhost:8000` in Chrome at 1440 × 900, 1920 × 1080, 1024 × 1366 and 390 × 844 (resize the window). Take a screenshot at each and check: no letterbox bars, no horizontal scroll, logo fully visible, every panel's picture visible (screenArt for now), selected panel yellow, text crisp. Compare 1440 × 900 against mockup A.
- [ ] **Step 6: Commit** `feat(arcade): HTML/CSS gig-poster front page, Phaser removed`.

---

### Task 5: Controller: keyboard, gamepad, mouse, attract, start sequence

**Files:**
- Create: `arcade/src/controller.ts`
- Modify: `arcade/src/controls.ts` (add `up: ["ArrowUp", "KeyW"]`, `down: ["ArrowDown", "KeyS"]`, pad buttons 12/13 and stick axis 1), `arcade/src/main.ts` (create the controller, drive it with `requestAnimationFrame`)
- Test: `arcade/tests/controller.test.ts`

**Interfaces:**
- Consumes: `PosterView` (Task 4), `AttractClock`, `moveSelection`, `nextAttractIndex`, `wrap` (Task 3), `GameAudio` (`lib/audio`), `InputManager.update()/anyJustPressed()` (`lib/input`), `gameUrl` (`lib/arcade`), `saveArcadeSettings` (`storage.ts`).
- Produces:
  ```ts
  export interface ControllerDeps {
    view: PosterView; slots: Slot[]; input: Pick<InputManager, "update" | "anyJustPressed">;
    audio: Pick<GameAudio, "playSfx" | "playMusic" | "stopMusic" | "toggleMute" | "muted">;
    startIndex: number; now: number; dev: boolean;
    go: (url: string) => void; saveMuted: (muted: boolean) => void;
  }
  export const START_DELAY_MS = 1050; // coin → "GAME START!" → leave, as today (150 + 400 + 500)
  export class ArcadeController { constructor(deps: ControllerDeps); frame(now: number): void; get selected(): number; get starting(): boolean }
  ```

- [ ] **Step 1: Write failing tests** with a fake view (records calls, `columns()` returns a settable number), fake input (a set of just-pressed actions per frame), fake audio:
  - `right` → `view.select(1)` and `playSfx("move")`; `down` with `columns() === 1` → index + 1.
  - `start` on a game → `playSfx("coin")`, `setCredit("CREDIT 1")`, `starting === true`; frames before `now + START_DELAY_MS` don't call `go`; after it, `stopMusic()` then `go("http://localhost:8001/")` (dev) once; further input is ignored while starting.
  - `start` on a coming-soon slot → `playSfx("nope")`, `notYet(i)`, no `go`.
  - `mute` → `toggleMute()` and `saveMuted(audio.muted)`.
  - hover callback → selects that index without starting; click callback → selects and starts.
  - Attract: no input for `settings.attractDelayMs` → selection advances via `nextAttractIndex` every `attractStepMs` without `"move"` sounds; any key press stops it and does **not** also move/start on that press.
- [ ] **Step 2: Run** `npm test -w arcade`. Expected: FAIL.
- [ ] **Step 3: Implement** `ArcadeController` (timers via the `now` passed to `frame`, no `setTimeout`, so tests stay synchronous; the 150 ms "GAME START!" beat and the final `view.fadeOut(300)` happen inside the 1050 ms) and wire it in `main.ts`: `const loop = (t) => { controller.frame(t); requestAnimationFrame(loop) }`; mouse via `view.onHover/onClick`; `audio.playMusic("arcade")` on the first user input (browsers block audio before a gesture); audio is `new GameAudio(htmlAudioBackend(audioFiles), …)`.
- [ ] **Step 4: Run** `npm test -w arcade && npm run typecheck -w arcade`. Expected: PASS.
- [ ] **Step 5: Try it in Chrome** (`npm run dev -w arcade` with `npm run dev -w super-flynn-bros` running): arrows/WASD move, up/down work when panels wrap (narrow window), hover selects, click and Enter start Super Flynn Bros on :8001, the game's QUIT/BACK TO ARCADE returns with that panel selected, the browser Back button returns to a fresh arcade, M mutes and is remembered after reload, and attract mode starts after 30 s.
- [ ] **Step 6: Commit** `feat(arcade): controls, mouse, show-off mode and game start`.

---

### Task 6: Capture script and first media

**Files:**
- Create: `arcade/capture/capture.ts`
- Modify: root `package.json` (devDependencies `playwright`, `tsx`), `arcade/package.json` (script `"capture": "tsx capture/capture.ts"`), `arcade/tsconfig.json` (include `capture`)
- Create (committed outputs): `super-flynn-bros/arcade-media/screenshot.png`, `clip.mp4`; `flynn-family-fighters/arcade-media/screenshot.png`, `clip.mp4`

**Interfaces:**
- Consumes: `CapturePlan`, `GameInfo` (Task 1), each game's `arcade.ts`; Task 4 media glob (paths must be exactly `<game>/arcade-media/screenshot.png` and `clip.mp4`).
- Produces: `npm run capture -w arcade -- <game-id> [more ids…]` (no ids = every game with a `capture` recipe).

- [ ] **Step 1: Write `capture.ts`.** For each game: import `../../<id>/arcade.ts`; skip with a message if it has no `capture`; start `npm run dev -w <id>` and wait until `http://localhost:<devPort>/` answers (60 s timeout); launch Chromium (Playwright) with a 1280 × 720 viewport and `recordVideo: { dir, size: { width: 1280, height: 720 } }`; open `http://localhost:<devPort>/<query>`; wait `warmupMs` (default 3000); note the video offset; run `steps` in a loop (`keyboard.down` for each `hold`, `keyboard.press` for each `press`, wait `ms`, `keyboard.up` the held keys) until `clipMs` (default 7000) has passed; take `page.locator("canvas").screenshot()` halfway through as `screenshot.png`; close the context and stop the dev server; then `ffmpeg -ss <offset> -t <clipMs> -i <video.webm> -an -vf "scale=960:-2,fps=30" -c:v libx264 -pix_fmt yuv420p -profile:v main -crf 28 -movflags +faststart clip.mp4`. Print each output's size and warn when a clip is over 1.5 MB or a screenshot over 300 KB. Exit non-zero with a friendly message when `ffmpeg` or the Playwright browser is missing (`npx playwright install chromium`).
- [ ] **Step 2: Install and run.** `npm install -D playwright tsx` at the root, `npx playwright install chromium`, then `npm run capture -w arcade`. Expected: both games' `arcade-media/` folders exist with a PNG and an MP4 within the size limits.
- [ ] **Step 3: Watch both clips** (open them, or check them in the arcade) and confirm they show real gameplay from the first frame (no title screen, loading text or "ROUND 1" banner covering everything) and loop without a jarring jump. Adjust the game's `warmupMs` / `steps` and re-run until they do.
- [ ] **Step 4: Check the arcade** at `http://localhost:8000`: unselected panels show screenshots, the selected one plays its clip, and with Chrome DevTools "Emulate prefers-reduced-motion" the clip doesn't play.
- [ ] **Step 5: Run** `npm test && npm run typecheck && npm run build` at the root. Expected: PASS (capture is not part of any of them).
- [ ] **Step 6: Commit** `feat(arcade): capture script; screenshots and clips for both games`.

---

### Task 7: Docs, rule amendment, Docker check

**Files:**
- Rewrite: `arcade/README.md` ("How It Works" for the poster page, controller and media; "Make It Your Own" with the new `settings.ts` values, ticker messages, colors, how to replace a game's screenshot/clip by hand, and how a grown-up re-records with `npm run capture -w arcade -- <game-id>` (needs `ffmpeg` and `npx playwright install chromium`); "Oops, I broke it" with the starting values). Credit the two fonts (OFL).
- Modify: `CLAUDE.md` §10 (the arcade is "a Vite + TypeScript page built with plain HTML and CSS (no Phaser)"; the `arcadeInfo` field list becomes `id`, `title`, `blurb`, optional `tagline`, `players`, `devPort`, optional `order`, `screenArt`, optional `capture`; add "optional `arcade-media/screenshot.png` and `clip.mp4` next to `arcade.ts`, made with `npm run capture -w arcade`"), §9 step 9 (mention `tagline`, `capture` and running capture), and a dated Amendment Log line.
- Modify: root `README.md` only if it describes the arcade's look or cabinets.

- [ ] **Step 1: Write the docs** above.
- [ ] **Step 2: Docker check.** `docker compose build arcade && docker compose up -d arcade super-flynn-bros flynn-family-fighters`; open `http://localhost:8000/`: the poster renders, clips play, and Enter opens `/super-flynn-bros/` and `/flynn-family-fighters/`. Check `docker image ls` for the arcade image size (expect it to grow by roughly the media size, a few MB). `docker compose down`.
- [ ] **Step 3: Run** `npm test && npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 4: Commit** `docs(arcade): poster README, CLAUDE.md §10 amendment`.
