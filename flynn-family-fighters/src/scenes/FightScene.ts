import Phaser from "phaser";
import { mergeBindings } from "@web-games/input";
import { alternateColors } from "@web-games/rig";
import { inputFrameFrom, player1Controls, player2Controls } from "../controls";
import { CpuBrain } from "../engine/cpu";
import { createMatch, matchWinner, stepMatch } from "../engine/match";
import { Rng } from "../engine/rng";
import type { MatchEvent, MatchState } from "../engine/types";
import type { Fighter } from "../fighter";
import { NORMALS } from "../moves";
import { Effects } from "../render/effects";
import { FighterView } from "../render/FighterView";
import { Hud } from "../render/hud";
import { stepsToRun } from "../render/loop";
import { label, Menu } from "../render/menu";
import { drawStage, type StageView } from "../render/stageView";
import { settings } from "../settings";
import type { StageDef } from "../stages";
import { getServices } from "./BootScene";

export interface FightData {
  p1: Fighter;
  p2: Fighter;
  /** Which side the computer plays: [false, true] = you vs the CPU. */
  cpu: [boolean, boolean];
  stage: StageDef;
  /** How hard the computer fights, 1 to 8 (default: cpuDifficulty in settings.ts). */
  cpuLevel?: number;
  /** Called once, a few seconds after the match is won. */
  onDone: (winner: 0 | 1 | "draw") => void;
}

/** After the match is decided, wait this many steps before moving on. */
const MATCH_END_STEPS = 180;
const PLAYERS = [0, 1] as const;
const PAUSE_OPTIONS = ["RESUME", "QUIT TO TITLE"] as const;

/** A heavy normal (HP or HK), a special or a throw: these shake the screen. */
const isHeavy = (name = "") => !(name in NORMALS) || /H[PK]$/.test(name);

/**
 * The fight: runs the engine in fixed steps and draws what it says. The
 * engine decides everything; this scene only reads inputs, plays sounds and
 * shows the results.
 */
export class FightScene extends Phaser.Scene {
  private fight!: FightData;
  private match!: MatchState;
  private brains: (CpuBrain | null)[] = [];
  private views: FighterView[] = [];
  private stageView!: StageView;
  private effects!: Effects;
  private hud!: Hud;
  private accMs = 0;
  private endSteps = -1;
  /** The pause menu, while the game is paused (Start pauses). */
  private pause: { box: Phaser.GameObjects.Rectangle; title: Phaser.GameObjects.Text; menu: Menu } | null = null;

  constructor() {
    super("fight");
  }

  init(data: FightData): void {
    this.fight = data;
    this.accMs = 0;
    this.endSteps = -1;
    this.pause = null;
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    const { p1, p2, cpu, stage } = this.fight;
    const { input, audio, parts } = getServices();

    this.stageView = drawStage(this, stage);
    this.effects = new Effects(this, this.stageView.shadowColor);
    // A mirror match: player 2 wears different colors so you can tell them apart.
    const look2 = p1.id === p2.id ? alternateColors(p2.look) : p2.look;
    this.views = [new FighterView(this, p1.id, p1.look, parts.get(p1.id)), new FighterView(this, p2.id, look2, parts.get(p2.id))];
    this.hud = new Hud(this, [p1.name, p2.name]);

    const seed = Date.now() >>> 0;
    this.match = createMatch({ p1, p2, settings, seed });
    this.brains = PLAYERS.map((i) => (cpu[i] ? new CpuBrain(i, this.fight.cpuLevel ?? settings.cpuDifficulty, new Rng(seed + i + 1)) : null));

    // Against the computer, one player can use either side of the keyboard.
    input.clearBindings(1);
    input.clearBindings(2);
    if (!cpu[0] && !cpu[1]) {
      input.setBindings(1, player1Controls);
      input.setBindings(2, player2Controls);
    } else if (!cpu[0]) {
      input.setBindings(1, mergeBindings(player1Controls, player2Controls));
    } else if (!cpu[1]) {
      input.setBindings(2, mergeBindings(player2Controls, player1Controls));
    } else {
      input.setBindings(1, player1Controls); // nobody fights, but M still mutes
    }

    audio.playMusic("fight");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
  }

  update(time: number, deltaMs: number): void {
    if (this.pause) {
      this.updatePaused(time);
      return;
    }
    const { steps, accMs } = stepsToRun(this.accMs, deltaMs, settings.gameSpeed);
    this.accMs = accMs;
    if (steps > 0) {
      // Read the controls only when the game steps, so a quick tap is never lost between steps.
      const { input, audio } = getServices();
      input.update();
      if (input.anyJustPressed("mute")) audio.toggleMute();
      // Start pauses, until the match is over (then the after-match menu takes over).
      if (input.anyJustPressed("start") && this.endSteps < 0) {
        this.openPause();
        return;
      }
      for (let n = 0; n < steps; n++) this.tick();
    }
    this.draw(time);
  }

  /** Freezes the fight and shows the pause menu on top. */
  private openPause(): void {
    const { audio } = getServices();
    audio.playSfx("menuSelect");
    const h = 112 + PAUSE_OPTIONS.length * 56;
    const top = Math.round((540 - h) / 4) * 2;
    const box = this.add.rectangle(480, top + h / 2, 600, h, 0x160c22).setStrokeStyle(8, 0xffd23b).setDepth(20);
    const title = label(this, "PAUSED", 480, top + 32, { align: "center", color: "#ffd23b" }).setDepth(21);
    this.pause = { box, title, menu: new Menu(this, PAUSE_OPTIONS, 480, top + 96, 56, 21) };
  }

  /** While paused the fight stands still; only the pause menu moves. */
  private updatePaused(time: number): void {
    const { input, audio } = getServices();
    input.update();
    if (input.anyJustPressed("mute")) audio.toggleMute();
    const picked = this.pause!.menu.update(input, audio, time);
    if (picked === null) return;
    if (PAUSE_OPTIONS[picked] === "QUIT TO TITLE") {
      this.scene.start("title");
      return;
    }
    this.closePause();
  }

  private closePause(): void {
    if (!this.pause) return;
    this.pause.box.destroy();
    this.pause.title.destroy();
    this.pause.menu.destroy();
    this.pause = null;
  }

  /** One game step: inputs in, events out. */
  private tick(): void {
    const { input } = getServices();
    const s = this.match;
    const inputs = PLAYERS.map((i) => this.brains[i]?.next(s) ?? inputFrameFrom(input, i + 1)) as [number, number];
    for (const e of stepMatch(s, inputs)) this.handle(e);
    this.effects.step();
    this.hud.step();
    if (this.endSteps >= 0 && ++this.endSteps === MATCH_END_STEPS) this.fight.onDone(matchWinner(s) ?? "draw");
  }

  /** Sounds, sparks and banners for the things that happened this step. */
  private handle(e: MatchEvent): void {
    const { audio } = getServices();
    const s = this.match;
    const ground = s.stage.ground;
    const name = (i: 0 | 1) => s.fighters[i].fighter.name;
    switch (e.type) {
      case "hit": {
        const heavy = isHeavy(e.name);
        this.effects.spark(e.x ?? 480, ground + (e.y ?? -120), false);
        audio.playSfx(heavy ? "heavyHit" : "hit");
        if (heavy) this.cameras.main.shake(110, 0.008);
        const attacker = e.player ?? 0;
        const hits = s.fighters[1 - attacker]!.comboHits;
        if (hits >= 2) this.hud.showCombo(attacker, hits);
        break;
      }
      case "block":
      case "throwTech":
        this.effects.spark(e.x ?? 480, ground + (e.y ?? -120), true);
        audio.playSfx("block");
        break;
      case "throw":
        audio.playSfx("heavyHit");
        this.cameras.main.shake(110, 0.008);
        break;
      case "whiff":
        audio.playSfx("whoosh");
        break;
      case "special":
        this.hud.showCallout(`${e.name ?? "SPECIAL"}!`);
        audio.playSfx("special");
        break;
      case "round":
        this.hud.showBanner(`ROUND ${s.round}`, 60);
        audio.playSfx("round");
        break;
      case "fight":
        this.hud.showBanner("FIGHT!", 40);
        audio.playSfx("fight");
        break;
      case "ko":
        this.hud.showBanner("K.O.!", 100);
        audio.playSfx("ko");
        break;
      case "timeOver":
        this.hud.showBanner("TIME!", 100);
        break;
      case "roundOver":
        if (e.player === undefined) {
          this.hud.showBanner("DRAW", 60);
        } else {
          this.hud.showBanner(`${name(e.player)} WINS`, 60);
          const w = s.fighters[e.player];
          if (w.health >= w.maxHealth) this.hud.showCallout("PERFECT!", 60);
        }
        break;
      case "matchOver":
        this.endSteps = 0;
        this.hud.showBanner(this.matchMessage(e.player), MATCH_END_STEPS);
        // The cheer is for a human winning: not for a draw, and not when the computer beat you.
        if (e.player !== undefined && !this.fight.cpu[e.player]) audio.playSfx("youWin");
        break;
    }
  }

  /** "YOU WIN!" when one human beat the computer, otherwise the winner's name. */
  private matchMessage(winner: 0 | 1 | undefined): string {
    if (winner === undefined) return "DRAW GAME";
    const humans = PLAYERS.filter((i) => !this.fight.cpu[i]);
    if (humans.length === 1) return humans[0] === winner ? "YOU WIN!" : "YOU LOSE";
    return `${this.match.fighters[winner].fighter.name} WINS!`;
  }

  private draw(timeMs: number): void {
    const s = this.match;
    PLAYERS.forEach((i) => this.views[i]!.update(s.fighters[i], s, i));
    this.stageView.update(timeMs);
    this.effects.draw(s, this.views, settings.showHitboxes);
    this.hud.draw(s);
  }

  /** Frees this match's fighter textures so the next match starts clean. */
  private cleanUp(): void {
    this.closePause();
    this.views.forEach((v) => v.destroy());
    this.views = [];
    this.effects.destroy();
    this.hud.destroy();
    this.stageView.destroy();
  }
}
