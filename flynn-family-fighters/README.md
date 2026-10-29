# 🥊 Flynn Family Fighters 🥊

The Flynns are settling things the arcade way! Pick a fighter, learn a few
special moves, and fight your way up the ladder to win the tournament. Throw
fireballs, uppercut your way out of trouble, and cheer for the winner. (Nobody
gets hurt: knockouts are dizzy stars and a goofy flop, never anything scary.)

- **Players:** 1 (fight the computer up the arcade ladder) or 2 (versus on one keyboard or two gamepads)
- **Multiplayer server:** not used. Both players share one keyboard (or two gamepads).
- **Port:** 8002, at <http://localhost:8002>

---

## 🎮 How to Play

From the title screen pick **1P ARCADE** (you against the computer, one fighter after another) or **2P VERSUS** (you against a friend). Choose your fighter, then fight! Win **2 rounds** before the other fighter does to win the match. Empty their health bar, or have more health left when the clock runs out.

If only **one** fighter is in the game, arcade mode is a mirror match: you fight a copy of yourself!

### Controls

| | Player 1 | Player 2 |
|---|---|---|
| Move | W A S D | Arrow keys |
| Light / Medium / Heavy Punch | R / T / Y | I / O / P (or number pad 4 / 5 / 6) |
| Light / Medium / Heavy Kick | F / G / H | K / L / ; (or number pad 1 / 2 / 3) |
| Start / pick | 1 | Enter |
| Gamepad | First gamepad | Second gamepad |

- **Gamepad:** D-pad or left stick moves. X, Y and RB are the punches (light, medium, heavy). A, B and RT are the kicks. Start picks.
- **M** turns the sound on and off.
- **QUIT TO ARCADE** (title menu) takes you back to The Flynn Arcade.
- Two players on one keyboard? Some keyboards can't feel lots of keys at once ("key ghosting"). Gamepads work best.

### Moving and blocking

- **Walk** toward the other fighter or away. **Hold back** to **block** (you block by walking away from the attack).
- **Up** jumps. **Down** crouches.
- Some attacks hit **high**: block them standing. Some hit **low**: block them crouching. Jump attacks hit high. Crouching kicks hit low.
- Hit someone lots of times without a break and they get **dizzy** (stars!). That's your chance.
- **Throws** can't be blocked: stand right next to them and press **forward or back plus Medium or Heavy Punch**. (Throw tech, where you press the same thing as you're grabbed to break free, is off. Turn it on in `settings.ts`.)

### Special moves and the strange arrows

Every fighter has 2 to 4 special moves. You do them by drawing a shape with the joystick, then pressing a button. The shapes use arrows. **Forward** means toward the other fighter, whichever side you're on.

| Name | Draw this | Then press | What it does |
|---|---|---|---|
| **qcf** ("quarter circle forward") | ↓ ↘ → | a punch (fireball) | Throws a fireball |
| **qcb** ("quarter circle back") | ↓ ↙ ← | a kick (spin-kick) | Spin through the air, hitting up to 3 times |
| **dp** ("dragon punch") | → ↓ ↘ | a punch (uppercut) | Leap up, can't be hit at the start |
| **chargeBF** | hold ← for about 1 second, then → | a punch (charge-dash) | Fast dash forward |
| **chargeDU** | hold ↓ for about 1 second, then ↑ | a kick (flip-kick) | Flip kick up and over |
| **mash** | tap a punch 5 times fast | (just the punch) | A flurry of tiny punches |
| **360** | spin the stick all the way around | a punch (command-throw) | A big, unblockable grab |

Which button you press picks **how strong** the move is: **light**, **medium** or **heavy** (a heavy fireball flies faster!). You have a few frames (a "frame" is 1/60 of a second) to finish the shape and press the button, and you can make that window longer in `settings.ts` (`motionWindowFrames`).

Try the **fighter lineup** to see everyone up close: open <http://localhost:8002/?viewer>. Press N to flip through the animations.

---

## 🔍 How It Works

A peek behind the curtain at what makes the game tick.

**The scenes.** The game is a chain of screens, each one a file in [`src/scenes/`](src/scenes/):
[`TitleScene`](src/scenes/TitleScene.ts) (menu) → [`SelectScene`](src/scenes/SelectScene.ts) (pick fighters) → [`VersusScene`](src/scenes/VersusScene.ts) (the "VS" splash) → [`FightScene`](src/scenes/FightScene.ts) (the fight) → [`ChampScene`](src/scenes/ChampScene.ts) (the winner!). [`AfterMatchScene`](src/scenes/AfterMatchScene.ts) asks what to do next. [`BootScene`](src/scenes/BootScene.ts) loads and draws everything before the title shows up, and [`ViewerScene`](src/scenes/ViewerScene.ts) is the fighter lineup.

**The rig: fighters are paper dolls.** Nobody drew these fighters frame by frame. Each one is a set of *shapes* (head, chest, upper arm, forearm, thigh, and so on) joined at joints, like a paper doll with pins. The shapes are drawn from a **`Look`**: hair, skin, colors, build and so on from the character file. An *animation* is just a list of poses, and a pose is one angle for each joint. The game blends from one pose to the next, then bakes every frame into a sheet of little pictures at start-up. That code lives in the shared [`lib/rig`](../lib/rig/) library. The game's poses and animations are in [`src/animations.ts`](src/animations.ts).

**The simulation: the fight is math, not pictures.** The fight itself is a little "engine" in [`src/engine/`](src/engine/) that runs exactly 60 steps every second, no matter how fast your computer is. Each step reads what both players are pressing ([`input.ts`](src/engine/input.ts) also recognizes the joystick shapes), moves the fighters ([`movement.ts`](src/engine/movement.ts)), and checks attacks ([`combat.ts`](src/engine/combat.ts)). The engine knows nothing about pictures. The scene just *draws* whatever the engine says: the current animation, the fireballs, the health bars.

**Hits and scoring.** Every attack has a **hitbox**: a rectangle where it can hurt. Every fighter also has a **hurtbox**: the rectangle where they can be hurt. If an attack's hitbox overlaps the other fighter's hurtbox during the attack's "active" frames, it **hits**: they lose health, get stunned, and both fighters freeze for a moment (the "hitstop" crunch). Turn on `showHitboxes` in `settings.ts` to watch the boxes. [`src/engine/combat.ts`](src/engine/combat.ts) has the rules for blocking, damage and dizziness.

**Moves are data.** Punches and kicks are blocks of numbers in [`src/moves.ts`](src/moves.ts) (`NORMALS`), and special moves are blocks in `MOVE_TYPES` in the same file. A fighter's file in [`src/characters/`](src/characters/) just *picks* moves and names them. The computer's brain is in [`src/engine/cpu.ts`](src/engine/cpu.ts).

**Keeping it fair.** The engine never uses `Math.random`. It uses its own seeded random numbers, so the same inputs always make the same fight.

---

## 🛠️ Make It Your Own

### 1. Getting started

A grown-up can help with this one. In a terminal, in the arcade folder:

```bash
npm install
npm run dev -w flynn-family-fighters
```

Open <http://localhost:8002>. Now edit a file, save it, and the game reloads right away. Edit mostly in these places:

- [`src/settings.ts`](src/settings.ts) for how the game feels
- [`src/characters/`](src/characters/) for fighters
- [`src/moves.ts`](src/moves.ts) for punches, kicks and special moves
- [`src/stages.ts`](src/stages.ts) for places to fight
- [`src/controls.ts`](src/controls.ts) for keys and gamepad buttons

Typed something wrong? The game fixes it and tells you in the browser console (press F12 to see the message). It won't turn into a blank screen.

### 2. Easy tweaks

All in [`src/settings.ts`](src/settings.ts), in the `mySettings` block:

| Setting | What it does | Try |
|---|---|---|
| `roundTime` | Seconds in a round | 30 (quick!) to 99 |
| `roundsToWin` | Rounds needed to win a match | 1 to 3 |
| `gameSpeed` | How fast everything runs | 1 (normal) to 4 (super speed!) |
| `cpuDifficulty` | How smart the computer is | 1 (gentle) to 8 (tough!) |
| `damageScale` | How much every hit hurts | 0.25 (tickles) to 3 (ouch!) |
| `chipDamageFraction` | How much blocked hits still hurt | 0 to 0.5 |
| `dizzyEnabled` | Stars after lots of hits | `true` or `false` |
| `throwTechEnabled` | Break free by pressing throw as you're grabbed | `true` or `false` |
| `motionWindowFrames` | Time to finish a joystick shape | 10 (tricky) to 40 (easy) |
| `showHitboxes` | Draw the attack boxes | `true` to learn how hits work |
| `animationFps` | Pictures per second for fighters | 15 (chunky retro), 20, or 30 (smooth). Other numbers snap to the closest. |

Want to change the controls? Edit [`src/controls.ts`](src/controls.ts). The names look like `"KeyA"` or `"ArrowLeft"`. ⚠️ Player 1 and player 2 must use *different* keys (only `start` and `mute` may share). If you give both players the same key, `npm test` will fail and tell you which one.

### 3. Make yourself a fighter

**The quick way:** ask Claude Code (with a grown-up) to run the **`/add-fighter`** skill. It asks about you (your name, hair, favorite colors, a special move) and writes your fighter file for you.

**The copy-paste way:**

1. Copy [`src/characters/colin.ts`](src/characters/colin.ts) to a new file in the same folder, like `src/characters/you.ts`. (The file's name becomes your fighter's id. There's no list to edit: the game finds your file by itself.)
2. Change `name`, then change the `look`. Here is every field:

| `look` field | What it does |
|---|---|
| `body` | `masculine` or `feminine`: the frame of the body |
| `archetype` | `martial` (gi and bare feet) or `brawler` (tank top and shoes) |
| `height` | 0.85 (short) to 1.15 (tall) |
| `build` | `lean`, `medium` or `big` |
| `muscle` | 0.8 (wiry) to 1.4 (HUGE) |
| `skin`, `eyes` | colors, like `"#f1c08f"` (search "color picker" to find any color's code) |
| `face.expression` | `determined` or `grin` |
| `face.jaw` | `square`, `round`, `soft` or `pointed` |
| `face.brows` | `heavy`, `thin` or `arched` |
| `face.eyeShape` | `narrow` or `round` |
| `face.nose` | `straight`, `button` or `wide` |
| `face.freckles`, `face.lashes` | `true` or `false` |
| `hair.style` | `swoop`, `short`, `spiky`, `long`, `buzz`, `ponytail`, `buns` or `braids` |
| `hair.color` | a color |
| `top`, `bottom`, `belt`, `shoes` | clothing colors |
| `extras` | a list: `headband`, `cap`, `bow`, `earrings`, `glasses`, `sunglasses`, `wristbands` |
| `accent` | the color of your extras |
| `weapon` | `none`, `baseball-bat`, `tennis-racket`, `hockey-stick`, `lacrosse-stick` or `frying-pan` |

3. Set your `stats` (speed, power and jump from 1 to 10; health from 50 to 150), your `specials` (2 to 4 from the list in [`src/moves.ts`](src/moves.ts)), a `winQuote`, and a home `stage`.
4. Open <http://localhost:8002/?viewer> to look at yourself, or <http://localhost:8002/?fight=you,colin> to jump straight into a fight (use your file's name).

Only a first name and a look go in a character file. No last names or addresses, please!

### 4. Draw your own head (or anything else)

Don't like the drawn head? Put your own picture in:

```
public/assets/fighters/<your-id>/head.png
```

For example `public/assets/fighters/colin/head.png`. **Any size works:** the game scales your picture to fit. Use a transparent PNG (a photo cropped to your face, or a drawing). Face the picture toward the right, the way fighters face when they start on the left.

You can replace any body part the same way. The part names are: `head`, `headHit` (the ouch face), `neck`, `chest`, `waist`, `hips`, `knot` (the belt knot), `ua` (upper arm), `fa` (forearm), `thigh`, `shin`, `foot`, `fist`, `palm`, and `fistArmed` (a fist holding a weapon). A missing file just means the drawn part is used.

### 5. Add a stage, rename your special, make fireballs faster

**A new stage.** Open [`src/stages.ts`](src/stages.ts), copy a whole block (from `{` to `},`) to the end of the list, then change the `id`, the `name` and the colors. Pick props from the list at the top of the file. Then put `stage: "your-id"` in a fighter file to make it their home stage.

**Rename a special.** In your fighter file, each special is `{ type: "fireball", name: "DONUT BLAST", color: "#ff7ad9" }`. Change `name` and `color` to whatever you like. Try `"PIZZA ROCKET"`.

**Faster fireballs.** Add `speed: 1.5` to the special (0.5 is slow, 2 is fast). Want it to hurt more? Add `damageBonus: 3` (0 to 5).

**Make one normal punch hit harder or reach farther**, just for you: add it to `normals` in your file, like `"st.HK": { damage: 20, reach: 1.2 }`. (Edit [`src/moves.ts`](src/moves.ts) instead to change it for *everybody*.)

### 6. Challenges

- **A new special-move type.** Copy a block in `MOVE_TYPES` in [`src/moves.ts`](src/moves.ts) (say `"charge-dash"`), call it `"rocket"`, and change the numbers. Then add `"rocket"` to `MOVE_TYPE_NAMES` in [`src/fighter.ts`](src/fighter.ts) (the tests check they match) and give it to a fighter. Hint: look for the `🛠️ TRY THIS` comments in `moves.ts`.
- **A new animation, just by editing angles.** Open [`src/animations.ts`](src/animations.ts) and change the angles in a punch's poses (negative swings forward, positive swings back). Open `?viewer` and press N to watch it. Can you make a kick that goes straight up?
- **Faster and faster.** Can you make the fight speed up as the timer runs down? Hint: look at how `gameSpeed` is used in `src/scenes/FightScene.ts`.
- **A stage you love.** Can you make the sunset a rainy night? Hint: the sky colors in `stages.ts`.

### 7. Sounds

The game works quietly without sounds. To add some, drop an `.mp3` or `.ogg` file in `public/assets/sounds/` (effects) or `public/assets/music/` (music) with one of these names. The list, and the volume of each, lives in [`src/sounds.ts`](src/sounds.ts).

| Sound file | When it plays |
|---|---|
| `hit` | a light or medium hit lands |
| `heavy-hit` | a heavy hit or special lands |
| `block` | an attack is blocked |
| `whoosh` | an attack misses |
| `special` | a special move starts |
| `ko` | knocked out |
| `round` | "ROUND 1" |
| `fight` | "FIGHT!" |
| `you-win` | the match is won |
| `menu-move`, `menu-select` | moving and picking in menus |

Music (in `public/assets/music/`): `title`, `select`, `fight`.

🛠️ **Try this:** record yourself shouting "FIGHT!", save it as `fight.mp3` in `public/assets/sounds/`, and start a match.

### 8. Oops, I broke it

- Undo one file: `git checkout -- flynn-family-fighters/src/settings.ts` (use the path of the file you changed).
- Undo everything you changed in the game: `git checkout -- flynn-family-fighters`.
- Made a brand-new file that's causing trouble (like a fighter)? Delete it and the game forgets it ever existed.
- The default numbers are right in the table in "Easy tweaks" above: `roundTime` 99, `roundsToWin` 2, `gameSpeed` 1, `cpuDifficulty` 3, `damageScale` 1, `chipDamageFraction` 0.25, `dizzyEnabled` true, `throwTechEnabled` false, `motionWindowFrames` 20, `showHitboxes` false, `animationFps` 20.
- Run `npm test` to find out *why* something's wrong: it tells you in plain words.

---

## 🧑‍🔧 For Grown-Ups

- Run in Docker with the whole arcade: `docker compose up --build`, then <http://localhost:8000/flynn-family-fighters/> (or this game alone on port 8002).
- `npm test -w flynn-family-fighters` runs the tests. `npm run typecheck -w flynn-family-fighters` checks the types.

### Credits and licenses

- **Press Start 2P** font by CodeMan38, licensed under the SIL Open Font License 1.1. See [`public/assets/fonts/OFL.txt`](public/assets/fonts/OFL.txt).
- Everything else (the fighters, the stages, the effects) is drawn by code in this repo. There are no other third-party assets, and no sounds or music are included.
