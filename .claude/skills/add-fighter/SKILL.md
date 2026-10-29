---
name: add-fighter
description: Use when someone wants to add a family member as a new fighter in Flynn Family Fighters. Interviews them and writes flynn-family-fighters/src/characters/<name>.ts
---

# Add a Fighter

Adds one family member to Flynn Family Fighters by interviewing a grown-up or
a kid, then writing one file: `flynn-family-fighters/src/characters/<name>.ts`.
Talk in a warm, playful, kid-friendly voice. Keep questions short.

## Ground rules

- **One question at a time.** Wait for the answer before the next one. Offer
  2-4 choices in plain words ("round, square, soft or pointy chin?"). "Not sure"
  or "skip" is fine; use a sensible default.
- **Read the facts at run time, never from memory.** Before you start, read:
  - `lib/rig/src/look.ts`: `BODY_FRAMES`, `ARCHETYPES`, `BUILDS`, `HAIR_STYLES`, `JAWS`, `BROWS`, `EYE_SHAPES`, `NOSES`, `EXTRAS`, `WEAPONS`, `LOOK_LIMITS`
  - `flynn-family-fighters/src/moves.ts`: `MOVE_TYPES` (and its "add your own" guide)
  - `flynn-family-fighters/src/stages.ts`: `STAGES`
  - `flynn-family-fighters/src/fighter.ts`: `STAT_LIMITS`, `SPECIAL_LIMITS`, `MAX_SPECIALS`, `MOVE_TYPE_NAMES`
  - every file in `flynn-family-fighters/src/characters/` (the format, the comments, the roster stats)
- **Privacy.** The file holds only: a first name, the look, stats, specials, a
  win quote and a home stage. Never photos, ages, last names, schools or
  addresses, even if offered. If someone shares them, don't write them down.
  A "weight" answer becomes `build` (lean, medium, big), nothing more.
- **Family friendly.** Every body is strong and athletic; no blood; friendly trash talk only. No Capcom or other game names; special moves get fun names of the person's own.

## 1. Interview

Ask in this order, one question each:

1. First name, and body frame (`BODY_FRAMES`: boy/man or girl/woman look).
2. Fighting style (`ARCHETYPES`: martial artist or street brawler) and how over-the-top muscly (`muscle`, within `LOOK_LIMITS`).
3. How tall compared to others (`height`) and body `build`.
4. Skin, hair and eye colors (ask in words, turn them into `#rrggbb`), and hairstyle (`HAIR_STYLES`).
5. Face details: jaw, brows, eyes, nose, freckles, glasses. Likeness lives here.
6. Favorite clothes and colors (top, bottom, belt, shoes, accent), then an accessory (`EXTRAS`) and a weapon or prop (`WEAPONS`).
7. Personality, to guide the stats ("speedy? strong? tough? bouncy?").
8. Two or three signature moves: describe each, then give it a fun name.
9. A win quote (short and friendly) and a home stage (`STAGES`, ask by stage `name`).

## 2. Map

- Map each answer to the **closest** existing option. Say what you picked ("that sounds like our `ponytail`!").
- Moves: match the description to a `MOVE_TYPES` entry (a thrown thing is a `fireball`, a rising punch an `uppercut`, and so on). Give each its own `name`; optional `color`, `speed`, `damageBonus` stay inside `SPECIAL_LIMITS`. At most `MAX_SPECIALS`.
- **If something isn't in the library** (a lacrosse stick, a braid style, a new kind of move), add it, don't fake it:
  - **New part:** add the name to its list in `look.ts`, add its drawing code in `lib/rig/src/parts/` (follow the neighbouring entries in `hair.ts`, `head.ts`, `body.ts`, `hands.ts` or `weapons.ts`), and add tests following the existing ones in `lib/rig/tests/`.
  - **New move type:** add a block to `MOVE_TYPES` in `moves.ts` following its guide, add its name to `MOVE_TYPE_NAMES` in `fighter.ts` (a test asserts they match), and add tests.
  - Do this in the same change, and run the tests. Keep kid files forgiving: unknown values must warn, never fail `typecheck`.

## 3. Keep it fair

Read the existing character files and work out the roster average for
`speed`, `power`, `jump` and `health`. Turn personality into stats **around**
that average, nudged up in some places and down in others, so the new fighter
isn't strictly better. Keep the **total of speed + power + jump** within +/-2
of the average total, each inside `STAT_LIMITS`. Health stays near the average
(trade it against the others). Nobody gets all 10s.

## 4. Write

Create `flynn-family-fighters/src/characters/<lowercase-first-name>.ts`
(kebab-case if needed). Copy the structure and the friendly comments of
`colin.ts` / `ryan.ts` exactly: header comment, `import type { Fighter }`,
`export const fighter: Fighter`, per-field comments listing the options, a
`// 🛠️ TRY THIS:` hint or two. Do not import Phaser. Use NAME in capitals.

## 5. Check and show

1. Run `npm test -w flynn-family-fighters && npm run typecheck` from the repo root. For new parts/moves also run `npm test` (all workspaces). Fix anything red.
2. Start `npm run dev -w flynn-family-fighters` (port 8002) in the background.
3. Tell the person: open `http://localhost:8002/?viewer` to see their fighter up close (pick them there, try `&anim=` names), and the fighter select screen at `http://localhost:8002/`. Look together; offer to tweak colors, hair or stats.
4. Stop the dev server when done.

## 6. Privacy check

Reread the file you wrote. Anything beyond first name, look, stats, specials,
win quote and stage? Remove it.

## 7. Commit

Follow the repo's git rules (see `CLAUDE.md` and project memory): commit
freely on the current branch, one commit for any new part/move type (with its
tests) before the one for the character file; use messages like
`feat(fighters): add <Name> fighter`. Never push or merge without asking.
