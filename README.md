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

The arcade runs on any Linux server with Docker (2 GB of memory is
comfortable, since it builds the games on the server). **Caddy** sits in front
and gets an HTTPS certificate for your domain automatically. HTTPS matters:
browsers only allow gamepads on secure pages.

1. Point your domain's DNS (an `A` record, like `arcade.yourdomain.com`) at the
   server, and open ports 80 and 443 in its firewall.
2. On the server:
   ```bash
   git clone https://github.com/mikeflynn/the-flynn-arcade.git
   cd the-flynn-arcade
   cp .env.example .env      # then set ARCADE_DOMAIN to your domain
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```
3. Open `https://arcade.yourdomain.com`. 🎉

**To update** after pushing new changes:
```bash
git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

How it fits together: [`docker-compose.prod.yml`](docker-compose.prod.yml) adds
Caddy (see [`deploy/Caddyfile`](deploy/Caddyfile)) on ports 80/443 and hides
every other port, so visitors only reach the arcade, which forwards
`/<game-name>/` to each game. Everything restarts on its own after a reboot.
It needs Docker Compose 2.24 or newer.

---

<p align="center"><b>GAME OVER?</b> Never. Just press <b>START</b> again. 🕹️</p>
