# The Flynn Arcade Launcher: Design Spec

**Date:** 2026-10-21
**Directory:** `arcade/`
**Port:** 8000 (dev server and Docker)
**Multiplayer server:** not used

## Purpose

A top-level game picker for The Flynn Arcade. Kids open one address, see a
loud, colorful, 90s-arcade select screen (in the spirit of 1990s fighting-game
select screens like *X-Men vs. Street Fighter*: saturated colors, a moving
background, a chunky chrome logo, thick outlines, a flashing "1P" cursor),
choose a game cabinet, and play. Every game links back. Adding a game to the
arcade means adding one small file to that game, with no arcade code changes.

It's original art in our own pixel style: no copied logos, fonts, or characters.

## Approach

**One front door.**
- **Docker:** the arcade lives at `http://localhost:8000/`. Choosing a game
  opens `http://localhost:8000/<game-id>/` in the same tab. The arcade's nginx
  forwards `/<game-id>/` to that game's own container, so each game keeps its
  own compose service and port (root `CLAUDE.md` §4).
- **Dev:** the arcade runs on `http://localhost:8000` (`npm run dev -w arcade`)
  and links straight to each game's dev server (`http://localhost:<devPort>/`).
- **Back to the arcade:** a game sends the player to the arcade's address. It
  passes the game's id so the arcade reopens with that cabinet selected.

## Screen & Look

Logical resolution 320×176 with `pixelArt: true` and `Scale.FIT`, the same as
Super Flynn Bros. Everything is drawn with Phaser graphics and text-grid art.
No image files are needed.

### Background (always moving)
- **Sunburst:** wide rays in two alternating colors (default electric blue
  `#2a5cff` and violet `#8a2be2`), turning slowly (one turn every ~60 s), centered
  behind the cabinets.
- **Speed lines:** diagonal bands of streaks across the top and bottom edges in
  orange and yellow, scrolling continuously.
- **Sparkles:** small 4-point star flashes popping in at random spots every
  ~0.5 s, each living ~400 ms.
- All colors and speeds live in `arcade/src/settings.ts`.

### Logo
- The text "THE FLYNN ARCADE" sits at the top center.
- Style: a yellow → orange → red vertical gradient fill, a thick black outline,
  and a hard drop shadow offset 2 px down and right.
- **Intro:** on first open it scales from 3× to 1× in ~300 ms, then the camera
  shakes for ~150 ms.
- **Shine:** a white diagonal glint sweeps across the logo every ~4 s.
- The logo is drawn by code (gradient text plus outline). The words come from
  `settings.ts`.

### Cabinets
- A horizontal row of cabinets stands on a floor strip along the bottom third.
  The selected cabinet is centered when possible, and the row slides as the
  selection moves (~150 ms ease).
- **Cabinet art:** each cabinet is built from text-grid parts in
  `arcade/src/cabinet.ts`: a body (sides and control panel with joystick and
  buttons), a marquee box, and a screen hole.
- **Cabinet colors:** the body colors come from the game's `colors`
  (`primary`, `secondary`), with thick black outlines.
- **Marquee:** a lit box with the game's `title` in small outlined text.
- **Screen:** the game's `screenArt` (a text-grid picture, up to 32×24),
  drawn centered in the screen hole.
- **Selected cabinet:** scaled 1.15×, with a pulsing yellow outline (thicker
  outline brightening and dimming at ~2 Hz).
- **Other cabinets:** full color at 0.9× scale.
- **"COMING SOON" cabinets:** grey bodies with a bouncing **"?"** on the screen.
  - How many: `comingSoonCabinets` of them (default 2), always added after
    the real games.
  - They can be selected but not started.

### Selection cursor
- A flashing red **"1P"** tag (red box, white text, black outline) bobs above
  the selected cabinet.
- If the game's `players.max >= 2`, a blue **"2P"** tag sits beside it.

### Info panel
- A slanted comic-style panel (parallelogram, white with a thick black outline
  and a colored accent stripe in the game's `primary` color) sits along the
  bottom.
- **Contents:**
  - the game's `title` in large outlined text,
  - player badges such as **"1P"**, **"1–2P"**, and **"CO-OP"** when
    `players.coop` is true, drawn as small colored rounded boxes,
  - the `blurb`, typed out ~40 characters per second, restarting whenever the
    selection changes.
- **"COMING SOON" cabinets** show the title "COMING SOON" and the blurb "A new
  game is being built! Want to make one?"

### "INSERT COIN"
- Blinking "INSERT COIN" sits in the top-right corner (it blinks at 1 Hz).
- After a game is chosen it changes to "CREDIT 1" for the start sequence.

## Controls & Flow

Controls use `@web-games/input`. The arcade has its own bindings in
`arcade/src/controls.ts`:

| Action | Keyboard | Gamepad (any pad) |
|---|---|---|
| Move | ← → or A / D | D-pad ←/→ or left stick |
| Start | Enter, Space, or E | A or Start |
| Mute | M | Select/Back |

**Moving.** Pick the previous or next cabinet. It wraps around, plays the
`move` sound, and triggers the whoosh slide.

**Starting a real game.**
1. Freeze input. Play the `coin` sound and change "INSERT COIN" to
   "CREDIT 1".
2. ~150 ms later: flash the screen white (~120 ms) and play `select`.
3. **"GAME START!"** zooms in from 4× to 1× with a burst of radial speed lines
   behind it (~400 ms). Hold for ~500 ms.
4. Fade the camera to black (~300 ms), then go to the game's URL.

**Starting a "COMING SOON" cabinet.** The "?" spins once, a "NOT YET!" pop-up
bounces above the cabinet for ~700 ms, and the `nope` sound plays. Nothing
else happens.

**Attract mode.**
- After `attractDelayMs` (default 30 000) with no input, the selection moves
  to the next cabinet every ~2.5 s. It skips "COMING SOON" cabinets unless
  there's only one real game, in which case it wanders across all of them.
- Any input ends attract mode. That first press does nothing else.

**Returning.**
- When opened with `?from=<game-id>` and that id matches a game, that cabinet
  starts selected and the logo intro is skipped.
- Otherwise the first cabinet (by sort order) is selected.

**Sound and music.** These are optional and silently skipped when missing,
using the same rules as Super Flynn Bros.
- **Sound effects** (`arcade/public/assets/sounds/`): `coin`, `move`, `select`,
  and `nope`.
- **Music** (`arcade/public/assets/music/`): `arcade` (loops).
- **Browser audio rules:** music starts on the first key press.
- **Mute:** the M key toggles mute. The mute setting is saved in
  `localStorage` under `flynn-arcade:settings`.

## Game Registration

Each game adds **`<game>/arcade.ts`** (kid-editable, no Phaser imports):

```ts
import type { GameInfo } from "@web-games/arcade";

export const arcadeInfo: GameInfo = {
  id: "super-flynn-bros",          // must match the folder name and the URL path
  title: "SUPER FLYNN BROS",
  blurb: "Help Colin and Ryan get to school, practice, and back home!",
  players: { min: 1, max: 2, coop: true },
  colors: { primary: "#5ab0f0", secondary: "#f6d860" },
  devPort: 8001,
  order: 1,                        // optional; lower comes first
  screenArt: {
    colors: { /* letter → color */ },
    art: [ /* up to 32 × 24 text rows */ ],
  },
};
```

**How the arcade finds games.**
- `arcade/src/games.ts` collects every registration at build time with
  `import.meta.glob("../../*/arcade.ts", { eager: true })`.
- It ignores the `arcade/` folder itself and anything under `lib/`.
- It sorts games by `order`, then by `title`.

**Validation** (pure and tested): a registration is skipped with a friendly
console warning, and never crashes the arcade, if any of these are wrong:
- `id` missing or not kebab-case,
- `id` not matching its folder name,
- duplicate `id`,
- `players.min > players.max`,
- `screenArt` larger than 32×24.

Screen-art color problems use the pixel-art module's usual pink-pixel warning.

## Shared Libraries (promoted per root `CLAUDE.md` §6)

The arcade is the second user of these Super Flynn Bros modules, so they move
to `lib/`, and the game imports them from there. Their behavior is unchanged,
and their existing tests move with them.

| New package | Moved from `super-flynn-bros/src/engine/` | Contents |
|---|---|---|
| `lib/pixel-art` (`@web-games/pixel-art`) | `pixelArt.ts` | `parseFrames`, `stripFrameCount`, `addTextureFromFrames`, `makeSpriteSheet`, `Palette` |
| `lib/audio` (`@web-games/audio`) | `audio.ts`, `assets.ts`, `phaserAudio.ts` | `GameAudio`, `audioCandidates`, `findAssets`, `findAllAssets`, `nextAttempts`, `makeHttpExists`, `phaserAudioBackend` |

New package **`lib/arcade` (`@web-games/arcade`)**:
- **`GameInfo` type:** the registration shape shown above.
- **`validateGames(entries: { folder: string; info: unknown }[], warn): GameInfo[]`:**
  validates, de-duplicates, and sorts the registrations.
- **`gameUrl(info, env: { dev: boolean }): string`:** returns
  `http://localhost:<devPort>/` in dev and `/<id>/` in production.
- **`arcadeUrl(fromGameId: string, env: { dev: boolean; arcadeDevPort?: number }): string`:**
  returns `http://localhost:8000/?from=<id>` in dev and `/?from=<id>` in
  production.

Phaser stays a peer dependency of `lib/pixel-art` and `lib/audio`. Their
Phaser use is type-only, apart from the scene and sound-manager objects passed in.

## Changes to Super Flynn Bros

- Add `super-flynn-bros/arcade.ts`. The screen art is Colin and Ryan side by
  side, reusing their idle-frame look at reduced size and drawn fresh as a
  32×24 grid.
- **Title menu:** the mode list gets a fourth item, **"BACK TO ARCADE"**.
- **Pause menu:** **"QUIT TO TITLE"** stays, and **"QUIT TO ARCADE"** is added.
- **Going back:** both use `arcadeUrl("super-flynn-bros", { dev: import.meta.env.DEV })`.
- Imports switch to `@web-games/pixel-art` and `@web-games/audio`.
- **No other changes:** gameplay, files kids edit, and save data are untouched.

## Docker

- **New `arcade` service:** build context is the repo root, and it uses
  `arcade/Dockerfile` (Node build, then `nginx:1.27-alpine`).
- **Ports:** `"8000:80"`, with `depends_on: [super-flynn-bros]`.
- **`arcade/nginx.conf`:**
  - `location / { try_files $uri $uri/ =404; }` serves the arcade's build.
  - Each game gets a block like
    `location /super-flynn-bros/ { proxy_pass http://super-flynn-bros:80/; }`.
    The trailing slashes strip the prefix.
  - Games are built with `base: "./"`, so their relative asset URLs work under
    the prefix.
  - A request to `/super-flynn-bros` (no trailing slash) redirects to
    `/super-flynn-bros/`.
- **Missing files** under a game path still return real 404s from the game's
  nginx, because the proxy passes the status through. Optional sounds and
  pictures keep working.
- **Super Flynn Bros** stays reachable on its own at 8001.

## Repo Updates

- **Root `package.json` workspaces:** add `arcade`.
- **Root `README.md`:** "Open **http://localhost:8000** and pick a game!" in
  How to Play, for both Docker and dev.
- **`CLAUDE.md`:**
  - Folder layout: add `arcade/`.
  - Port registry: add `arcade | 8000`.
  - §6: list the three new packages.
  - New-game checklist: add "Add `<game>/arcade.ts` and a `location` block in
    `arcade/nginx.conf`; add the game to the arcade's `depends_on`."
  - Amendment Log: add an entry.
- **`arcade/README.md`:** What it is, How It Works (finding games, routing,
  scenes), Make It Your Own (change the colors and logo words, redraw the
  cabinet, make a game's cabinet screen, add sounds), For Grown-Ups.

## Kid-Editable Files (arcade)

- `arcade/src/settings.ts` 🛠️
  - colors: sunburst, speed lines, sparkles, floor, info panel
  - logo words
  - speeds
  - `attractDelayMs`
  - `comingSoonCabinets`
- `arcade/src/cabinet.ts` 🛠️ the cabinet shape as text art
- `arcade/src/sounds.ts` 🛠️ sound and music file list
- `arcade/src/controls.ts` 🛠️ key and gamepad bindings
- `<game>/arcade.ts` 🛠️ a game's cabinet look and info

Out-of-range numbers in `settings.ts` are clamped with friendly warnings, the
same as Super Flynn Bros.

## Testing

- **Vitest, `lib/arcade`:**
  - `validateGames` (valid, missing id, folder mismatch, duplicates,
    min > max, oversized art, sorting)
  - `gameUrl` and `arcadeUrl` (dev and production)
- **Vitest, `arcade`:**
  - settings clamping
  - cabinet art parses cleanly
  - the real `super-flynn-bros/arcade.ts` passes validation, and its screen
    art parses with no warnings
  - the `?from=` parsing helper
- **Moved tests:** `pixelArt`, `assets`, and `audio` tests move into their
  libraries and still pass. The game's suite still passes.
- **Browser (dev):**
  - the logo slam, moving background, and cabinets with art
  - ◀ ▶ selection with the 1P/2P tags, and the typed blurb
  - "COMING SOON" → "NOT YET!"
  - Start → GAME START! → the game opens
  - the game's BACK TO ARCADE / QUIT TO ARCADE → the arcade with that cabinet
    selected and no intro
  - attract mode after the delay
  - no console errors with all sounds missing
- **Docker:** `docker compose up --build`.
  - `localhost:8000` shows the arcade.
  - `localhost:8000/super-flynn-bros/` plays the game.
  - `localhost:8000/super-flynn-bros/assets/sounds/jump.mp3` returns 404.
  - Quit to arcade returns to `localhost:8000/?from=super-flynn-bros`.

## Out of Scope

- Creating sound or music files.
- High scores, profiles, or anything stored on a server.
- Touch controls.
- Hosting beyond localhost (the routing works on any host, but no deploy setup).
- A "2P join" step in the arcade: the player count is chosen inside each game.
