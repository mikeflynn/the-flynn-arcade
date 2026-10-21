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
- **A broken `arcade.ts`:** in dev, a game whose `arcade.ts` won't load (say, a
  missing comma in its screen art) is left out with a console message, and
  Vite's error overlay points at the typo (Esc closes it). A *syntax* error
  still stops `npm run build -w arcade` (and so the Docker build), because the
  build reads every `arcade.ts`. Fix the typo, or move the file aside, to build.
- **Docker routing:** nginx looks up each game's container on every request
  (`resolver 127.0.0.11`), so rebuilding or stopping one game never breaks the
  arcade. A stopped game just shows 502 on its own page.
- `?debug=1` exposes the Phaser game as `game` in the console.
- Mute is saved in `localStorage` under `flynn-arcade:settings`.
- Shared libraries used: `lib/input`, `lib/pixel-art`, `lib/audio`,
  `lib/settings`, `lib/arcade`.
