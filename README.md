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
| _Coming soon…_ | The first cabinet is still being built! 🔧 | | |

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
Then open the game's address in your browser. Each game's README says which
one, like `http://localhost:8001`.

**The tinkering way (live editing):**
```bash
npm install
npm run dev -w <game-name>
```
Open the address it prints. Now every time you save a change, the game
updates right in front of you. ✨

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
- **`docker-compose.yml`** runs the whole arcade

---

<p align="center"><b>GAME OVER?</b> Never. Just press <b>START</b> again. 🕹️</p>
