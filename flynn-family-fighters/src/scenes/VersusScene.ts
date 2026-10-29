import Phaser from "phaser";
import { alternateColors } from "@web-games/rig";
import { bakeFighter } from "@web-games/rig/canvas";
import { FighterSprite } from "@web-games/rig/phaser";
import { ANIMS } from "../animations";
import { ladderDifficulty } from "../engine/ladder";
import { afterMatch, opponent, type FlowState } from "../flow";
import { addLogo, ICE_BANDS, makeLogo } from "../render/logo";
import { label, place } from "../render/menu";
import { settings } from "../settings";
import { stageById } from "../stages";
import { getServices } from "./BootScene";
import type { FightData } from "./FightScene";

/** How long the versus screen shows before the fight (ms). */
const VERSUS_MS = 2500;
const FEET_Y = 470;
const FIGHTER_X = [240, 720] as const;
/** Flat bands: player 1's side is blue, player 2's side is red. */
const SIDE_BANDS = [
  [0x1b2a8a, 0x2440b0, 0x2f56d0, 0x2440b0, 0x1b2a8a],
  [0x8a1b2a, 0xb02434, 0xd0303f, 0xb02434, 0x8a1b2a],
] as const;

let versusCount = 0;

/** Both fighters in their win pose, their names and a big "VS", then the fight. */
export class VersusScene extends Phaser.Scene {
  private flow!: FlowState;
  private sprites: FighterSprite[] = [];
  private logoKey = "";
  private shownAt = 0;
  private startAt = 0;

  constructor() {
    super("versus");
  }

  init(data: FlowState): void {
    this.flow = data;
  }

  create(): void {
    this.cameras.main.setZoom(0.5).centerOn(480, 270);
    const { parts } = getServices();
    const fighters = [this.flow.p1, opponent(this.flow)] as const;

    const g = this.add.graphics();
    SIDE_BANDS.forEach((colors, side) => colors.forEach((c, i) => g.fillStyle(c).fillRect(side * 480, i * 108, 480, 108)));
    g.fillStyle(0x160c22).fillRect(476, 0, 8, 540);

    fighters.forEach((f, i) => {
      // A mirror match: player 2 wears different colors.
      const look = i === 1 && f.id === fighters[0].id ? alternateColors(f.look) : f.look;
      const baked = bakeFighter(look, { win: ANIMS.win! }, { fps: settings.animationFps, overrides: parts.get(f.id) });
      const sprite = new FighterSprite(this, `versus-${i}-${versusCount++}`, baked).setFacing(i === 0 ? 1 : -1).setPosition(FIGHTER_X[i], FEET_Y);
      this.sprites.push(sprite);
      place(label(this, f.name, 0, 0, { size: f.name.length <= 7 ? 48 : 32, color: i === 0 ? "#bcd6ff" : "#ffc4c4" }), FIGHTER_X[i], FEET_Y + 12, "center");
    });

    this.logoKey = makeLogo(this, [{ text: "VS", size: 64 }], ICE_BANDS);
    addLogo(this, this.logoKey, 480, 160);
    if (this.flow.mode === "arcade") {
      label(this, `FIGHT ${this.flow.ladderIndex + 1} OF ${this.flow.ladder.length}`, 480, 24, { align: "center", color: "#ffd23b" });
    }

    this.shownAt = this.game.loop.time; // the same clock update() is given
    this.startAt = this.shownAt + VERSUS_MS;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sprites.forEach((s) => s.destroy());
      this.sprites = [];
      this.textures.remove(this.logoKey);
    });
  }

  update(time: number): void {
    const { input, audio } = getServices();
    input.update();
    if (input.anyJustPressed("mute")) audio.toggleMute();
    this.sprites.forEach((s) => s.show("win", Math.floor(((time - this.shownAt) * 60) / 1000)));
    if (time >= this.startAt) {
      this.startAt = Infinity; // start it only once
      this.startFight();
    }
  }

  /**
   * Starts the fight. Arcade fights are on the opponent's home stage and the
   * computer gets tougher up the ladder; versus fights are on player 1's stage.
   */
  private startFight(): void {
    const flow = this.flow;
    const rival = opponent(flow);
    const arcade = flow.mode === "arcade";
    const game = this.game;
    const data: FightData = {
      p1: flow.p1,
      p2: rival,
      cpu: [false, arcade],
      stage: stageById((arcade ? rival : flow.p1).stage),
      ...(arcade && { cpuLevel: ladderDifficulty(settings.cpuDifficulty, flow.ladderIndex) }),
      onDone: (winner) => {
        const { next, flow: nextFlow } = afterMatch(flow, winner);
        if (next === "menu") {
          // The menu opens on top of the finished fight.
          game.scene.pause("fight");
          game.scene.run("aftermatch", nextFlow);
        } else {
          game.scene.stop("fight");
          game.scene.start(next, nextFlow);
        }
      },
    };
    this.scene.start("fight", data);
  }
}
