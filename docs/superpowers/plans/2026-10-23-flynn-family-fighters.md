# Flynn Family Fighters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Flynn Family Fighters, an SF2 Turbo–style 1-on-1 fighting game on port 8002.
- Every fighter is one data file, drawn at startup by a new shared paper-doll rig (`lib/rig`).
- A `/add-fighter` Claude Code skill writes new fighter files.

**Architecture:** Three layers, each testable on its own.
1. **`lib/rig`** (`@web-games/rig`): Phaser-free code turns a `Look` into cel-shaded part shapes, a skeleton, poses and forward kinematics. A thin `src/phaser/` adapter turns those into textures and a container of sprites.
2. **`flynn-family-fighters/src/engine/`**: a pure, deterministic, frame-counted fight simulation. `stepMatch(state, [p1Input, p2Input])` mutates state and returns events. It has no Phaser and no `Math.random`.
3. **Phaser scenes**: only draw the simulation's state (rig poses, effects, HUD) and send in inputs from `lib/input` or the CPU.

**Tech Stack:** TypeScript 5.9.3 (strict), Vite 7.3.7, Phaser 3.90.0 (WebGL), Vitest 5.0.5, npm workspaces, nginx 1.27 (Docker), GitHub Actions → GHCR.

**Spec:** `docs/superpowers/specs/2026-10-22-flynn-family-fighters-design.md`.
- **Look-and-feel reference:** `docs/superpowers/specs/2026-10-22-flynn-family-fighters-spike.html`.
- **Port, don't invent:** port its part shapes, colors, poses and paint passes from there.

## Global Constraints

- **Branch:** work on `flynn-family-fighters`, created from `main` in Task 1. Merge only when playable; pushes to `main` deploy to the live arcade.
- **Versions:** same as the rest of the repo: `phaser` 3.90.0, `vite` 7.3.7, `vitest` 5.0.5, `typescript` 5.9.3, Node 22.
- **Port 8002:** dev server, preview, and Docker host port.
- **Canvas:** logical 960×540, `Phaser.WEBGL`, `Scale.FIT`, `pixelArt: false`.
  - Pixel filter: `cameras.main.postFX.addPixelate(1)` when `PIXEL_FILTER` is on.
  - The HUD and all text live on a second camera with no filter.
- **No Capcom anything:** no Capcom names, sprites, music, sounds, logos or character likenesses. Move types have generic names; fighters name their own specials.
- **Family-friendly:**
  - No blood.
  - Knockouts are dizzy stars and flops.
  - Bodies are athletic "action hero" for every frame, never sexualized.
- **Privacy:** character files hold only a first name, the look, stats, specials, a win quote and a stage.
- **Kid-editable files never import Phaser:**
  - `src/settings.ts`, `src/controls.ts`, `src/sounds.ts`, `src/stages.ts`, `src/moves.ts`, `src/animations.ts`, `src/characters/*.ts`
  - `arcade.ts`
- **Forgiving types:** choice fields use `"a" | "b" | (string & {})`.
  - A typo must never fail `npm run typecheck`, because CI runs it before publishing images.
  - The runtime normalizers fix typos, with a friendly `console.warn`.
- **Purity:**
  - `lib/rig/src/**` must not import Phaser, except under `lib/rig/src/phaser/`.
  - `flynn-family-fighters/src/engine/**` must not import Phaser.
  - The engine uses only its seeded `Rng`, never `Math.random`.
- **Timing:** the simulation runs at a fixed 60 steps/second × the `GAME_SPEED` multiplier `[1, 1.15, 1.3, 1.5]`. All durations are in frames.
- **Setting names:** kid settings use camelCase keys in a `mySettings` object (e.g. `roundTime`), matching `super-flynn-bros/src/settings.ts`. The spec's `ROUND_TIME`-style names map one-to-one.
- **Tests:** in `tests/**/*.test.ts` per package, Vitest `environment: "node"`. Every task leaves `npm test` and `npm run typecheck` green at the root.

## Review Focus

1. **A broken or silly character file:**
   - Examples: `look` missing, `height: "tall"`, `specials: [{ type: "laser" }]`, a file that throws on import, a duplicate name.
   - Expected: the file is cleaned or skipped with a friendly message on the select screen, and the rest of the roster works.
   - If no fighters are valid, a friendly "add a fighter" screen shows instead of a crash.
   - Owner: Task 8.
2. **Both players pick the same fighter, or the roster has only one fighter.**
   - Expected: a mirror match, with P2 in alternate colors so you can tell them apart.
   - Owner: Task 3 (`alternateColors`) and Task 17.
3. **Both attacks connect on the same frame (a trade).** Expected: both take damage and both go into hit stun; neither is ignored. Owner: Task 11.
4. **A fighter is pinned in the corner, or jumps over the opponent.**
   - Expected: pushback moves the attacker instead; nobody leaves the stage; facing flips after a cross-over.
   - Owner: Tasks 10–11.
5. **The tab is hidden for a while, or the computer is slow.** Expected: the game doesn't fast-forward dozens of frames on return. Each render runs at most 5 simulation steps. Owner: Task 16 (`stepsToRun`).

---

## File Structure

```
lib/rig/                         NEW @web-games/rig
  src/color.ts                   hex(), mix(), darken(), lighten()
  src/geometry.ts                Pt, pts(), ellipse(), clipHalfPlane()
  src/paint.ts                   Layer, Line, PartShape, paintCommands() → DrawCmd[]
  src/look.ts                    Look type, DEFAULT_LOOK, option lists, normalizeLook(), alternateColors()
  src/body.ts                    BodyDims, bodyDims()
  src/skeleton.ts                Bone, skeleton()
  src/kinematics.ts              solvePose(), groundOffset()
  src/pose.ts                    Pose, Keyframe, Animation, samplePose(), animLength(), flatFeet()
  src/parts/body.ts              chest, waist, hips, knot, ua, fa, thigh, shin, foot (per archetype × frame)
  src/parts/hands.ts             fist, palm, fistArmed (fist + weapon)
  src/parts/head.ts              head + headHit (face options, hair, extras)
  src/parts/hair.ts              HAIR outlines + back pieces
  src/parts/weapons.ts           weapon shapes
  src/parts/index.ts             buildParts(look, dims) → Record<PartName, PartShape>
  src/phaser/textures.ts         buildRigTextures(), textureLayout()
  src/phaser/RigSprite.ts        RigSprite (container, setPose, facing, bones overlay)
  src/phaser/portrait.ts         renderPortrait()
  src/index.ts                   re-exports (NOT the phaser/ folder; that's "@web-games/rig/phaser")
flynn-family-fighters/           NEW game (port 8002)
  arcade.ts  index.html  vite.config.ts  package.json  tsconfig.json  Dockerfile  nginx.conf  README.md
  public/assets/{sounds,music,fighters}/   (empty, .gitkeep)
  src/settings.ts  controls.ts  sounds.ts  stages.ts  moves.ts  animations.ts   (kid files)
  src/characters/colin.ts  ryan.ts
  src/fighter.ts                 Fighter type, normalizeFighter()
  src/roster.ts                  loadRoster() via lazy import.meta.glob
  src/engine/input.ts            InputFrame bits, toRelative(), InputHistory, motion matchers
  src/engine/types.ts            FighterState, MatchState, MatchEvent, Box, AttackData
  src/engine/rng.ts              Rng (mulberry32)
  src/engine/movement.ts         walking, crouch, jump, facing, push, walls
  src/engine/combat.ts           attack phases, boxes, hit/block/trade resolution, hitstop, chip, combo
  src/engine/throws.ts           throws, tech
  src/engine/specials.ts         move-type behaviors, cancels, projectiles
  src/engine/match.ts            createMatch(), stepMatch(), rounds, timer, KO, dizzy, knockdown
  src/engine/cpu.ts              CpuBrain
  src/engine/ladder.ts           arcade-mode opponent order
  src/render/FighterView.ts      state → animation → RigSprite
  src/render/effects.ts          sparks, projectiles, dizzy stars
  src/render/hud.ts              health bars, timer, names, round markers, banners, combo counter
  src/render/stageView.ts        stage drawing from stages.ts
  src/render/loop.ts             stepsToRun()
  src/scenes/BootScene.ts TitleScene.ts SelectScene.ts VersusScene.ts FightScene.ts ChampScene.ts ViewerScene.ts
  src/main.ts  src/vite-env.d.ts
.claude/skills/add-fighter/SKILL.md   NEW
MODIFY: package.json (workspaces), docker-compose.yml, docker-compose.prod.yml, .github/workflows/images.yml,
        arcade/nginx.conf, CLAUDE.md, README.md
```

---

### Task 1: Branch, `lib/rig` package, color + geometry + paint commands

**Files:**
- Create: `lib/rig/package.json`, `lib/rig/tsconfig.json`, `lib/rig/src/{color,geometry,paint,index}.ts`
- Test: `lib/rig/tests/geometry.test.ts`, `lib/rig/tests/paint.test.ts`

**Interfaces:**
- Produces:
  - `hex(s: unknown, fallback: number): number`, `mix(a: number, b: number, f: number): number`
  - `darken(c: number, f = 0.3): number` (mixes toward `0x1a1030`), `lighten(c: number, f = 0.3): number` (toward white)
  - `type Pt = { x: number; y: number }`, `pts(a: [number, number][]): Pt[]`
  - `ellipse(x, y, w, h, n = 22): Pt[]`, `clipHalfPlane(poly: Pt[], nx: number, ny: number, d: number): Pt[]` (keeps `nx*x + ny*y <= d`)
  - `interface Layer { p: Pt[]; c: number; outline?: boolean; ink?: boolean; shade?: number; tilt?: number; deep?: number; hi?: number }`
  - `interface Line { p: [number, number][]; w?: number; c?: number }`
  - `interface PartShape { layers: Layer[]; lines: Line[]; bbox: { x0: number; y0: number; x1: number; y1: number } }`
  - `type DrawCmd = { kind: "fill"; pts: Pt[]; color: number; alpha?: number } | { kind: "stroke"; pts: Pt[]; color: number; width: number; closed: boolean }`
  - `paintCommands(shape: PartShape): DrawCmd[]`
  - `OUTLINE = 0x1a1424`

- [ ] **Step 1:** `git checkout -b flynn-family-fighters`.
- [ ] **Step 2:** Create `lib/rig/package.json`, modeled on `lib/audio/package.json`:
  - name `@web-games/rig`
  - `exports: { ".": "./src/index.ts", "./phaser": "./src/phaser/index.ts" }`
  - `phaser` 3.90.0 as both a peer and a dev dependency

  Add `tsconfig.json` like `lib/settings`. Run `npm install` at the root.
- [ ] **Step 3: Write failing tests.**
  - `clipHalfPlane(square(-10..10), 1, 0, 0)` returns a polygon whose every x ≤ 0 and whose area is 200.
  - `clipHalfPlane(poly, 1, 0, -100)` returns `[]`.
  - `ellipse(0,0,20,10).length === 22`, with all points within the 20×10 box.
  - `hex("#ff0000", 0) === 0xff0000`, `hex("banana", 7) === 7`.
  - `paintCommands`, for one layer `{p: square, c: 0x00ff00, shade: 0, hi: 5}`:
    - the first commands are an outline fill and an outline stroke, in color `OUTLINE` and width 7
    - then the base fill, in `0x00ff00`
    - then a shadow fill, whose points all have x ≤ 0
    - then a highlight fill, whose points all have x ≥ 5
  - A layer with `outline: false` produces no `OUTLINE` commands before its fill.
- [ ] **Step 4:** Run `npm test -w lib/rig`. Expected: FAIL (modules missing).
- [ ] **Step 5: Implement.** `paintCommands` follows the spike's `paint()` order exactly:
  1. outline pass for all layers
  2. per layer: base fill; shadow `darken(c, .32)` for `x + tilt*y <= shade`; deep shadow `darken(c, .52)` for `<= shade - (deep ?? 9)`; highlight `lighten(c, .32)` for `x >= hi`; ink stroke (width 3) if `ink`
  3. lines, stroked with `w ?? 3` and `c ?? OUTLINE`

  Skip any clipped polygon with fewer than 3 points.
- [ ] **Step 6:** Run `npm test -w lib/rig && npm run typecheck -w lib/rig`. Expected: PASS.
- [ ] **Step 7:** Commit: `feat(rig): add color, geometry and cel-shading paint commands`.

### Task 2: `Look`, option lists, `normalizeLook`, `alternateColors`

**Files:**
- Create: `lib/rig/src/look.ts`
- Test: `lib/rig/tests/look.test.ts`

**Interfaces:**
- Produces:
  - **Option lists:**
    - `BODY_FRAMES = ["masculine","feminine"]`, `ARCHETYPES = ["martial","brawler"]`, `BUILDS = ["lean","medium","big"]`
    - `HAIR_STYLES = ["swoop","short","spiky","long","buzz","ponytail","buns","braids"]`
    - `EXPRESSIONS = ["determined","grin"]`, `JAWS = ["square","round","soft","pointed"]`, `BROWS = ["heavy","thin","arched"]`, `EYE_SHAPES = ["narrow","round"]`, `NOSES = ["straight","button","wide"]`
    - `EXTRAS = ["headband","cap","bow","earrings","glasses","sunglasses","wristbands"]`
    - `WEAPONS = ["none","baseball-bat","tennis-racket","hockey-stick","lacrosse-stick","frying-pan"]`
  - **The type** (each choice is a forgiving union over the matching list):
    ```ts
    interface Look {
      body; archetype; height: number; build; muscle: number;
      skin: string; eyes: string;
      face: { expression; jaw; brows; eyeShape; nose; freckles: boolean; lashes: boolean };
      hair: { style; color: string };
      top: string; bottom: string; belt: string; shoes: string;
      extras: string[]; accent: string; weapon;
    }
    ```
  - `DEFAULT_LOOK: Look`: Colin from the spike (martial, masculine, height 1.08, lean, muscle 1.15, …).
  - `normalizeLook(raw: unknown, warn?: (m: string) => void): Look`
  - `alternateColors(look: Look): Look`
  - `LOOK_LIMITS = { height: {min: .85, max: 1.15}, muscle: {min: .8, max: 1.4} }`

- [ ] **Step 1: Write failing tests.**
  - `normalizeLook(undefined)` deep-equals `DEFAULT_LOOK`.
  - `normalizeLook({ hair: { style: "mohawk" } }, warn)` gives `hair.style === "short"`, and `warn` was called once with a message containing `"mohawk"` and `"swoop"`. The message lists the valid options.
  - `normalizeLook({ height: 3 }).height === 1.15`; `normalizeLook({ height: "tall" }).height === 1.08` (the default).
  - `normalizeLook({ skin: "pink-ish" }).skin === DEFAULT_LOOK.skin`. A color must match `/^#[0-9a-f]{6}$/i`.
  - `normalizeLook({ extras: ["cap", "jetpack"] }).extras` deep-equals `["cap"]`.
  - `normalizeLook({ body: "feminine" }).face.lashes === true` when `lashes` isn't given. When given, it's kept.
  - `alternateColors(colinLook)` has a different `top` and `bottom`, the same `hair.color` and `skin`, and calling it twice is not the identity.
- [ ] **Step 2:** Run `npm test -w lib/rig`. Expected: FAIL.
- [ ] **Step 3: Implement** `normalizeLook`:
  - merge field by field over `DEFAULT_LOOK`;
  - clamp numbers with `clampSettings` from `@web-games/settings` (add that dependency);
  - for every choice field, an unknown value becomes the default plus `warn("🥊 hair style \"mohawk\" isn't one we know yet. Try: swoop, short, …")`.

  `alternateColors` rotates the hue of `top`, `bottom`, `accent` and `belt` by 180° (HSL). Write a tiny `rotateHue(hex, deg)` in `color.ts`.
- [ ] **Step 4:** Run `npm test -w lib/rig`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(rig): add Look type with forgiving normalizer and alternate colors`.

### Task 3: Body frames, skeleton, kinematics

**Files:**
- Create: `lib/rig/src/body.ts`, `lib/rig/src/skeleton.ts`, `lib/rig/src/kinematics.ts`
- Test: `lib/rig/tests/body.test.ts`, `lib/rig/tests/kinematics.test.ts`

**Interfaces:**
- Consumes: `Look` (Task 2).
- Produces:
  - `interface BodyDims { k; b; m; w; chestH; S; Lt; Wb; waistH; hipsHalf; uaL; faL; thighL; thighW; shinL; fist; neckHalf; headScale; feminine: boolean }`
  - `bodyDims(look: Look): BodyDims`
  - `type PartName = "chest"|"waist"|"hips"|"knot"|"ua"|"fa"|"thigh"|"shin"|"foot"|"hand"|"head"`
  - `interface Bone { name: string; parent: string | null; at: { x: number; y: number }; part: PartName; back?: boolean; angleKey?: string }`
  - `skeleton(d: BodyDims): Bone[]`: 17 bones in draw order, back to front, exactly as the spike's `skeleton()`, except that `waist` has parent `"hips"` at `{0,0}` with `angleKey: "torso"`, so the `hips` angle rotates the whole body.
  - `type World = Record<string, { x: number; y: number; r: number }>`
  - `solvePose(bones: Bone[], pose: Record<string, number | string>): World` (angles in degrees; missing = 0)
  - `groundOffset(world: World): number` (max joint y + 22)

**Frame proportions** (k = height, b = build `{lean: .92, medium: 1, big: 1.18}`, m = muscle):

| | chestH | S | Lt | Wb | waistH | hipsHalf | uaL | faL | thighL | thighW× | shinL | fist | neckHalf | headScale |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| masculine | 70k | 52bm | 40bm | 27b | 38k | 30b | 60k | 54k | 80k | 1.0 | 78k | 1.12√(bm) | 13 | 1.28 |
| feminine | 66k | 42bm | 33bm | 22b | 40k | 34b | 57k | 51k | 84k | 1.08 | 80k | 0.95√(bm) | 10 | 1.24 |

- [ ] **Step 1: Write failing tests.**
  - `skeleton(bodyDims(DEFAULT_LOOK)).length === 17`.
  - Every non-null `parent` names an earlier-or-later bone that exists.
  - The bone names are the spike's set.
  - Feminine has a smaller `S`, a larger `hipsHalf` and a larger `thighL` than masculine for the same look.
  - A taller look gives a larger `thighL`.
  - `solvePose`:
    - with all angles 0, the `fSh` joint is directly below `fTh` (same x, larger y);
    - with `{ hips: 90 }`, the `head` joint ends up to the left of the hips (x < 0), since the whole body rotates;
    - `fFA` rotates with `fUA`: `{ fUA: -90 }` puts the elbow at x > 0, the same height as the shoulder ± 1.
  - `groundOffset` of the standing pose equals the max foot-joint y + 22.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** `solvePose` uses recursive memoized forward kinematics like the spike's `render()`:
  ```
  child.x = parent.x + at.x*cos(parent.r) - at.y*sin(parent.r)
  child.y = parent.y + at.x*sin(parent.r) + at.y*cos(parent.r)
  child.r = parent.r + rad(pose[angleKey ?? name] ?? 0)
  ```
  Non-number pose values are ignored.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(rig): add body frames, skeleton and forward kinematics`.

### Task 4: Poses and animation sampling

**Files:**
- Create: `lib/rig/src/pose.ts`
- Test: `lib/rig/tests/pose.test.ts`

**Interfaces:**
- Produces:
  - `type Pose = Record<string, number | string>`
  - `type Ease = "sine" | "out" | "linear" | "snap"`
  - `interface Keyframe { pose: Pose; frames: number; ease: Ease }`, `interface Animation { loop: boolean; keys: Keyframe[] }`
  - `animLength(a: Animation): number`
  - `samplePose(a: Animation, frame: number, from: Pose): Pose`
  - `flatFeet(p: Pose): Pose` (fills `fFt = -(fTh+fSh)` and `bFt = -(bTh+bSh)` when absent)

- [ ] **Step 1: Write failing tests.**
  - `animLength({loop:false, keys:[{frames:3},{frames:5}]}) === 8`.
  - For a non-looping 2-key animation from `{a:0}` to key1 `{a:10}` (`frames: 10`, linear): `samplePose(anim, 5, {a:0}).a === 5`.
  - A `"snap"` key returns its target pose from its first frame.
  - Looping: `frame = animLength` wraps to frame 0, and key 0 eases from the *last* key's pose.
  - String fields (`hand: "palm"`) come from the current key, not interpolated.
  - Frames past the end of a non-looping animation hold the last pose.
  - `flatFeet({fTh: -30, fSh: 40, bTh: 20, bSh: 10}).fFt === -10`, and an existing `fFt` is kept.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Use the easing functions from the spike: `sine = .5 - .5cos(πp)`, `out = 1-(1-p)²`, `snap = 1`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(rig): add frame-exact pose sampling`.

### Task 5: Body and hand parts (both archetypes × both frames)

**Files:**
- Create: `lib/rig/src/parts/body.ts`, `lib/rig/src/parts/hands.ts`, `lib/rig/src/parts/weapons.ts`
- Test: `lib/rig/tests/parts.test.ts`

**Interfaces:**
- Consumes: `Layer`, `Line`, `PartShape`, `pts`, `ellipse` (Task 1); `Look` (Task 2); `BodyDims` (Task 3).
- Produces:
  - `bodyParts(look: Look, d: BodyDims): Record<"chest"|"waist"|"hips"|"knot"|"ua"|"fa"|"thigh"|"shin"|"foot", PartShape>`
  - `handParts(look: Look, d: BodyDims): { fist: PartShape; palm: PartShape; fistArmed: PartShape }`
  - `weaponShape(weapon: string, look: Look): PartShape | null`
- **Coordinates:** local; joint at (0,0); limbs hang toward +y; +x faces the opponent.
- **Port from the spike:** the shapes of `P.ua`, `fa`, `fist`, `palm`, `thigh`, `shin`, `foot`, `hips`, `knot`, `waist` and `chest`.
- **Feminine frame:**
  - narrower chest silhouette (from `S`, `Lt`, `Wb`), no pec lines, wider `hips` (`hipsHalf`)
  - legs drawn with `thighW`
  - martial top: a sleeveless tunic (no torn sleeve on `ua`) with leggings (shin uses the brawler's straight leg)
  - brawler: a tank top as in the masculine version, but cut to the feminine silhouette, with leggings
- `fistArmed` = the fist plus `weaponShape` (held vertically, centered on the fist). It equals `fist` when the weapon is `"none"`.

- [ ] **Step 1: Write failing tests.** Loop over every combination of `BODY_FRAMES × ARCHETYPES × BUILDS × muscle {0.8, 1.4} × WEAPONS`. For each part:
  - `layers.length ≥ 1`;
  - every layer point and line point is finite and inside `bbox`, allowing 4 px for the 7 px outline stroke;
  - `bbox.x1 > bbox.x0` and `bbox.y1 > bbox.y0`.
  - **Width checks:** the feminine `chest` bbox is narrower than masculine; the `big` + muscle 1.4 chest is wider than `lean` + 0.8.
  - **Archetype checks:** a martial masculine `ua` has a layer with color `hex(look.top)` (the torn sleeve); a brawler `ua` doesn't.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement**, porting from the spike file. Each part function returns its own `bbox`, as the spike's draw functions do.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(rig): add SF2-style body, hand and weapon parts`.

### Task 6: Head part (faces, hair, extras) and `buildParts`

**Files:**
- Create: `lib/rig/src/parts/hair.ts`, `lib/rig/src/parts/head.ts`, `lib/rig/src/parts/index.ts`
- Modify: `lib/rig/src/index.ts` (export everything Phaser-free)
- Test: `lib/rig/tests/head.test.ts`

**Interfaces:**
- Produces:
  - `headPart(look: Look, d: BodyDims, variant: "normal" | "hit"): PartShape`
  - `type TextureName = "chest"|"waist"|"hips"|"knot"|"ua"|"fa"|"thigh"|"shin"|"foot"|"fist"|"palm"|"fistArmed"|"head"|"headHit"`
  - `buildParts(look: Look, d: BodyDims): Record<TextureName, PartShape>`
- **Port from the spike:** `headPart`, the `HAIR` outlines for swoop/short/spiky/long/buzz, and the headband and cap.
- **New in this task:**
  - **Hair:**
    - `ponytail`: the short front plus a back tail behind the head
    - `buns`: the short front plus two circles at the top-back
    - `braids`: the short front plus two segmented braids hanging behind
  - **Face options** (the face is where likeness comes from):
    - `jaw`:
      - `square`: the spike's jaw
      - `round`: an ellipse jaw
      - `soft`: a narrower chin with a smaller jaw corner
      - `pointed`: the chin pulled forward and down
    - `brows`:
      - `heavy`: the spike's heavy brow
      - `thin`: a 2 px line
      - `arched`: a curved 3 px line
    - `eyeShape`:
      - `narrow`: the spike's eyes
      - `round`: taller whites
    - `nose`:
      - `straight`: the spike's nose line
      - `button`: a short curve
      - `wide`: a wider base
    - `freckles`: 5 small dots across the cheek.
    - `lashes`: 3 short strokes on the near eye.
    - When `body` is feminine: a lip color of `darken(skin, .25)` mixed 30% with `0xc0506a`.
  - **Extras:**
    - `bow` on top of the hair, `earrings` (a small circle at the earlobe)
    - `glasses` (two outlined frames) and `sunglasses` (filled dark lenses)
    - `wristbands` live on the `fa` part, in `accent` color, next to the wrap
  - **Hit variant:** squeezed eyes and an open mouth, as in the spike.
  - The head is scaled by `d.headScale` (the spike used `scaleCanvas`). Here, scale the point coordinates instead, so the shape stays pure data.

- [ ] **Step 1: Write failing tests.**
  - For every `HAIR_STYLES × JAWS × BROWS × EYE_SHAPES × NOSES × extras subset {[], ["headband","glasses"], ["cap","earrings","bow"]} × variants`, apply the same finiteness and bbox checks as Task 5.
  - The `"hit"` variant's layers differ from `"normal"` (they don't deep-equal).
  - `buildParts(DEFAULT_LOOK, dims)` has all 14 `TextureName` keys.
  - Two looks that differ only in `face.jaw` produce different `head` layers.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test -w lib/rig && npm run typecheck -w lib/rig`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(rig): add head part with face options, hair and extras`.

### Task 7: Phaser adapter: textures, `RigSprite`, portraits, PNG overrides

**Files:**
- Create: `lib/rig/src/phaser/{textures,RigSprite,portrait,index}.ts`
- Test: `lib/rig/tests/textureLayout.test.ts` (this tests the pure layout math only)

**Interfaces:**
- Consumes: `buildParts`, `paintCommands`, `skeleton`, `solvePose`, `groundOffset`, `bodyDims`.
- Produces (from `@web-games/rig/phaser`):
  - `textureLayout(bbox, pad = 12): { width: number; height: number; offsetX: number; offsetY: number; originX: number; originY: number }`
  - `interface RigTextures { id: string; look: Look; dims: BodyDims; bones: Bone[]; tex: Record<TextureName, { key: string; originX: number; originY: number }> }`
  - `buildRigTextures(scene: Phaser.Scene, look: Look, overrides?: Partial<Record<TextureName, string>>): RigTextures`. `overrides` maps a part to an already-loaded image key.
  - `destroyRigTextures(scene, t: RigTextures): void`
  - `class RigSprite`:
    - `constructor(scene, textures: RigTextures, x: number, y: number)`
    - `setPose(pose: Pose): this`, `setFacing(f: 1 | -1): this`, `setPosition(x, y): this`
    - `setShowBones(on: boolean): this`, `setTint(color | null): this`, `setTextures(t: RigTextures): this`
    - `jointWorld(name: string): { x: number; y: number }` (screen coordinates)
    - `container: Phaser.GameObjects.Container`
    - `destroy()`
  - `renderPortrait(scene, textures: RigTextures, size: number): string` returns a texture key: a head-and-shoulders crop of the `PORTRAIT_POSE`.
  - `PORTRAIT_POSE: Pose` (the spike's stance with `head: 0`, `chest: 0`)

- [ ] **Step 1: Write a failing test.** `textureLayout({x0:-10,y0:-20,x1:30,y1:40}, 12)` gives `width === 64`, `height === 84`, `offsetX === 22`, `offsetY === 32`, `originX === 22/64` and `originY === 32/84`.
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Textures:** `buildRigTextures` draws each part's `DrawCmd[]` into a `scene.make.graphics({}, false)` after `translateCanvas(offsetX, offsetY)`, then calls `generateTexture(id + name, w, h)` and destroys the graphics.
  - **Overrides:** an override image is used instead of the drawn part. It is scaled to fit the part's bbox (contain), with its origin at the joint position.
  - **`RigSprite` drawing:**
    - one `Image` per bone in skeleton order; back bones tinted `0xa9aed0`
    - `setPose` runs `solvePose` and `groundOffset`, then positions and rotates the images exactly as the spike's `render()`
    - `pose.hand === "palm"` swaps both hand bones to `palm`; otherwise the front hand uses `fistArmed` and the back hand `fist`
    - `pose.face === "hit"` swaps `head` to `headHit`
  - **`RigSprite` facing:** `setFacing` sets container scaleX to ±1.
  - **Portraits:** `renderPortrait` draws a temporary `RigSprite` into a `RenderTexture`, cropped from the chest bottom to the top of the head bbox, saves it with `saveTexture(key)`, and destroys the temporary objects.
- [ ] **Step 4:** Run `npm test -w lib/rig && npm run typecheck`. Expected: PASS. Rendering is checked visually in Task 8.
- [ ] **Step 5:** Commit: `feat(rig): add Phaser textures, RigSprite and portraits`.

### Task 8: Game scaffold, `Fighter`, roster loader, character files, rig viewer

**Files:**
- Create: `flynn-family-fighters/{package.json,tsconfig.json,vite.config.ts,index.html}`, `src/{main.ts,vite-env.d.ts,settings.ts,fighter.ts,roster.ts}`, `src/characters/{colin,ryan}.ts`, `src/animations.ts` (stance, idle and walk only for now), `src/scenes/ViewerScene.ts`, `public/assets/{sounds,music,fighters}/.gitkeep`
- Modify: root `package.json` (add `"flynn-family-fighters"` to `workspaces`)
- Test: `flynn-family-fighters/tests/fighter.test.ts`, `tests/roster.test.ts`

**Interfaces:**
- Consumes: `Look`, `normalizeLook`, `alternateColors` (Task 2); `@web-games/rig/phaser` (Task 7).
- Produces:
  - **Types and limits:**
    - `type MoveType = "fireball"|"uppercut"|"spin-kick"|"charge-dash"|"flip-kick"|"rapid-hits"|"command-throw" | (string & {})`
    - `interface SpecialChoice { type: MoveType; name: string; color?: string; speed?: number; damageBonus?: number }` (`speed` 0.5–2, `damageBonus` 0–5)
    - `type NormalId = "st.LP"|"st.MP"|"st.HP"|"st.LK"|"st.MK"|"st.HK"|"cr.LP"|"cr.MP"|"cr.HP"|"cr.LK"|"cr.MK"|"cr.HK"|"j.LP"|"j.MP"|"j.HP"|"j.LK"|"j.MK"|"j.HK"|"cl.MP"|"cl.HP"`
    - `interface Fighter { id: string; name: string; look: Look; stats: { speed: number; power: number; health: number; jump: number }; specials: SpecialChoice[]; normals: Partial<Record<NormalId, { damage?: number; reach?: number }>>; winQuote: string; stage?: string }`
    - Limits: speed/power/jump 1–10; health 50–150; normals `damage` 1–30, `reach` 0.8–1.3; max 4 specials.
  - `normalizeFighter(raw: unknown, fileId: string, knownMoveTypes: readonly string[], warn): Fighter | null`
  - `interface RosterResult { fighters: Fighter[]; problems: string[] }`
  - `collectRoster(entries: [string, () => Promise<{ fighter?: unknown }>][], knownMoveTypes): Promise<RosterResult>`
  - `MOVE_TYPE_NAMES = ["fireball","uppercut","spin-kick","charge-dash","flip-kick","rapid-hits","command-throw"] as const`
  - `loadRoster(knownMoveTypes: readonly string[] = MOVE_TYPE_NAMES): Promise<RosterResult>` (wraps the lazy `import.meta.glob("./characters/*.ts")`)
  - `settings`: the clamped `mySettings` with these keys, defaults and ranges:

    | Setting | Default | Range |
    |---|---|---|
    | `roundTime` | 99 | 30–99 |
    | `roundsToWin` | 2 | 1–3 |
    | `gameSpeed` | 1 | 1–4 |
    | `cpuDifficulty` | 3 | 1–8 |
    | `damageScale` | 1 | 0.25–3 |
    | `chipDamageFraction` | 0.25 | 0–0.5 |
    | `dizzyEnabled` | true | |
    | `throwTechEnabled` | false | |
    | `motionWindowFrames` | 20 | 10–40 |
    | `showHitboxes` | false | |
    | `pixelFilter` | true | |

    Follow `super-flynn-bros/src/settings.ts` (`mySettings` + `clampSettings` + limits).
- **Package files:**
  - `package.json`: copy Super Flynn Bros' scripts and devDependencies; dependencies are `@web-games/{arcade,audio,input,rig,settings}` + `phaser` 3.90.0.
  - `vite.config.ts`: Super Flynn Bros' config with port **8002**.
- **Character files:** Colin and Ryan with the spike's looks and specials:
  - Colin: `DONUT BLAST` fireball, plus `uppercut` named `HOME RUN SWING`
  - Ryan: `FASTBALL` fireball, plus `spin-kick` named `BASE STEALER`
  - Stats near 5. Win quotes: Colin "Race you home!", Ryan "Too slow, bro!".
  - Each file has friendly comments, as in the spec's example.
- **Viewer:** `ViewerScene` loads when the URL has `?viewer`. It shows every roster fighter in a row, cycling stance/idle/walk. Keys: `B` toggles bones, `P` toggles the pixel filter.

- [ ] **Step 1: Write failing tests.**
  - **`normalizeFighter`:**
    - `normalizeFighter({ name: "ZED", look: {}, specials: [{type:"laser", name:"PEW"}, {type:"fireball", name:"BOOM"}] }, "zed", ["fireball"], warn)` keeps only the fireball and warns about `"laser"`.
    - A missing name → `name === "ZED"` (the file id, upper-cased).
    - `stats.speed: 99` → 10.
    - Five specials → only the first 4 are kept.
    - `normals: {"st.HK": {damage: 99}}` → 30.
    - `normalizeFighter(42, "x", …)` returns `null`, with a warning.
  - **`collectRoster`:**
    - with three entries (a valid `colin.ts`, a `broken.ts` whose loader rejects with `Error("Unexpected token")`, and an `empty.ts` with no `fighter` export) it returns 1 fighter;
    - `problems` has 2 entries, mentioning `broken.ts` and `empty.ts`;
    - two files with the same `name` keep both, but the second becomes `"RYAN 2"`.
  - **Real files:** the real files under `src/characters/*.ts` (imported directly in the test) both normalize without warnings.
- [ ] **Step 2:** Run `npm test -w flynn-family-fighters`. Expected: FAIL.
- [ ] **Step 3:** Implement the files above. `main.ts` boots `ViewerScene` only when `?viewer` is set; otherwise it boots a placeholder scene with the text "FIGHT COMING SOON", which Task 16 replaces.
- [ ] **Step 4:** Run `npm install && npm test && npm run typecheck` at the root. Expected: PASS.
- [ ] **Step 5: Manual check.**
  - Run `npm run dev -w flynn-family-fighters` and open `http://localhost:8002/?viewer`.
  - Expected: Colin and Ryan look like the spike: idle bob, walk cycle, bones overlay, and the pixel filter toggle.
  - Then edit `colin.ts` hair color → hot reload shows it.
  - Then set `hair.style: "mohawk"` → the default hair shows, plus a console warning.
- [ ] **Step 6:** Commit: `feat(fighters): scaffold game with roster loader, Colin, Ryan and rig viewer`.

### Task 9: Engine input: frames, history, motions

**Files:**
- Create: `flynn-family-fighters/src/engine/input.ts`
- Test: `tests/engine/input.test.ts`

**Interfaces:**
- Produces:
  - **Input bits and directions:**
    - `const B = { UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8, LP: 16, MP: 32, HP: 64, LK: 128, MK: 256, HK: 512 } as const`; `type InputFrame = number`
    - `toDir(frame: InputFrame, facing: 1 | -1): 1|2|3|4|5|6|7|8|9` (numpad notation, relative to facing; 6 = forward)
  - **`class InputHistory`** (ring buffer, capacity 90):
    - `push(frame: InputFrame, facing: 1|-1): void`
    - `pressed(bits: number): boolean` (newly pressed this frame)
    - `dirAgo(n): Dir`
    - `heldFor(dirs: Dir[]): number` (consecutive frames ending now where the direction ∈ dirs)
    - `pressCount(bits, window): number`
  - **Motion matching:**
    - `type Motion = "qcf" | "qcb" | "dp" | "chargeBF" | "chargeDU" | "mash" | "360"`
    - `matchMotion(h: InputHistory, motion: Motion, window: number): boolean`
    - `button` is checked separately by the caller with `pressed()`.
- **Rules:**
  - **qcf:** the sequence 2 → 3 → 6 appears in order within the last `window` frames (other directions in between are allowed). qcb = 2 → 1 → 4; dp = 6 → 2 → 3.
  - **chargeBF:** a back direction (4, 1 or 7) was held ≥ 45 consecutive frames, ending within the last 10 frames, and the current direction is 6 or 3 or 9. chargeDU is the same with a down direction (1, 2 or 3) and an up direction (7, 8 or 9).
  - **mash:** `pressCount(any punch, 30) >= 5`.
  - **360:** 4, 2, 6 and 8 all appear within the last `window + 10` frames.

- [ ] **Step 1: Write failing tests.**
  - **Direction:** `toDir(B.LEFT|B.DOWN, 1) === 1` and `toDir(B.LEFT|B.DOWN, -1) === 3`.
  - **qcf:**
    - pushing 2, 3, 6 frames (facing 1) → `matchMotion(h, "qcf", 20)` is true;
    - the same pushes facing -1 (raw RIGHT+DOWN etc.) still read as qcf when the raw input is mirrored;
    - 2, then 25 neutral frames, then 3, 6 → false with window 20, true with window 40.
  - **qcb:** 2, 1, 4 → qcb is true and qcf is false.
  - **chargeBF:** back held 44 frames then forward → false; held 45 → true; held 45, then 12 neutral frames, then forward → false.
  - **mash:** 5 LP presses (press/release alternating) within 30 frames → true; 4 → false.
  - **`pressed`:** holding LP across two frames → `pressed(B.LP)` is true only on the first.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fighters): add input history and motion reader`.

### Task 10: Engine core types, RNG, movement

**Files:**
- Create: `src/engine/{types,rng,movement}.ts`, `src/engine/match.ts` (skeleton: `createMatch`, `stepMatch` with movement only)
- Test: `tests/engine/movement.test.ts`

**Interfaces:**
- Consumes: `Fighter` (Task 8), input (Task 9).
- Produces:
  - `type Box = { x: number; y: number; w: number; h: number }` (relative to the fighter's feet; +x = forward; y up is negative)
  - `types.ts` also declares `AttackData` and `ActiveAttack` (fields listed in Task 11), so `FighterState` can reference them. Task 11 fills in the data and the logic.
  - `type FState = "idle"|"walkF"|"walkB"|"crouch"|"jumpSquat"|"jump"|"attack"|"hitstun"|"blockstun"|"knockdown"|"getup"|"dizzy"|"throwing"|"thrown"|"ko"|"win"`
  - `interface FighterState { fighter: Fighter; x; y; vx; vy; facing: 1|-1; health; maxHealth; state: FState; stateFrame: number; attack: ActiveAttack | null; hitstop: number; stun: number; stunDecayDelay: number; comboHits: number; projectileOut: boolean; history: InputHistory; roundWins: number; crouching: boolean; airborne: boolean; jumpDir: -1|0|1 }`
  - `interface MatchState { frame: number; phase: "intro"|"fight"|"ko"|"roundOver"|"matchOver"; phaseFrame: number; round: number; timerFrames: number; fighters: [FighterState, FighterState]; projectiles: Projectile[]; rng: Rng; settings: FightSettings; stage: { left: number; right: number; ground: number } }`
  - `type MatchEvent = { type: "round"|"fight"|"hit"|"block"|"whiff"|"special"|"projectile"|"throw"|"knockdown"|"dizzy"|"ko"|"timeOver"|"roundOver"|"matchOver"|"draw"; player?: 0|1; x?: number; y?: number; name?: string; damage?: number }`
  - `createMatch(cfg: { p1: Fighter; p2: Fighter; settings: FightSettings; seed: number }): MatchState`: stage `{left: 60, right: 900, ground: 488}`; fighters at x 300 and 660, facing each other.
  - `stepMatch(s: MatchState, inputs: [InputFrame, InputFrame]): MatchEvent[]`
  - `class Rng { constructor(seed: number); next(): number; int(lo, hi): number }` (mulberry32)
  - `type FightSettings` = the settings fields the engine reads (round time, rounds, damage scale, chip fraction, dizzy on, tech on, motion window).
- **Movement numbers** (starting values; tune by playing):
  - Walking: forward `1.5 + 0.25*speed` px/frame; back = 0.8 × forward.
  - Jumps:
    - a 4-frame `jumpSquat`, then `vy = -(14 + 0.6*jump)`, gravity 0.8/frame²
    - `vx = ±3.5` for diagonal jumps
    - jumps can't be steered in the air
  - Crouching: holding any down direction (1, 2 or 3) while grounded.
  - Bodies are at least `80 * height` px apart (center to center). When overlapping, both are pushed apart evenly; at a wall, the other one moves.
  - Facing updates only while grounded and not attacking or in stun.
  - `intro` lasts 90 frames (emits `round` at frame 0 and `fight` at 60); then `fight`.

- [ ] **Step 1: Write failing tests** (helpers build a match with two test fighters and run N frames of inputs):
  - Holding RIGHT for 60 frames as P1 (speed 5) moves P1 forward by 60 × 2.75 px (± 0.01), with state `walkF`.
  - Holding LEFT moves back at 0.8×, with state `walkB`.
  - Pressing UP: 4 frames of `jumpSquat`, then `jump`, returning to the ground (`y === 0`, `idle`) within 60 frames.
  - Inputs during `intro` are ignored.
  - Corner: P1 at `stage.left` holding LEFT never goes below `left`.
  - Walking into the opponent stops at the minimum distance, and pushes them only if they're walking into you too (no clipping).
  - Cross-over: P1 jumps forward over P2 → after landing, both `facing` values have flipped.
  - Determinism: two matches with the same seed and inputs have deep-equal state after 300 frames.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `movement.ts` (`updateMovement(f, other, stage)`) and the minimal `stepMatch` (intro → fight; push input into history; movement).
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fighters): add deterministic match core and movement`.

### Task 11: Normals, hit boxes, hit/block resolution

**Files:**
- Create: `src/moves.ts` (kid file: the normals table), `src/engine/combat.ts`
- Modify: `src/engine/match.ts`
- Test: `tests/engine/combat.test.ts`

**Interfaces:**
- Consumes: Tasks 9–10.
- Produces:
  - `interface AttackData { id: string; startup: number; active: number; recovery: number; damage: number; chip: number; hitstun: number; blockstun: number; hitstop: number; dizzy: number; hitbox: Box; level: "high"|"mid"|"low"; pushback: number; knockdown: boolean; cancellable: boolean; projectile?: { speed: number; color?: string }; invulnFrames?: number; move?: { vx?: number; vy?: number } }`
  - `NORMALS: Record<NormalId, AttackData>` in `moves.ts`, with kid comments.
  - `HURTBOXES = { stand: Box; crouch: Box; air: Box }` (scaled by look height)
  - `interface ActiveAttack { data: AttackData; frame: number; hasHit: boolean; special?: SpecialChoice }`
  - `attackFor(f: FighterState, button: number, other: FighterState): AttackData` (stand / crouch / jump / close version)
  - `boxesOverlap(a: Box, aX, aY, aFacing, b: Box, bX, bY, bFacing): boolean`
  - `resolveHits(s: MatchState): MatchEvent[]` (runs once per step after movement)
- **Starter normals:**
  - Light: startup 4, active 3, recovery 7, damage 4, hitstun 12, blockstun 8, hitstop 8.
  - Medium: 6 / 4 / 12, damage 8, hitstun 16, blockstun 12, hitstop 10.
  - Heavy: 9 / 4 / 20, damage 12, hitstun 20, blockstun 16, hitstop 12.
  - Kicks: hitbox reach +20%.
  - `cr.LK`, `cr.MK` and `cr.HK` are `low`; `cr.HK` knocks down. Jumping normals are `high`.
  - `cl.MP` and `cl.HP` are used within 90 px.
  - `cancellable: true` for `st.LP`, `cr.LP`, `cr.LK`, `cr.MK`, `cl.MP`, `cl.HP`.
  - Hurtboxes: stand `{x:-40,y:-300,w:80,h:300}`, crouch `{x:-40,y:-200,w:80,h:200}`, air `{x:-40,y:-260,w:80,h:200}`. Scale `y`, `h` and the hitbox reach by the look's height.
- **Rules:**
  - **Damage:** `round(base × (0.8 + 0.04×power) × damageScale × (normals override ?? 1))`. Health = `stats.health`.
  - **Blocking:**
    - The defender blocks if they're holding back (4 = stand block, 1 = crouch block), grounded, and in `idle`/`walkB`/`crouch`/`blockstun`.
    - `high` is blocked standing only, `low` crouching only, `mid` either way.
  - **Hitstop:** both fighters freeze for `hitstop` frames (their `stateFrame` doesn't advance).
  - **Pushback:** the defender moves away by `pushback`; if the defender is at a wall, the attacker moves back instead.
  - **Chip:** blocked normals deal 0 chip.
  - **Combo:** `comboHits` increments while the defender is still in `hitstun` from the previous hit, and resets when the defender returns to neutral.
  - **Trades:** hits from both sides on the same step both apply.
  - **Whiffs:** an attack that ends without hitting emits `whiff`.

- [ ] **Step 1: Write failing tests.**
  - **Hit:** P1 presses LP within range → at frame `startup` (4) a `hit` event fires, P2 health = max − 4 (power 5 → factor 1.0), P2 state `hitstun`, and both have `hitstop === 8`.
  - **Block:** P2 holding back blocks a standing LP → `block` event, no damage, P2 `blockstun`.
  - **Lows and highs:** P2 standing-blocking vs P1's `cr.MK` (low) → hit. P2 crouch-blocking vs P1's `j.HK` (high) → hit.
  - **Corner:** P2 in the corner gets hit → P1's x moves back by the pushback, and P2's x stays at the wall.
  - **Trade:** both press MP on the same frame at mid range → both take 8 damage on the same step.
  - **Combo:** `cr.LP` → `cr.LP` while the defender is still in hitstun gives `comboHits === 2`.
  - **Overrides:** a fighter with `normals: {"st.HP": {damage: 20}}` deals 20 with st.HP.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Pressing a button while `idle`/`walk`/`crouch`/`jump` starts the attack chosen by `attackFor`; the attack ends after `startup + active + recovery`, then `idle`/`crouch`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fighters): add normal attacks, blocking, hitstop and trades`.

### Task 12: Throws, knockdowns, dizzy, KO, rounds, timer

**Files:**
- Create: `src/engine/throws.ts`
- Modify: `src/engine/match.ts`, `src/engine/combat.ts`
- Test: `tests/engine/match.test.ts`

**Interfaces:**
- Produces:
  - `tryThrow(s: MatchState, attacker: 0|1): MatchEvent[] | null`
  - the round flow inside `stepMatch`
  - `matchWinner(s): 0 | 1 | "draw" | null`
- **Rules:**
  - **Throws:**
    - Input: forward or back + MP/HP pressed.
    - Allowed when within 70 px, both grounded, and the defender isn't in hit or block stun, `jumpSquat`, `knockdown` or `getup`.
    - Damage 14, `knockdown`. Throwing toward the back switches sides.
    - If `throwTechEnabled`: a defender who presses MP/HP with a direction within 6 frames breaks it. Both are pushed apart, with no damage.
  - **Knockdowns:** 40 frames on the floor, then a 20-frame `getup`. The fighter is invulnerable through both.
  - **Dizzy:**
    - Each hit adds `attack.dizzy` to `stun` (light 6, medium 10, heavy 14, specials 12, throw 16).
    - `stun` decays by 1 per frame after 60 frames without being hit.
    - At ≥ 100 (when `dizzyEnabled`): state `dizzy` for 180 frames, minus 4 per newly pressed button. `stun` resets to 0.
  - **KO:**
    - When health ≤ 0, the fighter goes to `ko`, the phase becomes `ko` and a `ko` event fires.
    - The `ko` phase lasts 120 frames (the winner goes to `win` at frame 40). Then `roundOver` lasts 60 frames, then the next round, or `matchOver` when someone reaches `roundsToWin`.
    - A KO always beats a dizzy.
  - **Timer:** `timerFrames = roundTime × 60`, counted down during `fight` only. At 0: `timeOver`, and higher health wins; equal health = both get a round win and a `draw` event.
  - **Draw game:** if both reach `roundsToWin` in the same round, `matchWinner` is `"draw"`.
  - **New round:** health refills, positions reset, `phase = "intro"`.

- [ ] **Step 1: Write failing tests.**
  - **Throw:** P1 at 60 px presses forward + HP → `throw` event, P2 −14, P2 `knockdown`. The same at 100 px → a normal attack instead.
  - **Throw tech:** with `throwTechEnabled`, P2 pressing back + MP 3 frames after the throw → no damage.
  - **Knockdown invulnerability:** a P1 LP that lands on P2 during frames 0–59 of `knockdown`/`getup` → no hit.
  - **Dizzy:** six `st.HP` hits in a row without decay → P2 `dizzy`. With `dizzyEnabled: false` → never dizzy.
  - **KO:** P2 at 4 health takes an LP → `ko` event, then after 180 frames `round === 2` and `roundWins` is `[1, 0]`.
  - **Time over:** `roundTime 30` with no inputs → after `30×60` fight frames, a `timeOver` and a `draw` event, and both `roundWins === 1`.
  - **Match over:** two rounds won by P1 → `phase === "matchOver"` and `matchWinner(s) === 0`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fighters): add throws, knockdowns, dizzy, KO and rounds`.

### Task 13: Special moves, cancels, projectiles

**Files:**
- Create: `src/engine/specials.ts`
- Modify: `src/moves.ts` (add `MOVE_TYPES` data with friendly comments), `src/engine/match.ts`, `src/engine/combat.ts`
- Test: `tests/engine/specials.test.ts`

**Interfaces:**
- Produces:
  - `interface MoveTypeDef { type: string; motion: Motion; button: "P" | "K"; attack: (strength: 0|1|2, choice: SpecialChoice) => AttackData; onFrame?: (f: FighterState, frame: number) => void }`
  - `MOVE_TYPES: Record<string, MoveTypeDef>` in `moves.ts` (the 7 spec types)
  - `KNOWN_MOVE_TYPES = Object.keys(MOVE_TYPES)`. A test asserts that it equals `MOVE_TYPE_NAMES` (Task 8). Boot passes it to `loadRoster`.
  - `trySpecial(s, player): MatchEvent[] | null`, checked before normals each step
  - `interface Projectile { owner: 0|1; x: number; y: number; vx: number; color: string; attack: AttackData; age: number }`
- **Behaviors** (strength = LP/MP/HP or LK/MK/HK → 0/1/2):

  | Type | Motion | Behavior |
  |---|---|---|
  | `fireball` | qcf+P | Startup 12. Spawns a projectile from the front-hand height (y −250×k) at speed `[4, 6, 8][s] × choice.speed`. Damage 10, chip = damage × `chipDamageFraction`. Only one per fighter at a time. Recovery 30. |
  | `uppercut` | dp+P | Invulnerable for frames 0–(4+s). Rises `vy -16 - 2s`, `vx 2`. Damage 12+2s; knocks down. Recovery 28 after landing. |
  | `spin-kick` | qcb+K | Airborne at frame 6. Travels `vx = 5+s` for 30 frames. Hits up to 3 times, damage 5 each (`hasHit` resets every 10 frames). |
  | `charge-dash` | chargeBF+P | Lunges `vx = 9 + s` for 14 frames. Damage 11. |
  | `flip-kick` | chargeDU+K | Rising arc `vy -15`, `vx 3`. Hits overhead (`high`), damage 13, knocks down. |
  | `rapid-hits` | mash P | 24 active frames, hits every 6 frames, damage 3 each, chip. |
  | `command-throw` | 360+P | A throw with 110 px range, damage 22. |

- **Rules:**
  - `choice.damageBonus` adds to the damage.
  - Two projectiles that touch destroy each other.
  - **Cancels:** during the hitstop after a `cancellable` normal hits *or* is blocked, a matched special starts immediately.
  - `special` event = `{ type: "special", player, name: choice.name }`.
  - Special damage counts toward the dizzy meter (12).
- **Kid-file comments:** the `moves.ts` header explains how to add a move type: copy a block, pick a motion, write the attack numbers, optionally add `onFrame` behavior code. *(Code is allowed per the spec.)*

- [ ] **Step 1: Write failing tests** (each test uses a fighter whose `specials` include the move):
  - **Fireball:** inputs 2, 3, 6+LP → a `projectile` event at frame 12; the projectile travels 4 px/frame; it hits P2 at range for 10 damage; P2 blocking takes `round(10 × 0.25) = 3` chip.
  - **One fireball at a time:** a second fireball input while one is out → no new projectile.
  - **Clash:** both throw fireballs → they cancel each other mid-screen, and nobody takes damage.
  - **Uppercut invulnerability:** a dp+HP uppercut started on the same frame P2's `j.HK` would hit → P1 takes no damage during invulnerable frames 0–6.
  - **Charge-dash:** charge back 45 frames, then forward+MP → `vx > 0` lunge, and a hit at range 200.
  - **Cancel:** `cr.MK` hits, and qcf+LP is input during its hitstop → the fireball starts before `cr.MK`'s recovery would have ended, and the combo reaches 2 when it hits.
  - **Unknown type:** a fighter file with a special whose type isn't in `MOVE_TYPES` is already dropped by `normalizeFighter` (no engine crash). Assert that `trySpecial` ignores a `SpecialChoice` with an unknown `type` if one is present.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fighters): add special moves, cancels and projectiles`.

### Task 14: CPU opponent and arcade ladder

**Files:**
- Create: `src/engine/cpu.ts`, `src/engine/ladder.ts`
- Test: `tests/engine/cpu.test.ts`, `tests/engine/ladder.test.ts`

**Interfaces:**
- Produces:
  - **`class CpuBrain`:**
    - `constructor(player: 0|1, difficulty: number, rng: Rng)`
    - `next(s: MatchState): InputFrame`: called once per step; returns that frame's input.
  - **Ladder:**
    - `arcadeLadder(roster: Fighter[], playerId: string, rng: Rng): Fighter[]`: every other fighter, shuffled, or `[the player's own fighter]` (a mirror) when the roster has 1 fighter.
    - `ladderDifficulty(base: number, index: number): number`: `min(8, base + floor(index/2))`.
- **CPU rules:**
  - It decides every `reaction = max(4, 34 - 4×difficulty)` frames and queues a short input script (frames of `InputFrame`) that it plays back, so motion inputs are typed frame by frame.
  - It never reads the opponent's current-frame input, only the state.
  - Choices by distance and state, each with a probability scaled by difficulty:
    - far (> 350): fireball (if it has one) or walk forward;
    - mid: walk or jump in;
    - close: a normal, a throw (at ≥ 4), or block when the opponent is attacking;
    - the opponent is airborne and approaching: an uppercut or `st.HP` anti-air;
    - the opponent whiffed (in recovery): punish with `st.HP` at difficulty ≥ 5.
  - Mistakes: with probability `0.35 - 0.04×difficulty`, it picks a random choice instead.

- [ ] **Step 1: Write failing tests.**
  - **Determinism:** the same seed and state give the same input sequence over 200 frames.
  - **Fireball from range:** CPU P2 with a fireball at distance 500, difficulty 8 → within 300 frames the match emits a `projectile` event from player 1.
  - **Blocking:** P1 repeatedly attacking with `st.HP` against CPU difficulty 8 → the CPU blocks at least one in 10. Against difficulty 1 → the CPU gets hit at least 7 of 10.
  - **Valid inputs only:** in a 2000-frame CPU-vs-CPU match (difficulty 4 and 6), every returned `InputFrame` uses only the bits in `B`, and the match ends in `matchOver` or is still running without throwing.
  - **Ladder:** 4 fighters → the ladder has 3, excludes the player, and contains no duplicates. 1 fighter → a mirror ladder of 1. `ladderDifficulty(3, 5) === 5`, `ladderDifficulty(7, 9) === 8`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fighters): add CPU opponent and arcade ladder`.

### Task 15: Full animation set, matched to the frame data

**Files:**
- Modify: `src/animations.ts` (a kid file; it imports only types from `@web-games/rig` and data from `moves.ts`)
- Test: `tests/animations.test.ts`

**Interfaces:**
- Consumes: `Animation`, `Pose`, `flatFeet` (Task 4); `NORMALS`, `MOVE_TYPES` (Tasks 11, 13); `FighterState` (Task 10).
- Produces:
  - `STANCE: Pose` and pose helpers.
  - `attackAnim(windup: Pose, strike: Pose, a: AttackData): Animation`: keys are windup over `startup` frames (sine), strike `snap` held for `active`, and a return to `STANCE` over `recovery` (sine).
  - `ANIMS: Record<string, Animation>` with these keys:
    - movement: `idle`, `walkF`, `walkB`, `crouch`, `jumpSquat`, `jumpUp`, `jumpFwd`, `jumpBack`
    - attacks: one per `NormalId`, `throw`, `thrown`, one per move type
    - defense: `blockStand`, `blockCrouch`, `hitHigh`, `hitLow`, `knockdown`, `getup`
    - endings: `dizzy`, `ko`, `win`, `lose`
    - `intro`
  - `animFor(f: FighterState): { name: string; frame: number }`: maps state + attack id (+ special type) to an animation and frame. Hit stun uses `hitLow` when the hit was `low`.
- **Pose sources:** the spike's poses (idle, walk, punch, kick, special, hit, dizzy, win). New poses follow the same conventions:
  - **Knockdown:** the `hips` angle is about −85 (falling backward), with legs extended.
  - **Crouch:** knees about 90°, `chest` 10.
  - **Jumps:** knees tucked.
  - **Faces and hands:** `face: "hit"` on hits, knockdown, dizzy and KO; `hand: "palm"` during the `fireball` strike and the throw grab.

- [ ] **Step 1: Write failing tests.**
  - For every `NormalId` and move type, `animLength(ANIMS[id]) === startup + active + recovery` of its `AttackData` (strength 1 for specials).
  - For every `FState`, `animFor` returns a name that exists in `ANIMS`.
  - Every pose in `ANIMS`, through `solvePose` with `DEFAULT_LOOK`, gives finite joint positions.
  - `ANIMS.idle.loop` and `ANIMS.walkF.loop` are true; attacks are not looping.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS. Manual: the `?viewer` page gets a list of animation names (cycle with `N`) so you can check every animation on both fighters.
- [ ] **Step 5:** Commit: `feat(fighters): add full animation set matched to frame data`.

### Task 16: Fight scene: rendering, effects, HUD, stages, sound, loop

**Files:**
- Create: `src/stages.ts` (kid file), `src/sounds.ts` (kid file), `src/controls.ts` (kid file), `src/render/{FighterView,effects,hud,stageView,loop}.ts`, `src/scenes/{BootScene,FightScene}.ts`
- Modify: `src/main.ts`
- Test: `tests/loop.test.ts`, `tests/stages.test.ts`, `tests/controls.test.ts`

**Interfaces:**
- Consumes: the engine (Tasks 9–14), `ANIMS`/`animFor` (Task 15), `RigSprite` (Task 7), `GameAudio`/`findAllAssets` (`@web-games/audio`), `InputManager` (`@web-games/input`).
- Produces:
  - `stepsToRun(accMs: number, dtMs: number, speed: number): { steps: number; accMs: number }`: step length = `1000 / (60 × [1, 1.15, 1.3, 1.5][speed-1])`; at most 5 steps; the leftover is dropped past the cap.
  - `interface StageDef { id: string; name: string; sky: [string, string]; mountains: string[]; floor: string; floorLines: string; props: ("palms"|"bleachers"|"crowd"|"fence"|"backstop"|"house"|"swings")[] }`, `STAGES: StageDef[]`
    - The 4 starter stages: `schoolyard`, `track` (the spike's track, as the default), `ballfield`, `backyard`.
  - `normalizeStage(raw, warn): StageDef`
  - `player1Controls`, `player2Controls: Bindings`, using the spec's keyboard table and gamepad layout:
    - **P1:** WASD; punches `KeyR`/`KeyT`/`KeyY`; kicks `KeyF`/`KeyG`/`KeyH`; start `Digit1`.
    - **P2:** arrows; punches `KeyI`/`KeyO`/`KeyP` (+ `Numpad4`/`5`/`6`); kicks `KeyK`/`KeyL`/`Semicolon` (+ `Numpad1`/`2`/`3`); start `Enter`/`NumpadEnter`.
    - **Pad:** X=2, Y=3, RB=5 for punches; A=0, B=1, RT=7 for kicks; start 9; D-pad 12–15 plus the left stick.
  - `inputFrameFrom(input: InputManager, player: number): InputFrame`
  - `FightScene` with data `{ p1: Fighter; p2: Fighter; cpu: [boolean, boolean]; stage: StageDef; onDone: (winner: 0|1|"draw") => void }`
  - `soundEffects`: `hit`, `heavyHit`, `block`, `whoosh`, `special`, `ko`, `round`, `fight`, `youWin`, `menuMove`, `menuSelect`. `musicTracks`: `title`, `select`, `fight`.
- **Behavior:**
  - **Loop:** fixed-step `update` with `stepsToRun`; the CPU or player inputs feed `stepMatch`.
  - **Events:**
    - `hit` → spark (at the hit point), defender shake, camera shake (heavy only), sound
    - `special` → name callout
    - `ko` → "K.O.!" banner
    - `round` / `fight` → "ROUND N" / "FIGHT!" banners
    - `timeOver` → "TIME!"
  - **HUD** (second camera): SF2 bars as in the spike, timer (seconds), names, round-win markers, and the combo counter "N HITS!" when ≥ 2.
  - **Debug:** `showHitboxes` draws hurtboxes (blue) and active hitboxes (red).
  - **Dizzy:** stars from `effects.ts`.
  - **Mirror match:** when both fighters share an id, P2 uses `alternateColors`.
  - **Boot:**
    - finds optional sounds with `findAllAssets(audioCandidates(…))` and optional part PNGs at `assets/fighters/<id>/<part>.png`, using `findAssets`;
    - loads the roster (`loadRoster`);
    - builds the textures.
  - **`main.ts`:** `?fight=colin,ryan` jumps straight into a CPU-vs-player fight, for testing.

- [ ] **Step 1: Write failing tests.**
  - **`stepsToRun`:**
    - `stepsToRun(0, 16.7, 1)` → 1 step;
    - `stepsToRun(0, 5000, 1)` → 5 steps and `accMs < 1000/60`;
    - speed 4 → step length `1000/90`.
  - **`normalizeStage`:** `normalizeStage({id: "moon", sky: ["nope"]})` → `sky` defaults with a warning, and `props` filters unknown values.
  - **Controls:** the P1 and P2 key sets don't overlap except for shared start/mute keys, and every action from `B` has at least one key per player.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. `FighterView` keeps the previous pose snapshot at each animation change, so `samplePose` blends from it.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Manual check.** Open `http://localhost:8002/?fight=colin,ryan`. Expected:
  - Colin vs CPU Ryan on the track, with the pixel filter and a sharp HUD.
  - Every normal works; qcf+punch throws DONUT BLAST with its callout; blocking works; dizzy and KO work; rounds advance; time-over works with `roundTime: 30`.
  - With `showHitboxes: true`, the boxes match the visible limbs closely enough.
- [ ] **Step 6:** Commit: `feat(fighters): add fight scene with effects, HUD, stages and sound`.

### Task 17: Title, select, versus, champ screens and game flow

**Files:**
- Create: `src/scenes/{TitleScene,SelectScene,VersusScene,ChampScene}.ts`, `src/flow.ts`
- Modify: `src/main.ts`, `src/scenes/BootScene.ts`
- Test: `tests/flow.test.ts`

**Interfaces:**
- Produces:
  - `type Mode = "arcade" | "versus"`
  - `interface FlowState { mode: Mode; p1: Fighter; p2?: Fighter; ladder: Fighter[]; ladderIndex: number }`
  - `afterMatch(f: FlowState, winner: 0|1|"draw"): { next: "versus"|"champ"|"menu"; flow: FlowState }`: in arcade mode a P1 win advances the ladder, the end of the ladder → `champ`, and a loss or draw → `menu`, which offers continue (retry) or quit.
  - `gridLayout(count: number, width = 960): { cols: number; cellSize: number; positions: { x: number; y: number }[] }`
- **Screens:**
  - **Title:** "FLYNN FAMILY FIGHTERS" in the arcade-logo style (gradient, outline, shine), over the track stage.
    - Options: `1P ARCADE`, `2P VERSUS`, `QUIT TO ARCADE` (uses `arcadeUrl("flynn-family-fighters", { dev: import.meta.env.DEV })`).
    - The browser Back button restores via `pageshow` with a reload, like the arcade.
  - **Select:**
    - a portrait grid (`renderPortrait`) from `gridLayout`
    - flashing P1 (blue) and P2 (red) cursors, and a big live `RigSprite` preview of each highlighted fighter in `idle`
    - names, the specials' names, and roster `problems` listed in a friendly box ("broken.ts has a problem: …")
    - in arcade mode only P1 picks; in versus each player confirms with their own start/punch button
    - zero fighters → a friendly message explaining how to add one (`/add-fighter`, or copy `colin.ts`)
  - **Versus:** both fighters in win pose, names, a big "VS", for 2.5 s, then the fight.
  - **After a match:** a menu with REMATCH, CHARACTER SELECT and QUIT TO TITLE (versus mode), or the arcade-mode flow.
  - **Champ:** the winner in `win` pose, their `winQuote`, and "YOU'RE THE CHAMP!".

- [ ] **Step 1: Write failing tests.**
  - **`afterMatch`:**
    - arcade, ladder of 3, index 0, winner 0 → `next: "versus"`, index 1;
    - index 2 + winner 0 → `champ`;
    - winner 1 → `menu`;
    - draw → `menu`.
  - **`gridLayout`:**
    - `gridLayout(2)` → 2 positions, all within 0–960;
    - `gridLayout(13)` → positions don't overlap (distance ≥ `cellSize`) and all fit on screen.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Manual check.**
  - The full loop works: title → 1P arcade → select Colin → versus screen → fight Ryan → champ.
  - 2P versus with both picking Colin → P2 has alternate colors.
  - Temporarily add a broken `src/characters/oops.ts` (`export const fighter = ;`) → the select screen lists the problem and Colin and Ryan still work. Then delete `oops.ts`.
- [ ] **Step 6:** Commit: `feat(fighters): add title, select, versus and champ screens`.

### Task 18: Repo integration: Docker, arcade, CI, docs

**Files:**
- Create: `flynn-family-fighters/{Dockerfile,nginx.conf,arcade.ts,README.md}`
- Modify: `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/images.yml`, `arcade/nginx.conf`, `CLAUDE.md`, `README.md`
- Test: `flynn-family-fighters/tests/arcade.test.ts`

**Interfaces:**
- Consumes: `validateGames` (`@web-games/arcade`).
- Produces:
  - `arcadeInfo: GameInfo`:
    - `id: "flynn-family-fighters"`, `title: "FLYNN FAMILY FIGHTERS"`, `players {min:1, max:2, coop:false}`, `devPort: 8002`, `order: 2`
    - a blurb and colors (`primary "#ff4040"`, `secondary "#ffe14a"`)
    - `screenArt`: 32×24, two tiny fighters facing off on the sunset track

- [ ] **Step 1: Write a failing test.** `validateGames([{ folder: "flynn-family-fighters", info: arcadeInfo }], warn)` returns 1 game, with `warn` never called. (Copy `super-flynn-bros/tests/arcade.test.ts`.)
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Create** `arcade.ts`. Copy Super Flynn Bros' `Dockerfile` and `nginx.conf`, replacing the game name (`FROM --platform=$BUILDPLATFORM node:22-alpine AS build`).
- [ ] **Step 4: Edit the infrastructure** (each edit copies the `super-flynn-bros` entry):
  - **`docker-compose.yml`:** a `flynn-family-fighters` service, port `8002:80`, added to the `arcade` service's `depends_on`.
  - **`docker-compose.prod.yml`:** a block with `image: ${IMAGE_PREFIX:-ghcr.io/mikeflynn/the-flynn-arcade}/flynn-family-fighters:${IMAGE_TAG:-latest}`, `build: !reset null`, `pull_policy: always`, `ports: !reset []`.
  - **`images.yml`:** add `flynn-family-fighters` to `matrix.service`.
  - **`arcade/nginx.conf`:** copy both `super-flynn-bros` location blocks, with the new name in all four places.
- [ ] **Step 5: Docs.**
  - **`CLAUDE.md`:**
    - §1 layout adds `lib/rig/` and `.claude/skills/`
    - §4 port registry: `flynn-family-fighters | 8002 | SF2-style family fighting game (1–2 players, local)`; `_(next game)_` becomes 8003
    - §6 lists `lib/rig` (paper-doll SF2-style characters drawn from a `Look`)
    - a new line in §8: project skills live in `.claude/skills/<name>/SKILL.md`
    - an Amendment Log entry dated today
  - **Root `README.md`:** a games-table row in the same fun tone.
  - **Game `README.md`:** every §3/§7 section:
    - how to play (both keyboard layouts, gamepad, the motion notation explained for kids)
    - How It Works (the rig, the simulation, data-driven moves, with file links)
    - Make It Your Own:
      - getting started
      - easy tweaks (settings names with values to try)
      - make yourself a fighter (`/add-fighter` or copy `colin.ts`; every `Look` field explained)
      - draw your own head (PNG overrides: path, part names, any size scales to fit)
      - add a stage, rename and recolor your special, faster fireballs
      - challenges: a new move type, a new animation by editing angles
      - sounds (the file list)
      - Oops, I broke it
    - the multiplayer server isn't used; port 8002; credits (no third-party assets)
- [ ] **Step 6:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 7: Docker check.**
  - Run `docker compose up --build -d`.
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/` → `200`.
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/flynn-family-fighters/` → `200`.
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/flynn-family-fighters/assets/sounds/hit.mp3` → `404`.
  - `curl -sI http://localhost:8000/flynn-family-fighters | grep -i location` → `/flynn-family-fighters/`.
  - The arcade at `:8000` shows the new cabinet. Afterwards: `docker compose down`.
- [ ] **Step 8:** Commit: `feat(fighters): join the arcade, Docker, CI and docs`.

### Task 19: `/add-fighter` skill

**Files:**
- Create: `.claude/skills/add-fighter/SKILL.md`

**Interfaces:**
- Consumes: the `Fighter` file format (Task 8), the option lists in `lib/rig/src/look.ts` (Task 2), `MOVE_TYPES` (Task 13), `STAGES` (Task 16).

- [ ] **Step 1: Write `SKILL.md`.**
  - **Frontmatter:**
    - `name: add-fighter`
    - `description`: "Use when someone wants to add a family member as a new fighter in Flynn Family Fighters. Interviews them and writes flynn-family-fighters/src/characters/<name>.ts"
  - **Body:** follow the spec's 7 steps. The interview asks one kid-friendly question at a time:
    1. first name and body frame
    2. fighting style and muscle
    3. height and build
    4. skin, hair and eye colors; hairstyle
    5. face details: jaw, brows, eyes, nose, freckles, glasses
    6. clothes colors, extras and weapon
    7. personality → stats
    8. 2–3 signature moves, described and named
    9. win quote and home stage
  - **Rules:**
    - Read the option lists from `look.ts`, `moves.ts` and `stages.ts` at run time; never from memory.
    - Map answers to the nearest options.
    - If something isn't in the library, add a part or move type following the existing entries, with tests in the same change.
    - Keep stats around the roster average: read the existing character files, keep the total within ±2 of the average total.
    - Write only first name, look, stats, specials, win quote and stage. Never photos, ages, last names or schools.
    - Then run `npm test -w flynn-family-fighters && npm run typecheck`, tell the person to open `http://localhost:8002/?viewer` and the select screen, and commit per the repo's git rules.
- [ ] **Step 2: Verify the skill.**
  - Follow `SKILL.md` exactly to add a throwaway fighter named `TESTY`: feminine frame, brawler, ponytail, freckles, glasses, hockey-stick, `rapid-hits` named "STICK FLURRY".
  - Confirm `npm test` passes, and that TESTY appears in `?viewer` and on the select screen looking athletic and distinct from Colin and Ryan.
  - Then delete `testy.ts` and do not commit it.
- [ ] **Step 3:** Commit `SKILL.md`: `feat(fighters): add /add-fighter skill`.

---

## Execution Notes

- **Tasks 1–7 (the rig)** don't depend on the game.
- **Tasks 9–14 (the engine)** depend only on Task 8's `Fighter` type.
- **Tasks 15–17** bring the rig and the engine together.
- **Not planned in v1:** secondary motion (swinging ponytails and belt tails). The spec marks it nice-to-have; add it after merge if wanted.
- Merge to `main` only after Task 18's Docker check and a played match. Pushing to `main` deploys to arcade.flynn.link, so ask the user first.
