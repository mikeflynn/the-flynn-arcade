# The Flynn Arcade: poster front page — design

**Date:** 2026-10-29
**Status:** draft for approval
**Mockup:** [`2026-10-29-arcade-poster-mockups.html`](2026-10-29-arcade-poster-mockups.html), direction **A, "Gig poster"** (the chosen one; B and C were rejected)

## Why

The arcade (`arcade/`, port 8000) is the front door every kid starts from.
Today it is a fixed 320 × 176 Phaser canvas scaled to fit, so it leaves black
bars on most windows and is tiny on a phone. The owner wants it to be more fun
and look cooler: a **retro '90s arcade vibe that still looks good and readable,
not retro as in "crappy."** The reference that clicked was
[The Nifty Portal](https://portal.thenifty.com/): the arcade should look like
**the poster for The Flynn Arcade, and you pick the games right off it.**

Success: a kid opens arcade.flynn.link on a desktop browser, the poster fills
the window edge to edge, the games jump out in color, and picking one is
obvious with the keyboard, a gamepad or the mouse.

## Goals

- A full-window poster in the style of mockup A, filling any desktop window
  shape with no letterboxing; responsive down to a phone.
- **The games pop from a monochrome background** (owner's words). The poster
  is cream on near-black; color comes only from the game pictures and the
  yellow selection highlight.
- Each game shows a **large real screenshot**. When a game is **selected**, the
  screenshot switches to a **short, silent, looping clip** of the game.
- Screenshots and clips are made by a script that records each game playing
  itself, so they're easy to refresh and a new game can get its own.
- Keep everything that works in today's arcade (see "Keep").

## Non-goals

- No change to the games themselves beyond their `arcade.ts` (see below) and
  what the capture script needs to drive them (see "Capture").
- No new arcade features beyond the poster: no high scores, accounts, search,
  favorites or categories.
- No multiplayer server work.

## Anti-goals (a failure even if it "works")

- **Retro as in crappy:** blurry upscaled pixel text, muddy low-res UI,
  letterbox bars. All poster text is crisp vector type at any size; only the
  game pictures are pixel art.
- **Color soup:** the poster itself must stay monochrome so the games pop.
  Don't add per-game cabinet colors, gradients or neon to the poster chrome.
- **Breaking on a bad kid edit:** a game with no screenshot/clip, a bad
  `arcade.ts`, or a missing font must still give a working page (§7 "Forgiving").

## The look (from mockup A)

Top to bottom, full window, thin cream outlines (about 1px at 1× zoom, rounded
corners) on near-black (`#18171b`) with cream ink (`#efe6cf`), a fine dot grain
and faint scanlines over everything:

1. **Ticker strip** scrolling sideways: "INSERT COIN ✦ N GAMES ON THE FLOOR ✦
   PRESS START ✦ FREE PLAY ✦ THE FLYNN ARCADE ✦ …" (N is the real game count).
2. **Logo row:** a giant "FLYNN / ARCADE" in a heavy display face (mockup uses
   Archivo Black) filling the width, with a small outlined **stamp box** beside
   it (EST. 2026 / THE FLYNN ARCADE / CREDITS ∞).
3. **Info bar:** segmented outlined bar: "PLAYER SELECT", a blinking cursor, the
   selected game's **title and blurb**, its player badge ("1–2P CO-OP",
   "1–2P VS"), and a live clock.
4. **Game panels:** a row of outlined panels. Each has a header line ("GAME 01"
   + player count), a big picture area, and a footer with the title (heavy
   face) and the game's `tagline` under it (see below). The **selected** panel gets a yellow
   (`#ffd23b`) outline, a yellow header, a "▶" after its title, and its clip
   playing. "COMING SOON" panels are hatched, with "???".
5. **Bottom ticker** with the controls: "← → CHOOSE ◆ ENTER TO PLAY ◆ M FOR SOUND".

Type: a heavy display face for the logo and titles and a monospace face for
everything else (mockup: Archivo Black + Space Mono). Fonts are served
locally from `arcade/public/assets/fonts/` with their licenses (as Fighters
does with Press Start 2P); fall back to system fonts if they fail to load.

**Responsive:**
- Desktop/landscape: everything fits in one screen with no scrolling; the
  panel row takes the remaining height, and panels keep the game pictures'
  shape (letterboxed inside the panel on a dark fill, never stretched).
- With more games than fit in one row, panels wrap to a second row or the row
  scrolls sideways. *Builder's call*, but the selected panel must always be
  fully visible.
- Narrow/portrait (phone): one or two columns, logo shrinks to fit the width,
  the page may scroll vertically, and the selected panel scrolls into view.
- Honors `prefers-reduced-motion`: tickers stop, the cursor stops blinking, and
  clips show their screenshot instead of playing.

## Keep from today's arcade

- **Finding games:** each game's `arcade.ts` is found automatically
  (`arcade/src/games.ts`, `lib/arcade` validation). A broken one is left out
  with a console message. Never edit arcade code to add a game.
- **Controls:** keyboard (arrows / A D, Enter / Space / E, M) and gamepad via
  `lib/input`, any player. **New:** the mouse: hover selects, click plays.
  Up/down also move when panels wrap into rows.
- **Coming back:** `/?from=<game-id>` (`fromGameId`) starts with that game selected.
- **Start sequence:** the coin sound, "CREDIT 1" and a brief "GAME START!"
  moment before going to `gameUrl(...)`. "COMING SOON" plays "nope".
- **Show-off (attract) mode:** after `attractDelayMs` with no input, the
  selection walks through the games every `attractStepMs`, each playing its
  clip; any input stops it.
- **Sounds and music** from `arcade/src/sounds.ts`, quiet when files are
  missing; **mute** remembered in localStorage (`storage.ts`).
- **Kid tweakability (§7):** `settings.ts` keeps the kid-facing values,
  rewritten for the new look: logo text, ticker messages, poster ink and
  background colors, highlight color, ticker speed, attract timings,
  coming-soon count, volumes, with friendly comments and `// 🛠️ TRY THIS:`
  hints, clamped by `limits.ts`. Old settings that no longer apply
  (sunburst, speed lines, sparkles, floor) go away.
- **README** "How It Works" and "Make It Your Own" rewritten for the poster.

## Changes to each game's `arcade.ts` (`GameInfo` in `lib/arcade`)

- **Cabinet colors are dropped** (owner, 2026-10-29). The poster stays
  strictly cream, black and yellow. Remove `colors` from `GameInfo` and from
  both games' `arcade.ts` files, along with their "change the cabinet colors"
  hints, and update every doc that mentions them: the game READMEs, the root
  README, the CLAUDE.md §10 field list, and anything in `.claude/skills/` or
  `docs/`. Validation must still **accept** an old `arcade.ts` that has
  `colors` (it is ignored, at most a console note), so a kid's older copy
  never breaks the arcade.
- **New optional `tagline`** (*Claude's call*): the short line under a panel's
  title, such as "Dodge dogs, grab donuts". Add one to both games. When it is
  missing, the footer shows just the title. The full `blurb` stays in the info
  bar. Validation checks it's a short string and warns (leaves it out) if not.
- `screenArt` stays as it is: it's the last fallback picture.

## Game pictures and clips

- **Per game, two optional files** in the game's own folder, next to
  `arcade.ts`: a **screenshot** (PNG) and a **clip** (MP4, H.264, silent),
  about 5–8 seconds, seamless enough to loop. *Location and names are the
  builder's call* (e.g. `<game>/arcade-media/screenshot.png` and `clip.mp4`);
  they're found automatically the same way `arcade.ts` is, with no list to edit.
- **Fallback chain:** clip → screenshot → the 32 × 24 `screenArt` from
  `arcade.ts` drawn as crisp pixels. A game with no media still looks right.
- Only the **selected** panel plays its clip; the others show stills. Clips are
  loaded lazily so the page opens fast, and switching back to a still is
  instant.
- Files stay small: aim under ~1.5 MB per clip and ~300 KB per screenshot.

## Capture (the script that makes them)

- A dev-only script (e.g. `npm run capture -w arcade`, or one per game) starts
  a game's dev server, opens it in a headless browser, drives it to real
  gameplay, records a few seconds, and writes the screenshot and clip. It is
  never part of CI or the Docker build; the output files are committed.
- **Driving the games** is the builder's call. Options: a **demo/watch mode**
  in the game (for example a URL flag that starts a CPU-vs-CPU fight in Flynn
  Family Fighters, which already supports two CPU players), or **scripted key
  presses** from the capture script (Super Flynn Bros has no demo mode today).
  Any game-side hook must be invisible in normal play.
- Recording tools are the builder's call (a headless-browser library as a root
  dev dependency, plus `ffmpeg`, which the owner has). Document the command
  and requirements in the arcade README so a grown-up can re-record after a
  game changes, and so a new game can be captured.
- First run produces media for **Super Flynn Bros** and **Flynn Family
  Fighters**.

## Constraints

- Stack per CLAUDE.md: TypeScript strict, Vite, npm workspaces, Vitest, the
  existing arcade Dockerfile/nginx. The page is built with **plain HTML and
  CSS (no Phaser)**, the owner's decision on 2026-10-29. Games stay Phaser.
  **Amend CLAUDE.md §10** ("It's a Vite + Phaser app like the games") and add an
  Amendment Log line. No UI framework is added.
- `lib/audio` currently plays through Phaser; the arcade needs a non-Phaser
  playback backend (its `AudioBackend` interface allows one). Put it in
  `lib/audio` so other DOM pages could use it.
- `lib/input` (keyboard + gamepad) is reused as-is.
- Tests follow CLAUDE.md §7 "Tests on kid files": logic (selection, layout
  choices, fallback chain, settings clamping, ticker text) is tested with
  fixtures; kid-editable values are not pinned.
- The arcade Docker image must include the media (the build context is the
  repo root, so it's reachable); check the image size stays reasonable.
- Must keep working under `/` in Docker and on port 8000 in dev, linking to
  games as today (`gameUrl` / `arcadeUrl`).

## Decided by the owner

- Direction A, the Nifty-Portal-style gig poster; games pop from a
  monochrome background.
- Larger picture per game; selected game switches to a short looping clip.
- HTML and CSS for the front page instead of Phaser.
- Claude makes the screenshots and clips with a script.
- Desktop browser first; responsive is wanted.
- Drop the per-game cabinet colors; the poster stays cream, black and yellow.

## Left to the builder (Claude's calls, marked as such)

- Exact fonts (mockup: Archivo Black + Space Mono), sizes and spacing.
- Media file location and names; how each game is driven during capture.
- How overflow works with many games (wrap vs. sideways scroll).
- Clip length within 5–8 s and encoding settings.
- Whether "GAME START!" is a full-screen flash or a panel-level effect, as long
  as it stays in the monochrome + yellow look.
