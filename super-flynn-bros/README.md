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
| Pick a menu item | Enter or Space | E |
| Gamepad | First gamepad | Second gamepad |

- **Esc** pauses. **M** turns the sound on and off.
- **BACK TO ARCADE** (title menu) or **QUIT TO ARCADE** (pause menu) takes
  you back to The Flynn Arcade to pick another game.
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
> `?debug=1` shows everyone's hitboxes as boxes (and lets grown-ups poke at the
> game from the browser console as `game`).

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
Keep pits 3 tiles wide or less so you can jump them, and keep every level
**11 rows tall** (one screen). The game warns you in the console if it isn't.

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
browser console shows which ones are still missing. If a `.mp3` won't play,
the game tries a `.ogg` with the same name instead.

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
- Shared libraries used: [`lib/input`](../lib/input), [`lib/pixel-art`](../lib/pixel-art),
  [`lib/audio`](../lib/audio), [`lib/settings`](../lib/settings), [`lib/arcade`](../lib/arcade).
- [`arcade.ts`](arcade.ts) is how this game shows up in The Flynn Arcade
  (cabinet colors, blurb, and the picture on its screen).
- **Asset credits:** all art is drawn in code in this repo. No third-party assets.
