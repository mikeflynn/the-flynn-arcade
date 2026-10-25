import type Phaser from "phaser";
import type { Look, ShapeName } from "@web-games/rig";
import { bakeFighter } from "@web-games/rig/canvas";
import { FighterSprite } from "@web-games/rig/phaser";
import { ANIMS, animFor } from "../animations";
import type { FighterState, MatchState } from "../engine/types";
import { settings } from "../settings";

/** Pictures that replace parts of a fighter (public/assets/fighters/<id>/<part>.png). */
export type PartPictures = Partial<Record<ShapeName, CanvasImageSource>>;

/** How far (world units) a fighter jumps left and right while shaking from a hit. */
const SHAKE = 4;
/** States where a fighter in hit pause shakes (they just got hit, not hit something). */
const SHAKY: readonly FighterState["state"][] = ["hitstun", "knockdown", "dizzy", "ko", "thrown"];

let textureCounter = 0;

/**
 * One fighter on screen. It bakes the fighter's sprite pages once, then each
 * frame shows the animation frame the engine's state asks for. Frames snap
 * from one picture to the next, like SF2: there is no blending between animations.
 */
export class FighterView {
  readonly sprite: FighterSprite;

  constructor(scene: Phaser.Scene, id: string, look: Look, parts: PartPictures = {}) {
    const baked = bakeFighter(look, ANIMS, { fps: settings.animationFps, overrides: parts });
    // Every sprite needs its own texture name: two fighters sharing one would erase each other's pictures.
    this.sprite = new FighterSprite(scene, `fight-${id}-${textureCounter++}`, baked);
    this.sprite.image.setDepth(5);
  }

  /** Puts the fighter where the engine says, showing the right picture. */
  update(f: FighterState, s: MatchState, index: 0 | 1): void {
    const { name, frame } = animation(f, s, index);
    const jitter = f.hitstop > 0 && SHAKY.includes(f.state) ? (s.frame % 4 < 2 ? -SHAKE : SHAKE) : 0;
    this.sprite.show(name, frame).setFacing(f.facing).setPosition(f.x + jitter, s.stage.ground + f.y);
  }

  /** Frees the fighter's textures. */
  destroy(): void {
    this.sprite.destroy();
  }
}

/** Like animFor, plus the poses between rounds: a bow during the intro and a slump for losing on time. */
function animation(f: FighterState, s: MatchState, index: 0 | 1): { name: string; frame: number } {
  if (s.phase === "intro") return { name: "intro", frame: s.phaseFrame };
  const other = s.fighters[1 - index]!;
  const lostStanding = s.phase !== "fight" && s.roundWinner === 1 - index && other.state === "win";
  if (lostStanding && f.state === "idle" && !f.airborne) return { name: "lose", frame: other.stateFrame };
  return animFor(f);
}
