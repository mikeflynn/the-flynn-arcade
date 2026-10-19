import type Phaser from "phaser";
import type { InputManager } from "@web-games/input";

export function textStyle(size = 8, color = "#ffffff"): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: `${size}px`,
    color,
    stroke: "#1a1c2c",
    strokeThickness: size >= 16 ? 4 : 2,
  };
}

/** Centered text that stays put when the camera scrolls. */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 8,
  color = "#ffffff",
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, textStyle(size, color)).setOrigin(0.5).setScrollFactor(0);
}

/** 83000 → "1:23" */
export function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function blink(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject): void {
  scene.tweens.add({ targets: target, alpha: 0, duration: 500, yoyo: true, repeat: -1 });
}

/** An up/down menu with a cursor. Up/down moves, confirm picks. */
export class Menu {
  private index = 0;
  private readonly texts: Phaser.GameObjects.Text[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly labels: () => string[],
    private readonly onPick: (index: number) => void,
    private readonly sfx: (key: "menuMove" | "menuSelect") => void,
    private readonly spacing = 12,
  ) {
    this.render();
  }

  update(input: InputManager): void {
    const count = this.labels().length;
    if (input.anyJustPressed("up")) {
      this.index = (this.index + count - 1) % count;
      this.sfx("menuMove");
    } else if (input.anyJustPressed("down")) {
      this.index = (this.index + 1) % count;
      this.sfx("menuMove");
    } else if (input.anyJustPressed("confirm")) {
      this.sfx("menuSelect");
      this.onPick(this.index);
      return;
    }
    this.render();
  }

  destroy(): void {
    this.texts.forEach((text) => text.destroy());
    this.texts.length = 0;
  }

  private render(): void {
    const labels = this.labels();
    while (this.texts.length < labels.length) {
      this.texts.push(addText(this.scene, this.x, this.y + this.texts.length * this.spacing, ""));
    }
    labels.forEach((label, i) => {
      const selected = i === this.index;
      this.texts[i].setText(selected ? `> ${label} <` : label).setColor(selected ? "#f6d860" : "#ffffff");
    });
  }
}
