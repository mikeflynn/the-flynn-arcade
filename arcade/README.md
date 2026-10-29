# 🕹️ The Flynn Arcade

This is the front door of the arcade: a big poster for The Flynn Arcade that
fills your whole screen. Every game has its own panel on it, and the one you
pick plays a little clip of the game.

- **Address:** <http://localhost:8000>
- **Controls:** ◀ ▶ ▲ ▼ (or W A S D, or a gamepad) to pick a game, Start
  (Enter, Space, E, or the gamepad's A/Start) to play, M to mute. You can also
  point at a game with the mouse and click it.
- Leave it alone for 30 seconds and it starts showing off the games by itself!

---

## 🔍 How It Works

**It's a web page, not a game.** The games are built with Phaser (a game
engine), but the poster is a plain web page: words and boxes in HTML, colors
and layout in CSS. That's what lets it stretch to fit any screen, from a big
monitor to a phone.

**Finding games.** The arcade doesn't have a list of games written anywhere.
Every game folder has a little file called `arcade.ts` that says its title,
tagline, blurb and so on. When the arcade is built,
[`src/games.ts`](src/games.ts) finds every `*/arcade.ts` file next to it and
checks it. If one has a mistake, the arcade leaves that game out (or just the
bad part) and tells you why in the browser console, instead of breaking.

**The pictures.** Each game can have a folder called `arcade-media/` with a
`screenshot.png` and a `clip.mp4`. [`src/media.ts`](src/media.ts) finds them
by themselves. A panel shows the screenshot; the game you pick plays its clip.
No screenshot yet? The panel draws the little letter picture (`screenArt`) from
the game's `arcade.ts` instead.

**The pieces:**
- [`src/poster/poster.ts`](src/poster/poster.ts) builds the poster: the
  scrolling strips, the giant logo (it sizes itself to fill its space), the info
  bar and the game panels. Its look is all in
  [`src/poster/poster.css`](src/poster/poster.css).
- [`src/poster/panel.ts`](src/poster/panel.ts) is one game's panel, and swaps
  between its screenshot and its clip.
- [`src/controller.ts`](src/controller.ts) is the brain: it reads the keyboard,
  gamepad and mouse, moves the highlight, runs show-off mode, and does the
  "GAME START!" moment before sending you to the game.

**Going to a game and back.** Pressing Start sends your browser to the game's
address. In Docker that's `/super-flynn-bros/` on this same address: the
arcade's web server ([`nginx.conf`](nginx.conf)) passes it along to the game's
own server. When you pick "BACK TO ARCADE" in the game, it sends you to
`/?from=super-flynn-bros`, so the arcade knows which game to light up.

---

## 🛠️ Make It Your Own

Run it with live editing:

```bash
npm run dev -w arcade
```

Open <http://localhost:8000>, then change things and save.

### Change the words and colors
Open [`src/settings.ts`](src/settings.ts):
- `logoLines`: the giant words at the top, like `["MAYA'S", "ARCADE"]`
- `tickerTop` and `tickerBottom`: the words in the scrolling strips
  (`{games}` turns into the number of games)
- `colors`: the poster is just two colors (`background` and `ink`) plus the
  `highlight` around the game you picked. Try a navy background
  (`"#101a3a"`) with white ink (`"#ffffff"`)!
- `tickerSecondsPerLoop`: set it to `5` and watch the strips zoom
- `attractDelayMs`: how long before show-off mode starts
- `comingSoonPanels`: how many "COMING SOON" panels to show
- `showScanlines`: `false` turns off the faint TV lines

### Change how a game shows up
Each game's own `arcade.ts` (like
[`../super-flynn-bros/arcade.ts`](../super-flynn-bros/arcade.ts)) sets its
`title`, its `tagline` (the short line under the title), its `blurb` (in the
info bar), and the little picture shown when there's no screenshot
(`screenArt`, up to 32 × 24 letters).

### Use your own picture or clip
Put a picture called `screenshot.png` in the game's `arcade-media/` folder
(like `super-flynn-bros/arcade-media/screenshot.png`). Any size works, but a
wide one (16:9, like 960 × 540) fills the panel best. A clip is the same idea:
`clip.mp4`, a few seconds long, with no sound.

### Add sounds
Put these in `public/assets/sounds/` as `.mp3` or `.ogg`: `coin`, `move`,
`select`, `nope`. Arcade music goes in `public/assets/music/arcade.mp3`. The
full list is in [`src/sounds.ts`](src/sounds.ts). Missing ones are fine: the
arcade just stays quiet.

### Oops, I broke it
Press **F12** and look at the *Console*: the arcade explains what's wrong. A
color that isn't a `"#rrggbb"` code goes back to the normal one, and a number
that's too big or too small gets fixed. To put a file back, ask a grown-up to
run `git checkout -- arcade/src/settings.ts` (or whichever file you changed).
The starting values are: `logoLines` `["FLYNN", "ARCADE"]`, colors
`#18171b` / `#efe6cf` / `#ffd23b`, `tickerSecondsPerLoop` 22,
`attractDelayMs` 30000, `attractStepMs` 6000, `comingSoonPanels` 1,
`typeLettersPerSecond` 40, `musicVolume` 0.5, `sfxVolume` 0.7,
`showScanlines` true.

---

## 🧰 For Grown-Ups

- `npm run dev -w arcade`: dev server on port 8000. Panels link to each game's
  own dev server (its `devPort`), so run that game's dev server too.
- `npm test -w arcade`: unit tests (settings, selection, show-off timing, media
  lookup, the controller, storage, game discovery).
- `docker compose up --build`: the arcade on 8000, proxying `/<game-id>/` to
  each game's container.
- **Recording screenshots and clips:** `npm run capture -w arcade` records
  every game that has a `capture` recipe in its `arcade.ts` (or
  `npm run capture -w arcade -- <game-id>` for one). It starts the game's dev
  server, plays it in a hidden Chromium using the recipe's key presses, and
  writes `<game>/arcade-media/screenshot.png` and `clip.mp4` (960 wide; aim for
  under 300 KB and 1.5 MB). Commit them. Needs `ffmpeg` and Google Chrome
  (or `npx playwright install chromium` once). It never runs in CI or Docker.
  Re-record after a game's look changes.
- **Adding a game:** see `CLAUDE.md` §9 and §10. In short, add
  `<game>/arcade.ts` (with a `tagline` and a `capture` recipe), run the capture
  script, add a `location` block in [`nginx.conf`](nginx.conf), and add the
  game to the `arcade` service's `depends_on` in `docker-compose.yml`.
- **A broken `arcade.ts`:** in dev, a game whose `arcade.ts` won't load (say, a
  missing comma in its screen art) is left out with a console message, and
  Vite's error overlay points at the typo (Esc closes it). A *syntax* error
  still stops `npm run build -w arcade` (and so the Docker build), because the
  build reads every `arcade.ts`. Fix the typo, or move the file aside, to build.
- **Docker routing:** nginx looks up each game's container on every request
  (`resolver 127.0.0.11`), so rebuilding or stopping one game never breaks the
  arcade. A stopped game just shows 502 on its own page.
- **Reduced motion:** when the computer asks for less motion, the strips and
  the cursor stand still and clips don't play (screenshots instead).
- Mute is saved in `localStorage` under `flynn-arcade:settings`.
- Shared libraries used: `lib/input`, `lib/audio` (its HTML audio backend),
  `lib/settings`, `lib/arcade`.
- **Fonts:** Archivo Black (© 2017 The Archivo Black Project Authors) and Space
  Mono (© 2016 The Space Mono Project Authors), both under the SIL Open Font
  License 1.1; see `public/assets/fonts/OFL-*.txt`.
