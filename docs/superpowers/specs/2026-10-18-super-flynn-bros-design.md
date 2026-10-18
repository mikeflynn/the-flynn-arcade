# Super Flynn Bros — Design Spec

**Date:** 2026-10-18
**Game directory:** `super-flynn-bros/`
**Port:** 8001
**Multiplayer server:** not used (local only)

## Purpose

An 8-bit side scroller in the style of the original Super Mario Bros, starring
the Flynn brothers walking around Woodland Hills, CA. Like every game in The
Flynn Arcade, it is also a teaching tool: kids should be able to recolor or
redraw the heroes, tune difficulty, add hazards, and build levels by editing
plain text files (see root `CLAUDE.md` §7).

## Heroes

| | Colin | Ryan |
|---|---|---|
| Look | Older, taller, blonde | Shorter, brown hair |
| Sprite size | 16×32 px | 16×24 px |
| Stats | Higher jump | Faster run, smaller hitbox |

Stats live in `src/heroes.ts` and are tunable. Both heroes must be able to
finish every level with default values.

## Game Modes & Controls

The title screen offers **1P Colin**, **1P Ryan**, and **2P Co-op** (P1 = Colin,
P2 = Ryan).

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | ← → | A / D |
| Jump | ↑ or Space | W |
| Gamepad | Gamepad index 0 | Gamepad index 1 |
| Pause | Esc / Start (either player) | |

In 1P mode, P1 controls work on both keyboard sets and gamepad 0.

## Movement

- Mario-style: acceleration, deceleration (slight slide), max run speed.
- Variable jump height: releasing jump early cuts upward velocity.
- Short coyote time (~80 ms) and jump buffer (~100 ms) for kid-friendly feel.
- All values in `src/settings.ts` and per-hero in `src/heroes.ts`.

## Hearts, Damage, Respawn

- Each player has **3 hearts** (configurable).
- Touching a hazard: −1 heart, small knockback, ~1.5 s invulnerability (blinking).
- Falling into a pit: −1 heart, respawn at last safe ground position.
- 0 hearts (1P): restart the current level. No lives, no game over.
- Co-op: a player at 0 hearts respawns beside their brother with 1 heart after
  a 2 s delay. If both are at 0 at the same time, the level restarts.

## Items

| Item | Effect |
|---|---|
| **Donut** | +10 score (the game's "coin") |
| **Double-double burger** (generic 8-bit burger, red/yellow wrapper, no logos) | +1 heart, up to max |

Defined in `src/items.ts`.

## Camera

- Follows the player furthest along to the right and only scrolls forward,
  like the original. Players can't walk off the left edge of the screen.
- Co-op: a trailing player who touches the left edge of the camera is pushed
  along, so nobody gets stuck off-screen.
- Logical resolution **320×180**, scaled to fit the window with pixel-perfect
  (nearest-neighbor) scaling.

## Levels

Each level is about 1–2 minutes long, uses 16×16 tiles, and has three
parallax background layers (sky + Santa Monica Mountains, far houses/palms,
near fences/hedges).

| # | Destination (goal tile) | Theme | Introduces |
|---|---|---|---|
| 1 | School gate | Quiet morning street | Dog (patrol), sprinkler (toggle), curbs/trash bins |
| 2 | Track | Busier street, strip mall | Slow neighbor (slowWalk), skateboarder (rollAcross), parked cars as platforms |
| 3 | Baseball diamond | Along a park | Loose baseball (bounce), lawn mower (patrol, faster), low fences, dugout roofs |
| 4 | Flynn house front door | Sunset palette | Mix of all + chasing dogs (chase) |

Reaching the goal shows a **"You made it!"** card (score, time) and then the
next level. After level 4, a **"Home sweet home!"** ending screen with total
score. Furthest unlocked level is saved in `localStorage` (wrapped in
try/catch), and the title screen allows picking any unlocked level.

All hazards are friendly-looking (wagging tails, waving neighbors). They are
obstacles, not enemies, and can't be defeated or stomped. Landing on top of
one is treated the same as touching it.

## Hazard Behaviors

A fixed set of reusable behaviors in `src/engine/Hazard.ts`:

| Behavior | Description | Params |
|---|---|---|
| `patrol` | Walks back and forth, turns at walls/ledges | `speed` |
| `slowWalk` | Walks one direction slowly, turns at walls | `speed` |
| `rollAcross` | Moves fast in one direction, despawns off-screen; activates when near the camera | `speed`, `direction` |
| `bounce` | Hops in arcs while moving horizontally | `speed`, `bounceHeight` |
| `chase` | Moves toward the nearest player once within range | `speed`, `range` |
| `toggle` | Stationary, alternates harmful/harmless (e.g. sprinkler spray) | `onMs`, `offMs` |

## Kid-Editable Data Formats

### Pixel art
```ts
export const colin = {
  name: "Colin",
  colors: { H: "#f2d16b", S: "#f1c27d", T: "#2e6fd8", P: "#3a3a5a", K: "#222" },
  frames: {
    idle: [ "....HHHH....", "...HHHHHH...", /* … */ ],
    walk1: [ /* … */ ],
    walk2: [ /* … */ ],
    jump:  [ /* … */ ],
  },
  stats: { runSpeed: 140, jumpPower: 330 },
};
```
- `.` is transparent; each other character maps through `colors`.
- Rows of unequal length are padded with transparency (with a console warning).
- Unknown characters render magenta (with a console warning).
- PNG override: if `public/assets/<spriteKey>.png` exists, it replaces the
  text-grid art (a frame strip of equal-width frames). A missing PNG silently
  falls back.

### Hazards / items
Entries in `src/hazards.ts` / `src/items.ts` with `key`, `mapChar`, `art`,
`behavior`, and behavior params. Adding a new hazard = copy an entry, draw,
pick a behavior, choose an unused map letter.

### Level maps
```ts
export const level1 = {
  name: "Walk to School",
  theme: "morning",          // picks palette + background layers
  timeOfDay: "morning",
  map: [
    "                                                     ",
    "            ooo                                      ",
    "                       D        S              G     ",
    "1     ====       B                                   ",
    "##############   ######################  ############",
  ],
};
```
A shared legend (in `src/levels/legend.ts`) maps characters to tiles, items,
hazards, and markers: `#` sidewalk/ground, `=` platform (curb, car roof), `B`
trash bin, `o` donut, `b` burger, `1`/`2` player starts, `G` goal, letters for
hazards from `hazards.ts`. Unknown characters render as a "?" block with a
console warning.

### Safety nets
- `settings.ts` values validated on load: out-of-range values clamped to a
  safe range with a friendly console warning.
- Maps missing a player start or goal: a default start at the far left / goal
  at the far right is added, with a warning.

## Sound & Music

The audio *system* is built now. The audio *files* are added later. **Any
missing sound or music file is skipped silently**: no errors, no crash, and
the game plays normally without it.

### Sound effects

| Key | When it plays |
|---|---|
| `jump` | A hero jumps |
| `land` | A hero lands (soft, optional) |
| `donut` | A donut is collected |
| `burger` | A burger is collected (heart restored) |
| `hurt` | A hero touches a hazard |
| `fall` | A hero falls into a pit |
| `respawn` | A co-op brother pops back in |
| `levelRestart` | Both heroes / the solo hero ran out of hearts |
| `goal` | A hero reaches the destination |
| `menuMove` / `menuSelect` | Title and pause menu navigation |
| `pause` | Pause toggled |
| `bark` | A dog starts chasing (level 4 chasers; optional flavor) |

### Music

| Key | Where |
|---|---|
| `title` | Title screen (loops) |
| `level1` … `level4` | Each level (loops). A level file can name a different track via `music: "<key>"` |
| `levelComplete` | "You made it!" card (plays once) |
| `ending` | "Home sweet home!" screen |

Music crossfades (~500 ms) between scenes.

### Files and the kid-editable list
- `src/sounds.ts` 🛠️ maps each key to a file name and its own volume:
  ```ts
  // Want your own jump sound? Record it, save it as jump.mp3 in
  // public/assets/sounds/, and you're done!
  export const sounds = {
    jump:  { file: "jump",  volume: 0.6 },
    donut: { file: "donut", volume: 0.5 },
    // …
  };
  export const music = {
    title:  { file: "title",  volume: 0.5 },
    level1: { file: "level1", volume: 0.5 },
    // …
  };
  ```
- Sound effects live in `public/assets/sounds/`, music in `public/assets/music/`.
- Each key is requested as `<file>.ogg` and `<file>.mp3`. Phaser picks the
  format the browser supports, so either is fine.
- A file that fails to load (404, bad format) is recorded as missing. Calls to
  play it become no-ops, and a single friendly `console.info` lists the missing
  files once per session ("No sound for: jump, donut. Add files to
  public/assets/sounds/ to hear them!"). It's never an error or a crash.

### Volume & controls
- `settings.ts`: `musicVolume` and `sfxVolume` (0–1, clamped).
- **M** key (or gamepad Select/Back) toggles mute. The pause menu has a mute
  option. Mute state is saved in `localStorage` (wrapped in try/catch).
- Browser autoplay rules: audio unlocks on the first key/button/click (the
  title screen's "press start"), so nothing tries to play before that.

### Implementation
- `src/engine/audio.ts`: a small wrapper (`playSfx(key)`, `playMusic(key)`,
  `stopMusic()`, `toggleMute()`) over Phaser's sound manager. It tracks loaded
  vs. missing keys and never throws.
- It stays inside the game for now. Per `CLAUDE.md` §6, it gets promoted to
  `lib/audio` when a second game needs it.

### README
"Make It Your Own" gains a **"Make your own sounds"** step: record a sound on
a phone or computer, export it as `.mp3`, name it after a key in `sounds.ts`,
and drop it into `public/assets/sounds/`.

## Code Structure

```
super-flynn-bros/
├── README.md
├── package.json, tsconfig.json, vite.config.ts, index.html, Dockerfile
├── public/assets/                 # optional PNG overrides
│   ├── sounds/                    # sound effects (added later; optional)
│   └── music/                     # music tracks (added later; optional)
└── src/
    ├── settings.ts                # 🛠️ global physics, hearts, camera, scoring
    ├── heroes.ts                  # 🛠️ Colin, Ryan
    ├── hazards.ts                 # 🛠️ hazard definitions
    ├── items.ts                   # 🛠️ donut, burger
    ├── sounds.ts                  # 🛠️ sound effect + music file list and volumes
    ├── levels/
    │   ├── legend.ts              # 🛠️ map character legend
    │   ├── themes.ts              # 🛠️ palettes + background layers per theme
    │   ├── level1-school.ts       # 🛠️
    │   ├── level2-track.ts        # 🛠️
    │   ├── level3-baseball.ts     # 🛠️
    │   ├── level4-home.ts         # 🛠️
    │   └── index.ts               # level order
    ├── main.ts
    ├── scenes/  TitleScene, PlayScene, HudScene, PauseScene, LevelCompleteScene, EndingScene
    └── engine/
        ├── pixelArt.ts            # text grid → canvas texture; PNG override
        ├── levelLoader.ts         # map → tiles/entities (pure, testable)
        ├── validate.ts            # settings clamping (pure, testable)
        ├── Hero.ts
        ├── Hazard.ts
        ├── camera.ts
        ├── audio.ts               # sfx/music wrapper; missing files are no-ops
        └── progress.ts            # localStorage unlocks + mute state
```

### Shared library: `lib/input`
New workspace package `@web-games/input`: maps keyboard and Gamepad API input
to per-player logical actions (`left`, `right`, `jump`, `pause`) with
configurable bindings. It's game-agnostic and reusable by later games.

### Repo-level setup (first game)
- Root `package.json` with npm workspaces (`super-flynn-bros`, `lib/*`).
- Root `tsconfig.base.json`.
- `docker-compose.yml` service `super-flynn-bros` on port 8001.
- Root `README.md` games table row; `CLAUDE.md` port registry row.

## README (game)

Follows `CLAUDE.md` §3/§7: How to Play, How It Works (scenes, game loop,
pixel-art pipeline, level loader), Make It Your Own (easy tweaks, make the
hero look like you, add a hazard, build a level, challenges, "Oops, I broke
it").

## Testing

- **Vitest** unit tests for pure engine modules: `pixelArt` grid parsing,
  `levelLoader` (valid maps, unknown chars, missing start/goal), `validate`
  (clamping), `lib/input` binding resolution, and the audio wrapper's
  missing-file handling (playing an unloaded key is a no-op and doesn't throw).
- Manual check: with `public/assets/sounds/` and `music/` empty, the game runs
  with no console errors from the game code. (The browser may still log 404s
  in the network panel.)
- `npm run typecheck` and `npm run build` pass.
- Manual browser playthrough: each level is finishable with Colin, with Ryan,
  and in co-op.
- `docker compose up --build super-flynn-bros` serves the game on
  `http://localhost:8001`.

## Out of Scope (for now)

- Creating the sound effect and music files themselves (the system is built
  now; files get dropped in later)
- Online multiplayer
- Touch controls
- A level editor UI
