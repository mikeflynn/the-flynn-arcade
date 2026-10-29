import Phaser from "phaser";
import { alternateColors } from "@web-games/rig";
import { bakeFighter } from "@web-games/rig/canvas";
import { FighterSprite, renderPortrait } from "@web-games/rig/phaser";
import { ANIMS } from "../animations";
import { arcadeLadder } from "../engine/ladder";
import { Rng } from "../engine/rng";
import type { Fighter } from "../fighter";
import { gridLayout, type FlowState, type Mode } from "../flow";
import {
  backPressed, bands, flashOn, INK, label, P1_COLOR, P2_COLOR, pickPressed, place, useMenuControls,
} from "../render/menu";
import { settings } from "../settings";
import { getServices } from "./BootScene";

export interface SelectData {
  mode: Mode;
  /** Where the cursors start (the last picks, when coming back from a match). */
  p1Id?: string;
  p2Id?: string;
}

/** The grid sits in the middle of the screen, between the two big previews. */
const GRID_LEFT = 240;
const GRID_WIDTH = 480;
/** Where the previews stand (feet), facing each other. */
const PREVIEW_X = [128, 832] as const;
const PREVIEW_FEET = 484;
/** The previews only need these two animations, so moving the cursor stays quick. */
const PREVIEW_ANIMS = { idle: ANIMS.idle!, win: ANIMS.win! };
/** How long the picked fighter poses before the versus screen. */
const PICKED_MS = 900;
const COLORS = ["#7fb4ff", "#ff8a8a"] as const;
const CURSOR_COLORS = [P1_COLOR, P2_COLOR] as const;
/** Background bands, top to bottom. */
const BACKDROP = [0x1b1f5e, 0x22287a, 0x2a3394, 0x22287a, 0x1b1f5e, 0x141846];

let previewCount = 0;

interface Side {
  cursor: number;
  picked: boolean;
  sprite: FighterSprite | null;
  /** What the preview shows now, so it is only baked again when that changes. */
  shown: string;
  name: Phaser.GameObjects.Text;
  specials: Phaser.GameObjects.Text;
  tag: Phaser.GameObjects.Text;
  since: number;
}

/**
 * Character select: a grid of portraits (it grows as fighters are added),
 * a flashing cursor for each player and a big live preview of who they're on.
 * In arcade mode only player 1 picks; in versus each player picks with their
 * own start or punch button. Kicks go back.
 */
export class SelectScene extends Phaser.Scene {
  private mode: Mode = "arcade";
  private picks: SelectData = { mode: "arcade" };
  private roster: Fighter[] = [];
  private cells: { x: number; y: number }[] = [];
  private cols = 1;
  private cellSize = 0;
  private sides: Side[] = [];
  private cursorGfx!: Phaser.GameObjects.Graphics;
  private portraits: string[] = [];
  private doneAt = -1;

  constructor() {
    super("select");
  }

  init(data: SelectData): void {
    this.picks = data;
    this.mode = data.mode;
    this.doneAt = -1;
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    const { input, audio, roster, problems } = getServices();
    useMenuControls(input);
    audio.playMusic("select");
    this.roster = roster;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());

    bands(this, BACKDROP);
    label(this, "SELECT YOUR FIGHTER", 480, 16, { color: "#ffd23b", align: "center" });
    if (roster.length === 0) {
      this.showNoFighters();
      if (problems.length > 0) this.showProblems(problems);
      return;
    }

    this.drawGrid();
    this.cursorGfx = this.add.graphics().setDepth(4);
    const players = this.mode === "arcade" ? 1 : 2;
    const startIds = [this.picks.p1Id, this.picks.p2Id];
    this.sides = Array.from({ length: players }, (_, i) => {
      const found = roster.findIndex((f) => f.id === startIds[i]);
      const cursor = found >= 0 ? found : Math.min(i, roster.length - 1);
      const tag = label(this, `${i + 1}P`, 0, 0, { size: 16, color: COLORS[i] }).setDepth(6);
      const name = label(this, "", 0, 0, { color: COLORS[i] }).setDepth(6);
      const specials = label(this, "", 0, 0, { size: 16, wrap: 224 }).setDepth(6);
      return { cursor, picked: false, sprite: null, shown: "", name, specials, tag, since: 0 };
    });
    this.sides.forEach((_, i) => this.refresh(i));

    if (problems.length > 0) this.showProblems(problems);
    else label(this, this.mode === "arcade" ? "PUNCH: PICK   KICK: BACK" : "EACH PLAYER: PUNCH TO PICK", 480, 508, { size: 16, align: "center" });
  }

  update(time: number): void {
    const { input, audio } = getServices();
    input.update();
    if (input.anyJustPressed("mute")) audio.toggleMute();

    if (this.roster.length === 0) {
      if (pickPressed(input) || backPressed(input)) this.scene.start("title");
      return;
    }
    if (this.doneAt >= 0) {
      if (time >= this.doneAt) this.scene.start("versus", this.flow());
    } else {
      this.sides.forEach((_, i) => this.handleInput(i, time));
    }
    this.drawCursors(time);
    this.sides.forEach((s) => s.sprite?.show(s.picked ? "win" : "idle", Math.floor(((time - s.since) * 60) / 1000)));
  }

  /** One player's cursor: move, pick, or go back. In arcade mode either side of the keyboard moves player 1. */
  private handleInput(i: number, time: number): void {
    const { input, audio } = getServices();
    const side = this.sides[i]!;
    const player = this.mode === "arcade" ? undefined : i + 1;
    const pressed = (action: string) => (player ? input.justPressed(player, action) : input.anyJustPressed(action));

    if (backPressed(input, player)) {
      if (side.picked) {
        side.picked = false;
        side.since = time;
      } else if (i === 0) {
        this.scene.start("title");
      }
      return;
    }
    if (side.picked) return;

    const dx = (pressed("RIGHT") ? 1 : 0) - (pressed("LEFT") ? 1 : 0);
    const dy = (pressed("DOWN") ? 1 : 0) - (pressed("UP") ? 1 : 0);
    if (dx !== 0 || dy !== 0) {
      side.cursor = this.moveCursor(side.cursor, dx, dy);
      audio.playSfx("menuMove");
      this.sides.forEach((_, n) => this.refresh(n)); // player 2's colors depend on player 1's spot
    }
    if (pickPressed(input, player)) {
      side.picked = true;
      side.since = time;
      audio.playSfx("menuSelect");
      if (this.sides.every((s) => s.picked)) this.doneAt = time + PICKED_MS;
    }
  }

  /** Moves around the grid, wrapping at the edges. */
  private moveCursor(index: number, dx: number, dy: number): number {
    const n = this.roster.length, cols = this.cols, rows = Math.ceil(n / cols);
    const rowLength = (r: number) => Math.min(cols, n - r * cols);
    let row = Math.floor(index / cols), col = index % cols;
    if (dx !== 0) col = (col + dx + rowLength(row)) % rowLength(row);
    if (dy !== 0) {
      row = (row + dy + rows) % rows;
      col = Math.min(col, rowLength(row) - 1);
    }
    return row * cols + col;
  }

  /** The game's next step once everyone has picked. */
  private flow(): FlowState {
    const p1 = this.roster[this.sides[0]!.cursor]!;
    if (this.mode === "versus") return { mode: "versus", p1, p2: this.roster[this.sides[1]!.cursor]!, ladder: [], ladderIndex: 0 };
    return { mode: "arcade", p1, ladder: arcadeLadder(this.roster, p1.id, new Rng(Date.now() >>> 0)), ladderIndex: 0 };
  }

  private drawGrid(): void {
    const { cols, cellSize, positions } = gridLayout(this.roster.length, GRID_WIDTH);
    this.cols = cols;
    this.cellSize = cellSize;
    this.cells = positions.map((p) => ({ x: GRID_LEFT + p.x, y: p.y }));
    const g = this.add.graphics().setDepth(2);
    const inner = cellSize - 8;
    this.roster.forEach((f, i) => {
      const { x, y } = this.cells[i]!;
      const left = Math.round((x - inner / 2) / 2) * 2, top = Math.round((y - inner / 2) / 2) * 2;
      g.fillStyle(0x160c22).fillRect(left - 4, top - 4, inner + 8, inner + 8);
      g.fillStyle(0x5a3f8a).fillRect(left, top, inner, inner / 2);
      g.fillStyle(0x3a2a56).fillRect(left, top + inner / 2, inner, inner / 2);
      // Portraits are drawn at real-pixel size and shown at scale 2.
      const key = renderPortrait(this, f.look, inner / 2);
      this.portraits.push(key);
      this.add.image(left, top, key).setOrigin(0).setScale(2).setDepth(3);
    });
  }

  /** Updates one player's name, specials list and big preview for the fighter under their cursor. */
  private refresh(i: number): void {
    const side = this.sides[i]!;
    const fighter = this.roster[side.cursor]!;
    // Both players on the same fighter: player 2 wears different colors.
    const mirror = i === 1 && this.sides[0]!.cursor === side.cursor;
    const shown = `${fighter.id}${mirror ? ":alt" : ""}`;
    if (shown !== side.shown) {
      side.shown = shown;
      const look = mirror ? alternateColors(fighter.look) : fighter.look;
      const baked = bakeFighter(look, PREVIEW_ANIMS, { fps: settings.animationFps, overrides: getServices().parts.get(fighter.id) });
      const key = `select-${i}-${previewCount++}`;
      if (side.sprite) side.sprite.setBaked(key, baked);
      else side.sprite = new FighterSprite(this, key, baked).setFacing(i === 0 ? 1 : -1).setPosition(PREVIEW_X[i], PREVIEW_FEET);
      side.sprite.image.setDepth(5);
    }

    const big = fighter.name.length <= 7; // a long name gets smaller letters so it fits
    side.name.setText(fighter.name).setFontSize(big ? 32 : 16).setStroke(INK, big ? 8 : 4);
    place(side.name, PREVIEW_X[i], 496, "center");
    // The specials sit under the grid: player 1's on the left half, player 2's on the right.
    const specials = fighter.specials.map((s) => s.name).join("\n") || "NO SPECIALS YET";
    side.specials.setText(`SPECIALS:\n${specials}`).setColor(COLORS[i]);
    place(side.specials, i === 0 ? GRID_LEFT + 8 : GRID_LEFT + GRID_WIDTH / 2 + 8, this.gridBottom() + 24, "left");
  }

  private gridBottom(): number {
    return Math.max(...this.cells.map((c) => c.y)) + this.cellSize / 2;
  }

  /** Flashing frames around each player's fighter (solid once picked), with a 1P / 2P tag. */
  private drawCursors(time: number): void {
    const g = this.cursorGfx.clear();
    const half = this.cellSize / 2;
    this.sides.forEach((side, i) => {
      const { x, y } = this.cells[side.cursor]!;
      // The two cursors flash in turn, so both show when they share a fighter.
      const visible = side.picked || flashOn(time) === (i === 0);
      const inset = i === 0 ? 0 : 6;
      const left = Math.round((x - half) / 2) * 2 + inset, top = Math.round((y - half) / 2) * 2 + inset;
      side.tag.setVisible(visible);
      if (!visible) return;
      g.lineStyle(6, CURSOR_COLORS[i]).strokeRect(left, top, this.cellSize - inset * 2, this.cellSize - inset * 2);
      place(side.tag, i === 0 ? left : left + this.cellSize - inset * 2, top - 20, i === 0 ? "left" : "right");
    });
  }

  private showNoFighters(): void {
    label(
      this,
      "NO FIGHTERS YET!\nMAKE ONE WITH /add-fighter\nIN CLAUDE CODE, OR COPY\nsrc/characters/colin.ts\nTO A NEW FILE (LIKE mom.ts)\nAND CHANGE IT.\nPRESS A BUTTON TO GO BACK",
      480, 80, { align: "center" },
    );
  }

  /** A friendly box listing character files that couldn't be used. */
  private showProblems(problems: string[]): void {
    // A long web address can't wrap, so show just its file name.
    const shown = problems.slice(0, 2).map((p) => p.replace(/https?:\/\/\S+/g, (url) => url.split("/").pop()!.replace(/\?.*$/, "")));
    if (problems.length > shown.length) shown.push(`...and ${problems.length - shown.length} more.`);
    const lines = ["UH OH! A FIGHTER FILE NEEDS FIXING:", ...shown, "Fix it and save, or press F12 for details."];
    const text = label(this, lines.join("\n"), 0, 0, { size: 16, wrap: 880, color: "#160c22" });
    text.setStroke("#160c22", 0).setDepth(21);
    const h = Math.round((text.height + 24) / 2) * 2;
    const top = 540 - h - 8;
    this.add.rectangle(480, top + h / 2, 928, h, 0xfff6c8).setStrokeStyle(4, 0x160c22).setDepth(20);
    place(text, 32, top + 12, "left");
  }

  private cleanUp(): void {
    this.sides.forEach((s) => s.sprite?.destroy());
    this.sides = [];
    this.portraits.forEach((key) => this.textures.remove(key));
    this.portraits = [];
  }
}
