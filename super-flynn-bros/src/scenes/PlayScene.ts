import Phaser from "phaser";
import { settings } from "../settings";
import { levels } from "../levels";
import { catalog, checkedHeroes as heroDefs } from "../engine/catalog";
import { findRespawn, findSafeSpawn, loadLevel, tileVariant, TILE_SIZE, type Cell, type LoadedLevel } from "../engine/levelLoader";
import { tileFrame } from "../engine/tileset";
import { createBackground } from "../engine/backgrounds";
import { nextScrollX } from "../engine/camera";
import { fitSprite } from "../engine/sprites";
import { getServices, unlock, type GameMode } from "../engine/services";
import { addText, textStyle } from "../engine/ui";
import { Hero } from "../engine/Hero";
import { Hazard } from "../engine/Hazard";
import type { HeroDef, ItemDef, LevelDef } from "../engine/types";
import type { MusicKey } from "../sounds";
import type { HudState } from "./HudScene";

export interface PlayData {
  mode: GameMode;
  levelIndex: number;
  /** Score carried over from earlier levels. */
  score: number;
}

/** Where a sprite stands when it's placed in map cell `cell` (bottom-center of the cell). */
const feetOf = (cell: Cell) => ({ x: cell.col * TILE_SIZE + TILE_SIZE / 2, y: (cell.row + 1) * TILE_SIZE });

export class PlayScene extends Phaser.Scene {
  private run!: PlayData;
  private def!: LevelDef;
  private level!: LoadedLevel;
  private heroes: Hero[] = [];
  private hazards!: Phaser.GameObjects.Group;
  private items!: Phaser.GameObjects.Group;
  private updateBackground: (scrollX: number) => void = () => {};
  private score = 0;
  private donuts = 0;
  private startedAt = 0;
  private finished = false;

  constructor() {
    super("Play");
  }

  init(run: PlayData): void {
    this.run = run;
    this.heroes = [];
    this.score = run.score;
    this.donuts = 0;
    this.finished = false;
  }

  create(): void {
    const { audio, tileset, artSizes } = getServices();
    this.def = levels[this.run.levelIndex] ?? levels[0];
    this.level = loadLevel(this.def.map, catalog, this.def.name);
    this.level.warnings.forEach((message) => console.warn(message));
    const worldWidth = this.level.cols * TILE_SIZE;
    const worldHeight = this.level.rows * TILE_SIZE;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldWidth, Math.max(worldHeight, this.scale.height));
    cam.setScroll(0, 0);

    this.updateBackground = createBackground(this, this.def.theme, worldHeight - 2 * TILE_SIZE);

    // Tiles
    const data = this.level.tiles.map((row, r) =>
      row.map((key, c) => (key ? tileFrame(tileset, key, tileVariant(this.level.tiles, c, r)) : -1)),
    );
    const map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tilesetImage = map.addTilesetImage("tiles", "tiles", TILE_SIZE, TILE_SIZE, 0, 0);
    const layer = tilesetImage ? map.createLayer(0, tilesetImage, 0, 0) : null;
    if (!layer) throw new Error("Couldn't build the level's tiles.");
    layer.setCollision(tileset.solidIndexes);

    // Goal sign
    const goal = feetOf(this.level.goal);
    this.add.image(goal.x, goal.y, "goal").setOrigin(0.5, 1);
    const labelSize = this.def.goalLabel.length > 6 ? 6 : 8;
    this.add.text(goal.x, goal.y - 40, this.def.goalLabel, textStyle(labelSize)).setOrigin(0.5);
    const goalZone = this.add.zone(goal.x, 0, TILE_SIZE, worldHeight).setOrigin(0.5, 0);
    this.physics.add.existing(goalZone, true);

    // Items float and bob
    this.items = this.add.group();
    for (const placed of this.level.items) {
      const def = catalog.items.find((i) => i.key === placed.key);
      if (!def) continue;
      const sprite = this.physics.add.sprite(placed.col * TILE_SIZE + TILE_SIZE / 2, placed.row * TILE_SIZE + TILE_SIZE / 2, def.key, 0);
      fitSprite(sprite, artSizes.get(def.key) ?? { width: 16, height: 16 });
      (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      sprite.setData("def", def);
      this.items.add(sprite);
      this.tweens.add({ targets: sprite, y: sprite.y - 2, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: (placed.col % 5) * 100 });
    }

    // Hazards
    this.hazards = this.add.group();
    for (const placed of this.level.hazards) {
      const def = catalog.hazards.find((h) => h.key === placed.key);
      if (!def) continue;
      const at = feetOf(placed);
      this.hazards.add(new Hazard(this, at.x, at.y, def, artSizes.get(def.key) ?? { width: 16, height: 16 }));
    }

    // Heroes
    const { starts } = this.level;
    const lineup: { def: HeroDef; player: 1 | 2; start: Cell }[] =
      this.run.mode === "coop"
        ? [
            { def: heroDefs.colin, player: 1, start: starts[1] },
            { def: heroDefs.ryan, player: 2, start: starts[2] },
          ]
        : [{ def: this.run.mode === "ryan" ? heroDefs.ryan : heroDefs.colin, player: 1, start: starts[1] }];
    this.heroes = lineup.map(({ def, player, start }) => {
      const at = feetOf(start);
      return new Hero(this, at.x, at.y, def, player, artSizes.get(def.key) ?? { width: 16, height: 32 });
    });

    // Who bumps into what
    this.physics.add.collider(this.heroes, layer);
    this.physics.add.collider(this.hazards, layer);
    this.physics.add.overlap(this.heroes, this.hazards, (a, b) => this.onBump(a as unknown as Hero, b as unknown as Hazard));
    this.physics.add.overlap(this.heroes, this.items, (a, b) =>
      this.onCollect(a as unknown as Hero, b as unknown as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.heroes, goalZone, () => this.onGoal());

    const banner = addText(this, this.scale.width / 2, 60, `LEVEL ${this.run.levelIndex + 1}: ${this.def.name.toUpperCase()}`, 8, "#f6d860");
    this.tweens.add({ targets: banner, alpha: 0, delay: 2000, duration: 600, onComplete: () => banner.destroy() });

    this.scene.launch("Hud");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop("Hud"));
    this.startedAt = this.time.now;
    audio.playMusic(this.def.music ?? (`level${this.run.levelIndex + 1}` as MusicKey));
    cam.fadeIn(300);
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;
    const { input, audio } = getServices();
    const now = this.time.now;

    if (input.anyJustPressed("pause")) {
      audio.playSfx("pause");
      this.scene.launch("Pause");
      this.scene.pause();
      return;
    }

    for (const hero of this.heroes) {
      if (hero.isOut) continue;
      const p = hero.player;
      const jumped = hero.move(now, delta, {
        left: input.isDown(p, "left"),
        right: input.isDown(p, "right"),
        jumpHeld: input.isDown(p, "jump"),
        jumpPressed: input.justPressed(p, "jump"),
      });
      if (jumped) audio.playSfx("jump");
      else if (hero.landed) audio.playSfx("land");
      hero.rememberSafeGround(this.isGroundAt);
    }

    const cam = this.cameras.main;
    const worldWidth = this.level.cols * TILE_SIZE;
    const worldHeight = this.level.rows * TILE_SIZE;
    const active = this.heroes.filter((h) => !h.isOut);
    if (active.length > 0) {
      cam.scrollX = nextScrollX(cam.scrollX, Math.max(...active.map((h) => h.x)), cam.width, worldWidth);
      this.keepOnScreen(active, cam.scrollX, worldWidth);
    }

    for (const hero of active) {
      if (hero.y > worldHeight + TILE_SIZE) this.onFall(hero);
    }

    const cameraRight = cam.scrollX + cam.width;
    for (const hazard of [...this.hazards.getChildren()] as unknown as Hazard[]) {
      if (hazard.y > worldHeight + 64) {
        hazard.destroy();
        continue;
      }
      if (hazard.think(now, cam.scrollX, cameraRight, active, this.isGroundAt) === "bark") audio.playSfx("bark");
    }

    this.updateBackground(cam.scrollX);
    this.events.emit("hud", this.hudState(now));
  }

  private readonly isGroundAt = (x: number, y: number): boolean =>
    this.level.solid[Math.floor(y / TILE_SIZE)]?.[Math.floor(x / TILE_SIZE)] === true;

  /** Nobody can walk off the left of the screen. In co-op the camera pushes the trailing brother along. */
  private keepOnScreen(active: Hero[], scrollX: number, worldWidth: number): void {
    const leader = active.reduce((a, b) => (b.x > a.x ? b : a));
    for (const hero of active) {
      const body = hero.body;
      if (body.left < scrollX) {
        if (hero !== leader && body.blocked.right) {
          // Stuck behind a wall while being pushed: pop over next to the leader.
          const spot = this.spawnPoint(leader.x);
          hero.placeAt(spot.x, spot.y);
          continue;
        }
        hero.setX(hero.x + (scrollX - body.left));
        if (body.velocity.x < 0) body.setVelocityX(0);
      }
      const maxX = worldWidth - body.halfWidth;
      if (hero.x > maxX) hero.setX(maxX);
    }
  }

  /** A safe place to stand at or after `x` that's on screen. */
  private spawnPoint(x: number): { x: number; y: number } {
    const col = Math.max(Math.floor(x / TILE_SIZE), this.firstVisibleCol());
    return feetOf(findSafeSpawn(this.level, col) ?? this.level.starts[1]);
  }

  private firstVisibleCol(): number {
    return Math.ceil(this.cameras.main.scrollX / TILE_SIZE) + 1;
  }

  private onBump(hero: Hero, hazard: Hazard): void {
    if (this.finished || hero.isOut || !hazard.harmful) return;
    if (hero.bump(this.time.now, hazard.x)) {
      getServices().audio.playSfx("hurt");
      this.checkHearts(hero);
    }
  }

  private onFall(hero: Hero): void {
    getServices().audio.playSfx("fall");
    const cell = findRespawn(this.level, Math.floor(hero.lastSafe.x / TILE_SIZE), this.firstVisibleCol());
    hero.fall(this.time.now, feetOf(cell ?? this.level.starts[1]));
    this.checkHearts(hero);
  }

  private checkHearts(hero: Hero): void {
    if (hero.hearts > 0) return;
    const others = this.heroes.filter((h) => h !== hero && !h.isOut);
    if (others.length === 0) {
      this.restartLevel();
      return;
    }
    hero.knockOut();
    this.time.delayedCall(settings.respawnDelayMs, () => {
      const buddy = this.heroes.find((h) => h !== hero && !h.isOut);
      if (!buddy || this.finished) return;
      const spot = this.spawnPoint(buddy.x);
      hero.revive(spot.x, spot.y, 1, this.time.now);
      getServices().audio.playSfx("respawn");
    });
  }

  private restartLevel(): void {
    if (this.finished) return;
    this.finished = true;
    getServices().audio.playSfx("levelRestart");
    this.physics.pause();
    this.cameras.main.fadeOut(500);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ ...this.run }));
  }

  private onCollect(hero: Hero, sprite: Phaser.Physics.Arcade.Sprite): void {
    if (!sprite.active || hero.isOut) return;
    const def = sprite.getData("def") as ItemDef;
    sprite.destroy();
    this.score += def.score;
    if (def.key === "donut") this.donuts++;
    if (def.hearts > 0) hero.heal(def.hearts);
    getServices().audio.playSfx(def.sound);
  }

  private onGoal(): void {
    if (this.finished) return;
    this.finished = true;
    const { audio } = getServices();
    audio.stopMusic();
    audio.playSfx("goal");
    unlock(Math.min(levels.length, this.run.levelIndex + 2));
    this.physics.pause();
    const timeMs = this.time.now - this.startedAt;
    this.time.delayedCall(1200, () =>
      this.scene.start("LevelComplete", {
        mode: this.run.mode,
        levelIndex: this.run.levelIndex,
        score: this.score,
        donuts: this.donuts,
        timeMs,
      }),
    );
  }

  private hudState(now: number): HudState {
    return {
      score: this.score,
      donuts: this.donuts,
      timeMs: now - this.startedAt,
      heroes: this.heroes.map((h) => ({ name: h.def.name, hearts: h.hearts, out: h.isOut })),
      maxHearts: settings.maxHearts,
      muted: getServices().audio.muted,
    };
  }
}
