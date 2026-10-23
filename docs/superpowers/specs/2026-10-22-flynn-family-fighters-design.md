# Flynn Family Fighters: Design Spec

**Date:** 2026-10-22
**Directory:** `flynn-family-fighters/` *(name is my call; easy to rename before building)*
**Port:** 8002 (dev server and Docker)
**Multiplayer server:** not used (local 1P vs CPU and 2P versus)
**New shared library:** `lib/rig` (paper-doll characters drawn from data)
**New project skill:** `/add-fighter` (`.claude/skills/add-fighter/`)

## Purpose

A one-on-one fighting game that plays like *Street Fighter II Turbo*: the same
moves, rules and feel. The difference is the fighters. Each one should look
like a Street Fighter character that was tweaked to look like a Flynn family
member: over-the-top heroic proportions, bold SF2-style shading, and that
person's hair, face, colors and gear. The roster is meant to keep growing:
adding a person means adding **one plain data file**, either by hand or with
the `/add-fighter` skill. No art gets drawn ahead of time, and no images are
generated or committed.

Like every game here, it's also a teaching tool (root `CLAUDE.md` §7). A kid
should be able to open their own character file, change their hair color or
make their fireball faster, and see it right away.

## Goals

- **SF2 Turbo gameplay**, including:
  - six attack buttons, blocking by holding back, and throws
  - special moves typed with joystick motions, and cancelling normal attacks into specials
  - hit stun, block stun, hit pause, chip damage, dizzies and knockdowns
  - timer rounds, best of three, and an adjustable game speed
- **A roster that's easy to grow:**
  - every fighter is one file in `src/characters/`, found automatically, with no list to update
  - a broken or half-finished file is skipped with a friendly message; it never blanks the game
- **Characters drawn from data.** A new shared paper-doll rig (`lib/rig`) does the drawing:
  - it draws each fighter at startup from body proportions, colors and parts picked from a shared parts library
  - animations are written once and shared by every fighter
- **An SF2 look, not 8-bit:**
  - big, exaggerated fighter bodies
  - hard-edged cel shading and thick outlines
  - an optional arcade pixel filter
  - over-the-top hit effects
  - This rig is the reusable "art upgrade" for future games.
- **Anyone in the family can be a fighter:** boys and girls, men and women, any size. Body type, fighting style and looks are separate settings that mix freely.
- **`/add-fighter` skill:** interviews a grown-up or kid about the person and writes the character file. It adds a new part to the parts library when the description needs one.

## Non-Goals (v1)

- **Online play.** The simulation is built so it could be added later (see "Simulation"), but no `lib/net` or server work happens now.
- **Super meters and super moves.** SF2 Turbo had none; they arrived in *Super Turbo*.
- Story mode, endings and cutscenes.
- Photos of family members, and AI image generation of any kind.
- Touch controls.
- Exact Capcom frame data. We aim for the *feel*, tuned by playing.

## Anti-Goals (a failure even if it works)

- **Copying Capcom.**
  - No Capcom names, sprites, music, sound effects, logos or character likenesses.
  - Move types get generic names ("fireball", "uppercut"), and each fighter gives its specials its own fun name.
- **Violence that isn't family-friendly** *(my guess at your intent)*.
  - No blood.
  - A knockout looks cartoony: dizzy stars, then the fighter flops down and pops back up for the next round.
  - Win quotes are friendly trash talk.
- **Sexualized bodies.** Every body type is strong and athletic, "action hero" proportions. No exaggerated curves or revealing outfits.
- **Adding a fighter needs code changes** beyond the character file. The exceptions: sometimes a new part in the library, or a new move type.
  - A new move type may bring a small amount of new behavior code, with tests. *(My call; a fully data-only move system would be much bigger to build.)*
- **A kid's tweak can crash the game**, for example a negative speed, a misspelled hairstyle or a missing special.
- **Personal data in the public repo.**
  - Character files hold a first name, a cartoon look and stats. Nothing else: no ages, last names, schools or photos.
  - "Weight" from a description becomes a body `build` (lean, medium, big).

## How It Fits the Repo

- New game directory `flynn-family-fighters/`, laid out per root `CLAUDE.md` §3. It follows the §9 checklist:
  - port 8002
  - compose service, prod block and workflow matrix entry
  - `arcade.ts`, plus its arcade nginx location blocks
  - README, with "How It Works" and "Make It Your Own"
  - a row in the root README games table
- Uses the existing libraries:
  - `lib/input` for keyboard and gamepads
  - `lib/audio` for optional sounds, skipped when missing
  - `lib/settings` (`clampSettings`) for kid-edited numbers
  - `lib/arcade` for `arcadeUrl()` and "QUIT TO ARCADE"
- New library `lib/rig`, so other games can use the paper-doll characters. It must not import from this game.
- **`CLAUDE.md` amendments in the same change:**
  - §4 port registry
  - §6 adds `lib/rig`
  - a note that project skills live in `.claude/skills/`
  - an Amendment Log line
- **Arcade cabinet:** `players: { min: 1, max: 2, coop: false }`. Screen art shows two fighters facing off.

## Screen & Look

- **Resolution:** a logical 960×540 canvas with `Scale.FIT` and WebGL.
- **Fighter style** (proven in the spike, see "Reference Spike" below):
  - **SF2 proportions:** fighters are big, about 55–60% of screen height, with broad shoulders, narrow waists, thick forearms, square jaws and heavy brows. The feminine frame is athletic in the same spirit.
  - **Cel shading:** each part gets a thick dark outline, a base color, two hard-edged shadow steps and one highlight band. There are no gradients.
  - **Back limbs** are tinted darker, so the near and far side read clearly.
- **Arcade pixel filter:** a camera pixelate effect (`PIXEL_FILTER` in settings, on by default) gives the chunky arcade look.
  - The HUD and text are drawn by a second camera without the filter, so they stay sharp.
- **Over-the-top effects:**
  - hit pause, with the defender shaking
  - starburst hit sparks
  - screen shake
  - a glowing special projectile in the fighter's special color, and the special's name shouted on screen
  - big "K.O.!" banners
- **Stage style:** bright and saturated, SF2-style: sunset skies, layered mountains, palm trees, and a crowd that bobs.
- **HUD (SF2 layout):**
  - top row: two health bars, the round timer in the middle, and names under the bars
  - round-win markers next to the names
  - "ROUND 1 / FIGHT!", "K.O." and "YOU WIN / PERFECT" banners
- **Stages:**
  - backgrounds drawn by code from a data list in `src/stages.ts`, with two or three parallax layers
  - starter stages are Woodland Hills places like the Super Flynn Bros levels: school yard, track, ball field and back yard
  - adding a stage means adding a data block

## Game Flow

1. **Title:** "FLYNN FAMILY FIGHTERS". Options: 1P ARCADE, 2P VERSUS, QUIT TO ARCADE.
2. **Character select:**
   - a grid of portraits, each rendered live from the rig as a close-up of the head and shoulders
   - P1 and P2 cursors and a big preview of the highlighted fighter
   - the grid grows automatically as fighters are added
3. **Versus screen:** both fighters posing, with names and "VS".
4. **Match:** best of three rounds (`ROUNDS_TO_WIN` in settings), 99-second timer.
5. **Arcade mode:** the player fights every other roster member in a shuffled order, then sees a "YOU'RE THE CHAMP!" screen.
6. **After a match:** rematch, back to character select, or quit to the title.

## Controls

**Six buttons, SF2 layout:**
- Light, Medium and Heavy Punch (LP, MP, HP)
- Light, Medium and Heavy Kick (LK, MK, HK)

**Keyboard** *(my call; works on a laptop, changeable in `settings.ts`)*:

| | Move | Punches LP/MP/HP | Kicks LK/MK/HK | Start |
|---|---|---|---|---|
| P1 | W A S D | R T Y | F G H | 1 |
| P2 | Arrow keys | I O P | K L ; | Enter |

- P2 also gets Numpad 4 5 6 / 1 2 3 as extra keys when a numpad exists.
- 2P on one keyboard can hit "key ghosting" limits, where some key combinations don't register. The README recommends gamepads for 2P.

**Gamepad (standard layout):**
- Punches: X, Y and RB.
- Kicks: A, B and RT.
- Movement: D-pad and left stick.
- Start: Start.
- Pads are assigned in order: the first pad goes to P1, the second to P2.

**Input rules:**
- "Forward" and "back" are relative to which way the fighter faces. Fighters always turn to face each other when grounded.
- Motion inputs are read from a short input history, about 20 frames.
  - Leniency lives in `settings.ts` (`MOTION_WINDOW_FRAMES`).
  - The defaults are generous, because kids are playing.

## Gameplay (SF2 Turbo rules)

**The simulation runs at a fixed 60 steps per second, counted in frames,** separate from rendering. All timing below is in frames.

### Moving
- Walking:
  - forward and back walk speeds come from the fighter's `speed` stat
  - back walk is slower
- Crouching.
- Jumps go straight up, forward or back, with a fixed arc. Jump height comes from the `jump` stat.
- Fighters push each other and can't pass through each other. The camera and the stage edges keep both on screen.

### Attacking
- **Normal attacks:** each button has a standing, crouching and jumping version, which makes 18 normal attacks.
  - All fighters share the same 18 normals and animations by default.
  - A character file can optionally override a few numbers per normal (`normals: { "st.HK": { damage: 14, reach: 1.2 } }`), clamped. *(My call: per-fighter identity comes from stats, size, specials and these small overrides. Per-fighter animations are out of scope for v1.)*
  - Medium and Heavy Punch close up use a "close" version, as in SF2.
- **Throws:** forward or back plus Medium or Heavy Punch, when close and the opponent isn't in hit or block stun.
  - Throws can't be blocked.
  - A tiny "tech" window to break a throw is my call. It's off by default, since Turbo didn't have one.
- **Special moves:** each fighter picks 2–4 from the move library (below), and each is typed with a motion.
- **Cancels:** some normal attacks can be cancelled into a special during their hit or block stop. Each move's data has a `cancellable` flag.

### Getting hit
- **Hit pause:** both fighters freeze for a few frames on contact, then the defender is in hit stun.
- **Blocking:** hold back while standing or crouching.
  - Standing blocks high and mid attacks; crouching blocks low and mid attacks.
  - Jump-ins hit high, sweeps hit low.
  - Blocking puts the defender in block stun and pushes them back.
- **Chip damage:** blocked special moves deal a small part of their damage (`CHIP_DAMAGE_FRACTION`).
- **Knockdowns:** sweeps, throws and some specials knock down. The fighter can't be hit while on the floor, then gets up.
- **Dizzy:** taking enough damage quickly (a hidden stun meter that drains over time) makes the fighter dizzy for a short time, with stars over the head.
  - Mashing buttons shortens it.
  - A knockout always wins over a dizzy.

### Combos
Combos come naturally from hit stun and cancels. There's no separate combo system. A combo counter appears for 2+ hits.

### Rounds
- **K.O.:** health reaches 0.
- **Time over:** the fighter with more health wins.
- **Draw:** both fighters win the round.

### Turbo speed
`GAME_SPEED` is 1–4 stars, as SF2 Turbo had. It speeds up the simulation step rate.

### Attack data
Every attack (normal, throw or special) is one data entry. Each has:
- **Timing:** startup, active and recovery frames.
- **Damage:** damage and chip damage.
- **Stun:** hit stun, block stun, hit pause and dizzy amount.
- **Hit box:** a rectangle relative to the fighter, plus where it hits (high, mid, low).
- **Effects:** pushback, and whether it knocks down.
- **Moving the fighter:** an optional projectile spawn, and optional movement (an uppercut rises, a spin kick travels).

### Hit boxes come from data, not from the art
- Each fighter's hurt boxes are a few rectangles (standing, crouching, jumping, and per attack).
- They scale slightly with `height`, so a tall fighter is a bigger target with a little more reach. *(My call. This makes looks and gameplay match a bit without letting looks dominate.)*
- `settings.ts` has `SHOW_HITBOXES`, a debug view kids will love.

### Move library (`src/moves.ts`)
Generic move types, shared by everyone. A fighter picks a type and gives it a name and look.

| Type | Input | Behavior |
|---|---|---|
| `fireball` | ↓↘→ + P | Projectile; LP/MP/HP = slow/medium/fast |
| `uppercut` | →↓↘ + P | Rising, invincible at start, big recovery |
| `spin-kick` | ↓↙← + K | Travels forward through the air, multi-hit |
| `charge-dash` | hold ← 45f, → + P | Fast forward lunge |
| `flip-kick` | hold ↓ 45f, ↑ + K | Rising arc kick |
| `rapid-hits` | tap P 5× fast | Flurry in place |
| `command-throw` | 360° + P | Close range, unblockable, big damage |

- A special can carry tweakable values: the fireball's speed, `damageBonus` and `color`. Values are clamped.
- Weapons are mostly visual. A weapon appears in the fighter's hand and changes how specials look: a bat-swing uppercut, a thrown baseball fireball. It doesn't change balance. *(My call.)*
- The skill (and a kid) can add a new move type here as a data block, plus any new behavior code it needs.

### Computer opponent
- The CPU plays by pressing **virtual buttons through the same input path** as a player, so it can't break the rules.
- Its decisions come from simple rules based on distance and state: walk in, anti-air a jump, block, punish whiffed attacks, throw fireballs from range.
- Reaction delay and mistakes scale with `CPU_DIFFICULTY` (1–8).
- Later opponents in arcade mode get slightly harder.

## Characters

### One file per fighter: `src/characters/<name>.ts`
- **Discovery:** found with a lazy `import.meta.glob("./characters/*.ts")`, loading each file with its own try/catch and `Promise.allSettled`, the same way the arcade loads `arcade.ts` files. There's no index to edit.
- **Validation:** each file is checked and cleaned up when the game starts:
  - unknown parts become a default
  - numbers are clamped (`lib/settings`)
  - unknown specials are dropped
  - a missing name gets the file's name
- **Broken files:** if a file fails to load at all, the fighter is left out. A friendly message appears on the select screen ("colin.ts has a problem: …"), and the rest of the roster still works.
- **Starter roster:** **Colin** (martial artist, tall blonde, blue gi, headband) and **Ryan** (street brawler, backwards red cap, green tank top, jeans, fingerless gloves), as in the spike *(my call; they're already in the public repo)*. Everyone else is added over time with `/add-fighter`.

### Example
```ts
// 🥊 COLIN — edit anything here and save to see it change!
import type { Fighter } from "../fighter";

export const fighter: Fighter = {
  name: "COLIN",
  look: {
    body: "masculine",        // masculine | feminine (the body's frame)
    archetype: "martial",     // martial | brawler (fighting style + outfit)
    height: 1.08,             // 0.85 (short) to 1.15 (tall)
    build: "lean",            // lean | medium | big
    muscle: 1.15,             // 0.8 (wiry) to 1.4 (HUGE)
    skin: "#f1c08f",
    eyes: "#3b6fb6",
    face: { expression: "determined", jaw: "square", brows: "heavy" },
    hair: { style: "swoop", color: "#f7d35c" },
    top: "#2f6fd6",           // gi jacket / tank top color
    bottom: "#2f6fd6",        // gi pants / jeans / leggings color
    belt: "#1d1d1d",
    shoes: "#ffffff",         // bare feet for martial artists
    extras: ["headband"],     // headband, cap, bow, earrings, glasses, wristbands…
    accent: "#e8e8e8",        // color for extras
    weapon: "none",           // or "baseball-bat", …
  },
  stats: { speed: 7, power: 5, health: 100, jump: 6 },   // 1–10 (health 50–150)
  specials: [
    { type: "fireball", name: "DONUT BLAST", color: "#ff7ad9" },
    { type: "uppercut", name: "HOME RUN SWING" },
  ],
  winQuote: "Race you home!",
  stage: "track",             // home stage in versus (optional)
};
```

- **Forgiving types** *(my call)*. Choice fields use the "known names or any string" pattern, e.g. `type HairStyle = "swoop" | "buzz" | … | (string & {})`. Editors still autocomplete the known names, but a typo doesn't fail `npm run typecheck`, which would block CI and image publishing for the whole arcade. The runtime fallback handles typos. Tests feed in deliberately bad character files and expect them to be accepted and cleaned up.
- Types for `Fighter` live in the game.
- Types for `Look` live in `lib/rig`, so other games can use a family member's look as-is.

### Optional drawings
Following §7 swappable art, a kid can drop a PNG into `public/assets/fighters/<name>/` to replace one part: for example `head.png`, scaled to fit the head's spot. Missing files are ignored.

## `lib/rig`: Paper-Doll Characters

**Skeleton.** A fixed skeleton of 17 bones, as in the spike:
- **Root:** the hips, with a belt-knot bone.
- **Upper body:** a waist and a chest (two bones, so the spine can bend), then the head.
- **Arms:** upper arm, forearm and hand on each side.
- **Legs:** thigh, shin and foot on each side.

Bone lengths and widths come from `height`, `build`, `muscle` and `body`.

**Feet stay on the floor.** After each pose the rig finds the lower foot and puts it on the ground, so poses never have to say how high the body is (except jumps).

**Body frames** (`body`). Each frame is a proportion table:
- **Masculine:** wide shoulders, narrow waist, thick neck, big hands, square jaw.
- **Feminine:** narrower shoulders, a defined waist, wider hips, strong legs, a slimmer neck, smaller hands, a softer jaw, lashes and lip color.

Both mix with every archetype, height, build and muscle value. New frames can be added later the same way, e.g. an `age` option for grandparents.

**Archetypes** (`archetype`) choose the outfit parts and gear:
- **martial:** gi jacket with a V-neck, torn sleeves, a belt with tails, baggy flared pants, bare feet and wrapped hands. For the feminine frame there's also a sleeveless tunic with leggings.
- **brawler:** tank top or hoodie, jeans or leggings, a buckle belt, fingerless gloves and sneakers or high-tops.
- More archetypes (a soldier, a wrestler, a sports star) are new outfit-part sets.

**Parts library (`lib/rig/src/parts/`).** Every part is a data entry plus a small draw function that returns shapes in the colors given:
- **Hair:** swoop, short, spiky, long, buzz, ponytail, twin buns and braids.
- **Faces:** this is where likeness comes from. Faces are built from options:
  - jaw shape
  - brows
  - eye shape
  - nose
  - mouth and expression (determined, grin)
  - freckles and lashes
- **Outfit parts per archetype.**
- **Extras:** headband with tails, backwards cap, bow, earrings, glasses, sunglasses and wristbands.
- **Weapons.**

Starter set *(my call)*: everything the spike has, plus the feminine frame, about 8 hairstyles, a face library big enough that the first several family members look different from each other, and about 6 extras. Adding a part = adding one entry.

**How parts are drawn (proven in the spike).**
- **Shapes:** every shape is a polygon. Ellipses become polygons too.
- **Paint passes:**
  1. a thick outline pass for all outlined shapes, so overlapping shapes merge into one silhouette
  2. a fill pass
  3. cel shading made by clipping each polygon against a half-plane, for the shadow, deep-shadow and highlight bands
  4. detail lines (muscle lines, folds, knuckles)
- **Textures:** at startup each fighter's parts are drawn once into textures (`generateTexture`). Each part draw function returns its own bounding box, so the joint position becomes the sprite's origin.
- **On screen:** a fighter is a Phaser Container of part sprites, one per bone, positioned with forward kinematics each frame. Only sprites move and rotate; nothing is redrawn. The container's x-scale flips the fighter to face left.

**Swaps per keyframe.** A keyframe can swap a part's texture for that moment:
- hands: fist or open palm
- face: normal, hit, or (later) yell and win
- This is the cheapest way to make moves read like hand-drawn SF2 frames. Add more swaps where a move needs them.

**Secondary motion** *(nice-to-have)*: ponytails, braids, headband tails and belt tails can swing a little behind the movement.

**Poses and animations.**
- A pose is a list of joint angles plus a hips offset.
- An animation is a list of keyframes: pose plus how many frames to hold it.
- In-between frames come from easing between keyframes. Snapping is an option per keyframe, for crisp hit frames.
- `lib/rig` knows nothing about fighting; it just plays named animations.

**Fighter animations** live in the game (`src/animations.ts`), all written once and shared by every character:
- movement: idle, walk forward, walk back, crouch, jump (three directions)
- the 18 normal attacks, throws, and one per move type
- defense: block (standing and crouching), hit (high and low), knockdown, get up
- endings: dizzy, win, lose

A kid can tweak a punch by editing angles.

**Portraits** use the same rig with a close-up pose and a crop.

## `/add-fighter` Skill

Lives in `.claude/skills/add-fighter/SKILL.md`, checked in, so anyone working in this repo with Claude Code can run it.

1. **Interview,** one question at a time, kid-friendly:
   - name, and a boy/man or girl/woman body frame
   - fighting style (martial artist or street brawler) and how over-the-top muscly
   - how tall compared to others, and body build
   - face: jaw, brows, eyes, nose, freckles, glasses (likeness lives here)
   - skin, hair and eye colors; hairstyle
   - favorite clothes and colors
   - an accessory and a weapon or prop
   - personality, which guides the stats
   - 2–3 signature moves, each described and named
   - a win quote
   - a home stage
2. **Map** the answers to the closest existing parts and move types. If something isn't in the library (a ponytail, a lacrosse stick), add a new part or move type in the same change, following the existing entries.
3. **Keep it fair:** turn personality into stats around the roster average, nudged up or down, so a new fighter isn't strictly better than everyone else.
4. **Write** `src/characters/<name>.ts` with friendly comments.
5. **Check:** run the typecheck and tests, start the dev server, and tell the person how to see their fighter.
6. **Privacy:** never write anything but a first name, the look, stats and quotes.
7. **Commit** following the repo's usual git rules.

## Kid Tweaks (`src/settings.ts`)

- **Match:** `ROUND_TIME`, `ROUNDS_TO_WIN`, `GAME_SPEED`, `CPU_DIFFICULTY`
- **Combat:** `DAMAGE_SCALE`, `CHIP_DAMAGE_FRACTION`, `DIZZY_ENABLED`, `THROW_TECH_ENABLED`
- **Input and debug:** `MOTION_WINDOW_FRAMES`, `SHOW_HITBOXES`
- **Controls:** the key and button bindings

Every value has a comment with a safe range and is clamped.

**README "Make It Your Own"** covers:
- making yourself a fighter, with `/add-fighter` or by copying a file
- changing your look, and renaming and recoloring your specials
- making fireballs faster, and drawing your own head PNG
- adding a stage
- adding a new move type (a challenge)
- writing a new animation by editing angles
- "Oops, I broke it"

## Simulation & Testing

- **Pure game logic, separate from Phaser:**
  - covers the input history and motion reader, the fighter state machine, attack data, hit detection, block and hit resolution, damage, dizzy, rounds and the timer
  - takes inputs in and gives state out, one fixed step at a time
  - is deterministic (no `Math.random` inside the logic; it uses a seeded random), which keeps online play possible later
- **Vitest** tests the pure logic:
  - motion reading, including leniency and facing flips
  - high/low/mid blocking
  - chip damage, throw rules, cancel windows and dizzy
  - round and time-over outcomes
  - character file validation and clamping
  - rig bone-length math
- **Phaser scenes** only draw state and play animations.
- **Audio:** optional hit, block, KO, announcer and music files through `lib/audio`, listed in the README.

## Branching

Build on a feature branch. Pushes to `main` publish images and appear in the live arcade, so the game merges only when it's playable. *(My call.)*

## Reference Spike

`docs/superpowers/specs/2026-10-22-flynn-family-fighters-spike.html` is the throwaway prototype this design was approved from.
- **What it shows:** Colin vs Ryan with idle, walk, punch, kick, special, hit, dizzy and win; the cel-shaded parts; the pixel filter with an unfiltered HUD camera; and a live character-file editor.
- **How to run it:** put Phaser's `phaser.min.js` next to it (copy from `node_modules/phaser/dist/`) and serve the folder.
- **It's a reference for look and feel, not code to keep.** Its shapes, colors and poses are a good starting point for the real parts library and animations.

## Left to the Builder

- Exact frame data, damage numbers and walk speeds, tuned by playing so it *feels* like Turbo.
- CPU decision details.
- Part shapes and drawing details, within the style above.
- Stage art.
- Internal module layout beyond the files named here.
- Whether `lib/rig` easing uses Phaser tweens or its own math. It must stay frame-exact in step with the simulation.
- Build order. A sensible path:
  1. rig plus a posing viewer
  2. movement and normal attacks
  3. hits, blocking and rounds
  4. specials
  5. the CPU
  6. screens
  7. the skill
  8. repo integration
