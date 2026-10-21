# The Flynn Arcade — Global Guidelines

This repo is a collection of browser-based games that share one stack, one
Docker Compose file, an optional multiplayer server, and shared libraries.

**Purpose:** besides being fun, every game is a teaching tool. Kids should be
able to see how a game works and make simple edits themselves, like changing
the difficulty, adding custom enemies, or making the hero look like them. See
§7 ("Kid-Friendly Tweakability"). It applies to every game.

**These rules apply to every game in this repo.** Read this file before creating
or editing a game. It is a living document: when a rule changes, edit it here
and add a line to the [Amendment Log](#amendment-log) at the bottom.

---

## 1. Repository Layout

```
the-flynn-arcade/
├── CLAUDE.md              # This file — global rules (source of truth)
├── README.md              # Kid-friendly arcade front page + games table
├── docker-compose.yml     # Master compose file: one service per game + server
├── package.json           # npm workspaces root (games, arcade, lib/*, server)
├── arcade/                # The Flynn Arcade: the game picker everyone starts from (port 8000)
├── server/                # Universal multiplayer server (only if a game needs it)
├── lib/                   # Shared libraries, one package per subdirectory
│   ├── input/             #   keyboard + gamepad actions per player
│   ├── pixel-art/         #   text-grid pixel art → Phaser textures
│   ├── audio/             #   optional sounds/music, skipped when missing
│   ├── settings/          #   clamp kid-edited numbers into safe ranges
│   └── arcade/            #   GameInfo + links between the arcade and games
└── <game-name>/           # One directory per game, at the repo root
    └── arcade.ts          #   how the game shows up in the arcade (§10)
```

- Each game lives in its own **kebab-case** directory at the repo root
  (e.g. `space-pong/`, `tic-tac-toe/`).
- Reserved root directory names (never use for a game): `arcade`, `server`,
  `lib`, `docs`, `scripts`, `node_modules`.
- Games must not import from other games. Anything shared goes in `lib/`.

## 2. Stack (all games)

| Concern          | Choice                                   |
| ---------------- | ---------------------------------------- |
| Language         | TypeScript (strict mode)                 |
| Bundler/dev      | Vite                                     |
| Game engine      | Phaser 3                                 |
| Runtime          | Node.js 22 LTS                           |
| Package manager  | npm with workspaces (single root lockfile) |
| Production serve | Static build served by nginx (in Docker) |
| Multiplayer      | Node + TypeScript + WebSockets (`ws`), see §5 |

Don't add another engine or framework to a game without first amending this
section.

## 3. Game Directory Structure

```
<game-name>/
├── package.json        # name: "@web-games/<game-name>", private: true
├── tsconfig.json       # extends ../tsconfig.base.json
├── vite.config.ts
├── index.html
├── Dockerfile          # multi-stage: build with Node, serve with nginx
├── README.md           # see required sections below
├── public/
│   └── assets/         # images, audio, fonts; kids swap files here (§7)
└── src/
    ├── settings.ts     # ALL kid-tweakable values in one place (§7)
    ├── main.ts         # Phaser game config + boot
    └── scenes/         # one file per Phaser scene
```

Each game's `README.md` must include:
- what the game is and how to play (controls included)
- **"How It Works"**: a short, plain-language tour of the game's pieces
  (scenes, the game loop, how scoring and collisions work), with links to the
  files
- **"Make It Your Own"**: step-by-step tweaks a kid can try (§7)
- whether it uses the multiplayer server
- its assigned port (see §4)
- for maintainers: credits/licenses for third-party assets

## 4. Docker Compose

- `docker-compose.yml` at the root is the **single master compose file**.
- **Every time a game is added, renamed, or removed, update
  `docker-compose.yml` and the port registry below in the same change.**
- Each game gets one service named after its directory.
- Build context is the **repo root** (so the Dockerfile can reach `lib/`);
  set `dockerfile: <game-name>/Dockerfile`.
- Games that need the multiplayer server declare `depends_on: [server]`.
- The `server` service is only added once the first game needs it.

### Port Registry

| Service  | Host port | Notes                         |
| -------- | --------- | ----------------------------- |
| arcade   | 8000      | The Flynn Arcade game picker (front door) |
| server   | 3000      | Multiplayer WebSocket server (reserved) |
| super-flynn-bros | 8001 | 8-bit side scroller (1–2 players, local) |
| _(next game)_ | 8002 | Games get 8001, 8002, … in order |

Vite dev servers use the same port as the game's host port, so
`npm run dev -w <game-name>` and Docker never disagree.

## 5. Multiplayer Server (`server/`)

Only games that need networked play use it. It is **one server for all games**,
so it must stay game-agnostic.

Design rules:
- **Rooms are scoped by game.** A client connects, says which game it is
  (`gameId`), then creates or joins a room by short room code.
- **One message envelope** for everything:
  `{ type: string, payload?: unknown, from?: string, roomId?: string }`.
- **Default mode is relay**: the server forwards game messages to the other
  players in the room without understanding them. Most turn-based and simple
  real-time games need nothing more.
- **Optional authoritative mode**: a game that needs server-side logic
  (validation, hidden information, anti-cheat) registers a handler module in
  `server/src/games/<game-name>.ts` implementing a shared interface
  (e.g. `onJoin`, `onMessage`, `onLeave`, `tick`). The core server never
  imports game-specific code except through this registry.
- Built-in, game-independent features: room create/join/leave, player list,
  host assignment, reconnect handling, room cleanup when empty.
- Clients talk to the server only through `lib/net` — games never open raw
  WebSockets themselves.
- Message types shared between client and server live in a shared TypeScript
  package so both sides are type-checked against the same definitions.

When a new game needs a server feature, add it generically (useful to any game)
rather than special-casing one game in the core.

## 6. Shared Libraries (`lib/`)

- Each library is its own npm workspace package: `lib/<name>/` with
  `package.json` name `@web-games/<name>`.
- Games depend on it via `"@web-games/<name>": "*"` in their `package.json`.
- Current libraries:
  - `lib/input` — keyboard + gamepad (Gamepad API) actions per player
  - `lib/pixel-art` — text-grid pixel art, PNG overrides
  - `lib/audio` — optional sounds and music, quiet when files are missing
  - `lib/settings` — `clampSettings` for kid-edited numbers
  - `lib/arcade` — `GameInfo`, validation, arcade ↔ game URLs
- Candidates (create when first needed, not ahead of time):
  - `lib/net` — multiplayer client (connect, rooms, send/receive, reconnect)
  - `lib/ui` — shared menus, lobby screen, room-code entry
- Promote code into `lib/` once a second game needs it; don't build speculative
  abstractions.
- Libraries must not depend on any specific game.

## 7. Kid-Friendly Tweakability

The target audience for the code is a curious kid, roughly 8 to 14, with
help from a grown-up. Write games so the fun edits are easy and safe to make.

### Code rules
- **One settings file.** Every value a kid might want to change lives in
  `src/settings.ts`: speeds, lives, timers, enemy counts, spawn rates, colors,
  player name, difficulty presets, and so on. Each value gets a friendly
  comment explaining what it does and a sensible range, e.g.
  ```ts
  // How fast the hero runs. Try 100 (slow) to 600 (super fast)!
  export const HERO_SPEED = 250;
  ```
- **Data-driven content.** Enemies, levels, power-ups and similar things are
  defined as lists of plain objects in `settings.ts` (or a sibling file like
  `src/enemies.ts`), so "add a new enemy" means copying a block and changing a
  few values, not writing new logic.
- **Swappable art and sound.** Sprites and sounds are loaded by file name from
  `public/assets/`. Replacing `hero.png` with a drawing or photo of the same
  size should just work. Document the expected image size and format. Where
  possible, scale images to fit so an odd-sized picture still looks OK.
- **Readable code.** Prefer clear names and simple code over clever code.
  Comments explain *why* in plain language. Mark spots good for experimenting
  with a `// 🛠️ TRY THIS:` comment.
- **Forgiving.** A bad tweak (e.g. a negative speed, a missing image) should
  fall back to a default or show a friendly message, not a blank screen.
- **Fast feedback.** Edits show up instantly via Vite hot reload with
  `npm run dev -w <game-name>`.

### README "Make It Your Own" section
At minimum, include:
1. **Getting started:** how to run the game locally and where to edit (one
   short block a grown-up can follow).
2. **Easy tweaks:** change difficulty, speed, lives, etc. Give the exact
   setting name in `settings.ts`, what it does, and values to try.
3. **Make the hero look like you:** which image file to replace, its size,
   and how to draw or prepare one (a photo crop, pixel art, a drawing).
4. **Add a custom enemy / item / level:** copy-paste walkthrough using the
   data-driven lists.
5. **Challenges:** a few "can you…?" ideas that go slightly deeper (e.g.
   "make enemies speed up as your score goes up"), with a hint pointing at
   the right file or `TRY THIS` comment.
6. **Oops, I broke it:** how to undo (e.g. `git checkout -- <file>`, or the
   default values listed in the README).

## 8. Conventions

- TypeScript `strict: true`; no `any` without a comment explaining why.
- Each game must run standalone with `npm run dev -w <game-name>` (single-player
  or local mode works without the server if feasible).
- Standard scripts in every game's `package.json`: `dev`, `build`, `preview`,
  `typecheck`.
- Games should support keyboard at minimum; gamepad support via `lib/input`
  where it makes sense; touch where practical.
- Keep assets small and checked into the game's `public/` directory; note the
  source/license of any third-party asset in the game's README.

## 9. Checklist: Adding a New Game

1. Create `<game-name>/` with the structure in §3, putting tweakable values in
   `src/settings.ts` and assets in `public/assets/` (§7).
2. Add it to root `package.json` workspaces (if not covered by a glob).
3. Assign the next free port in the §4 registry.
4. Add its service to `docker-compose.yml`.
5. If it's multiplayer: ensure the `server` service exists, use `lib/net`,
   and add a server handler only if relay mode isn't enough.
6. Write the game's `README.md`, including "How It Works" and "Make It Your
   Own" (§3, §7).
7. Add a row for the game to the **🎮 The Games** table in the root
   `README.md`. Keep the root README's fun, kid-friendly tone.
8. Sanity-check tweakability: change a setting and swap the hero image, and
   confirm both work with hot reload.
9. Join the arcade (§10): add `<game-name>/arcade.ts` (and `src/vite-env.d.ts`
   so `import.meta.env.DEV` type-checks), copy the `super-flynn-bros` pair of
   `location` blocks in `arcade/nginx.conf` with the new name in all four
   places, add the game to the `arcade` service's `depends_on`, and add a
   "BACK TO ARCADE" / "QUIT TO ARCADE" option using `arcadeUrl()`.
10. Verify `docker compose up --build` works: the game on its own port, and
    through the arcade at `http://localhost:8000/<game-name>/`.

## 10. The Arcade (`arcade/`)

The arcade is the front door: kids open `http://localhost:8000` and pick a
game cabinet. It's a Vite + Phaser app like the games.

- **Joining:** each game exports `arcadeInfo: GameInfo` (from
  `@web-games/arcade`) in `<game-name>/arcade.ts`: `id` (= folder name),
  `title`, `blurb`, `players`, cabinet `colors`, `devPort`, optional `order`,
  and a `screenArt` text picture (up to 32 × 24). The arcade finds every
  `*/arcade.ts` automatically at build time. Never edit arcade code to add a game.
- **Routing:** in Docker the arcade serves `/` and its nginx forwards
  `/<game-name>/` to the game's container. In dev the arcade links to the
  game's own dev server (`devPort`). Games are built with `base: "./"` so they
  work under a path.
- **Going back:** games link back with `arcadeUrl("<game-name>", { dev:
  import.meta.env.DEV })`, which reopens the arcade on that game's cabinet.

---

## Amendment Log

Record every change to these guidelines (newest first).

- 2026-10-21 — Added **The Flynn Arcade** launcher (`arcade/`, port 8000) and
  §10. Games join with `<game>/arcade.ts`. Promoted shared code into
  `lib/pixel-art`, `lib/audio`, `lib/settings`; added `lib/arcade`.

- 2026-10-18 — First game: Super Flynn Bros on port 8001. Added the root
  npm workspace (`package.json`, `tsconfig.base.json`) and the first shared
  library, `lib/input` (keyboard + gamepad).

- 2026-10-18 — Repo named **The Flynn Arcade**. Added a kid-friendly root
  `README.md` with a games table; new-game checklist now includes adding the
  game to it.

- 2026-10-18 — Added the educational purpose and §7 Kid-Friendly
  Tweakability: a `settings.ts` file, data-driven content, swappable assets,
  and required README "How It Works" and "Make It Your Own" sections.

- 2026-10-18 — Initial guidelines: TS + Vite + Phaser 3 stack, per-game root
  directories, master docker-compose, universal relay/authoritative server,
  shared `lib/` packages.
