# 🕹️ The Flynn Arcade 🕹️

```
 ═══════════════════════════════════════════
    ★  T H E   F L Y N N   A R C A D E  ★

           PRESS START TO BEGIN
              INSERT COIN
 ═══════════════════════════════════════════
```

**Welcome, player!** This is an arcade full of games you can play in your
web browser. They're fun to play, and that's only half of it.

**Every game here is built to be taken apart and put back together *your* way.**

Want the hero to look like you? Swap in your own picture. 🧑‍🚀
Too easy? Make the bad guys faster. 👾💨
Too hard? Give yourself 99 lives. ❤️❤️❤️
Got an idea for a brand-new enemy? Draw it and drop it in. 🐉

You don't have to be a programmer to start. If you can change a number and
hit save, you can change a game.

---

## 🎮 The Games

| Game | What it is | Players | Make-it-your-own ideas |
| ---- | ---------- | ------- | ---------------------- |
| [**Super Flynn Bros**](super-flynn-bros/) 🏃 | An 8-bit side scroller: help Colin and Ryan walk to school, practice, and back home through Woodland Hills. Dodge dogs and sprinklers, grab donuts! 🍩 | 1–2 (co-op) | Make the hero look like you, change gravity for moon jumps, invent new hazards, build your own street |

Every game has its own folder with a `README.md` that tells you:
- **How to play:** the controls and the goal
- **How it works:** a peek behind the curtain at what makes the game tick
- **Make it your own:** step-by-step tweaks, custom characters, and challenges

---

## 🚀 How to Play

You'll need a grown-up for this part the first time.

**The easy way (Docker):**
```bash
docker compose up --build
```
Then open **http://localhost:8000**: that's the arcade! 🕹️ Walk along the
cabinets with ◀ ▶, and press Start (Enter or Space) to play. Every game has a
"BACK TO ARCADE" option to come back.

**The tinkering way (live editing):**
```bash
npm install
npm run dev -w arcade            # the arcade, at http://localhost:8000
npm run dev -w <game-name>       # in another terminal: the game you're changing
```
Now every time you save a change, the game updates right in front of you. ✨
(You can also open a game's own address directly, like `http://localhost:8001`.)

---

## 🛠️ The Tinkerer's Code

Here's how to mess with a game:

1. **Find `settings.ts`.** Every game keeps its fun knobs in
   `src/settings.ts`: speed, lives, enemies, colors, and more. Each one has a
   note telling you what it does and what numbers to try.
2. **Look for 🛠️ TRY THIS.** Those comments in the code mark good spots to
   experiment.
3. **Swap the art.** Pictures and sounds live in `public/assets/`. Replace a
   file with your own (same name!) and it shows up in the game.
4. **Break stuff! It's OK.** You can always undo. Every game's README has an
   "Oops, I broke it" section to get you back on track.
5. **Show someone.** Made the game ridiculous? Made it impossible? Made it
   better? Share it! 🏆

---

## 🧰 For Grown-Ups & Game Builders

The arcade's build rules (tech stack, folder layout, Docker setup, the shared
multiplayer server, and what every game must include) live in
[`CLAUDE.md`](CLAUDE.md). Read it before adding a new game.

Quick overview:
- **Stack:** TypeScript + Vite + Phaser 3
- **Each game** lives in its own folder at the top level
- **`server/`** is one shared multiplayer server for two-player games
- **`lib/`** holds shared helpers like gamepad support and networking
- **`arcade/`** is the game picker everyone starts from, at port 8000
- **`docker-compose.yml`** runs the whole arcade

### 🌐 Putting the arcade on the internet

The arcade runs on any Linux server with Docker, behind the
[Caddy](https://caddyserver.com) web server already running on that server.
Caddy handles HTTPS. That matters, because browsers only allow gamepads on
secure pages.

The server never builds anything. Every push to `main` makes GitHub Actions
test the code, build the arcade and every game into Docker images, and publish
them to GitHub's container registry ([`.github/workflows/images.yml`](.github/workflows/images.yml)).
The server just downloads the finished images, so a small server is plenty.

1. Point your domain's DNS (an `A` record, like `arcade.flynn.link`) at the
   server.
2. On the server, start the arcade:
   ```bash
   git clone https://github.com/mikeflynn/the-flynn-arcade.git
   cd the-flynn-arcade
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```
   It listens on `127.0.0.1:8000`, so only Caddy can reach it. (Port 8000
   taken? Copy `.env.example` to `.env` and change `ARCADE_PORT`.)
3. Add the site block from [`deploy/Caddyfile.example`](deploy/Caddyfile.example)
   to your Caddyfile (often `/etc/caddy/Caddyfile`), with your domain:
   ```
   arcade.flynn.link {
   	encode zstd gzip
   	reverse_proxy localhost:8000
   }
   ```
   Then `sudo systemctl reload caddy`.
4. Open `https://arcade.flynn.link`. 🎉

**To update** after pushing new changes, wait for the "Images" run to go
green on GitHub's **Actions** tab, then on the server:
```bash
git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
(`git pull` picks up any changes to the compose files; `up -d` downloads the
newest images and restarts only what changed. To roll back, set `IMAGE_TAG` in
`.env` to an earlier commit's full SHA.)

How it fits together: [`docker-compose.prod.yml`](docker-compose.prod.yml)
runs the published images, keeps the arcade on `127.0.0.1`, and hides every
game's own port, so visitors
only reach the arcade (through Caddy), which forwards `/<game-name>/` to each
game. Everything restarts on its own after a reboot. It needs Docker Compose
2.24 or newer.

---

<p align="center"><b>GAME OVER?</b> Never. Just press <b>START</b> again. 🕹️</p>
