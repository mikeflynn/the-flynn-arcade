import type { GameInfo } from "@web-games/arcade";

/** The bit of a canvas drawing context this needs (tests pass a fake). */
export interface PixelTarget {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/** Draws a game's little text picture, one square per letter. Unknown letters stay see-through. */
export function drawScreenArt(ctx: PixelTarget, art: GameInfo["screenArt"]): { width: number; height: number } {
  art.art.forEach((row, y) =>
    [...row].forEach((letter, x) => {
      const color = art.colors[letter];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return { width: Math.max(0, ...art.art.map((r) => r.length)), height: art.art.length };
}
