import { packCells } from "../bake/pack";
import { planFrames, STANCE, type DrawStep, type FrameIndex, type FrameJob } from "../bake/plan";
import { snapToPalette } from "../bake/quantize";
import { bodyDims } from "../body";
import { backTint } from "../color";
import type { Look } from "../look";
import { OUTLINE_WIDTH, paintCommands, type DrawCmd, type PartShape } from "../paint";
import { buildParts, type ShapeName } from "../parts/index";
import type { Animation, Pose } from "../pose";
import { drawContain, imageSize } from "./images";

/** Where one baked sprite sits on its page. `footX/footY` is the feet point inside the cell (pixels); joints are art units from the feet. */
export interface BakedFrame {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  footX: number;
  footY: number;
  joints: Record<"head" | "fH" | "bH", { x: number; y: number }>;
}

/**
 * A fighter's palette-locked sprite sheets. `frames[i]` is job `i` of `index`.
 * `anims` are the animations it was baked from: `FighterSprite.show` needs each one's
 * loop flag and length to pick the held frame (see `shownFrame`).
 */
export interface BakedFighter {
  pages: HTMLCanvasElement[];
  frames: BakedFrame[];
  index: FrameIndex;
  anims: Record<string, Animation>;
  /** Real pixels per art unit. */
  scale: number;
  colors: number;
  ms: number;
}

export interface BakeOptions {
  fps?: 15 | 20 | 30;
  /** Real pixels per art unit (default 0.4). */
  scale?: number;
  /** Pictures that replace a part, fitted inside that part's box. */
  overrides?: Partial<Record<ShapeName, CanvasImageSource>>;
  /** The standing pose airborne frames hang from (default: the spike's stance). */
  stance?: Pose;
}

const css = (c: number) => "#" + c.toString(16).padStart(6, "0");

/** Draw every animation frame of a fighter into packed, palette-locked sprite pages. */
export function bakeFighter(look: Look, anims: Record<string, Animation>, opts: BakeOptions = {}): BakedFighter {
  const t0 = performance.now();
  const scale = opts.scale ?? 0.4;
  const parts = buildParts(look, bodyDims(look));
  const { jobs, index } = planFrames(look, anims, opts.fps ?? 20, opts.stance ?? STANCE);

  // An override only counts if it has a size (a picture that failed to load draws the normal part).
  const overrides = new Map<ShapeName, CanvasImageSource>();
  for (const [shape, img] of Object.entries(opts.overrides ?? {}) as [ShapeName, CanvasImageSource | undefined][]) {
    const size = img && imageSize(img);
    if (img && size && size.w > 0 && size.h > 0) overrides.set(shape, img);
  }

  const cmdCache = new Map<string, DrawCmd[]>();
  const commands = (s: DrawStep) => {
    const key = s.shape + "|" + s.mode;
    let cmds = cmdCache.get(key);
    if (!cmds) cmdCache.set(key, (cmds = paintCommands(parts[s.shape], s.mode)));
    return cmds;
  };

  // The palette is every color the parts use (far limbs a step darker); pictures snap to it too.
  const palette = new Set<number>();
  for (const job of jobs) {
    for (const s of job.steps) {
      if (overrides.has(s.shape)) continue;
      for (const c of commands(s)) palette.add(s.back ? backTint(c.color) : c.color);
    }
  }
  const pal = [...palette];

  const boxes = jobs.map((job) => jobBox(job, parts, scale));
  const scratch = document.createElement("canvas");
  scratch.width = Math.max(1, ...boxes.map((b) => b.w));
  scratch.height = Math.max(1, ...boxes.map((b) => b.h));
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const lineScale = 0.5 / scale; // outlines stay about 2.5 px at any scale

  const cells = jobs.map((job, i) => {
    const box = boxes[i]!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);
    for (const s of job.steps) {
      ctx.setTransform(scale, 0, 0, scale, box.footX, box.footY);
      ctx.translate(s.x, s.y);
      ctx.rotate(s.r);
      const img = overrides.get(s.shape);
      if (img) {
        if (s.mode !== "outline") drawContain(ctx, img, parts[s.shape].bbox);
        continue;
      }
      for (const c of commands(s)) {
        const color = css(s.back ? backTint(c.color) : c.color);
        ctx.beginPath();
        c.pts.forEach((q, n) => (n ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        if (c.kind === "fill") {
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        } else {
          if (c.closed) ctx.closePath();
          ctx.lineWidth = c.width * lineScale;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      }
    }
    const img = ctx.getImageData(0, 0, box.w, box.h);
    snapToPalette(img.data, pal);
    return trim(img, box.footX, box.footY);
  });

  const spots = packCells(cells.map((c) => ({ w: c.img.width, h: c.img.height })));
  const pageCount = Math.max(0, ...spots.map((s) => s.page + 1));
  const pages = Array.from({ length: pageCount }, (_, p) => {
    const page = document.createElement("canvas");
    // Each page is only as big as what's on it.
    page.width = Math.max(1, ...cells.map((c, i) => (spots[i]!.page === p ? spots[i]!.x + c.img.width : 0)));
    page.height = Math.max(1, ...cells.map((c, i) => (spots[i]!.page === p ? spots[i]!.y + c.img.height : 0)));
    return page;
  });
  const frames: BakedFrame[] = cells.map((c, i) => {
    const spot = spots[i]!, w = jobs[i]!.world, ground = jobs[i]!.ground;
    pages[spot.page]!.getContext("2d")!.putImageData(c.img, spot.x, spot.y);
    const joint = (n: string) => ({ x: w[n]!.x, y: w[n]!.y - ground });
    return {
      page: spot.page, x: spot.x, y: spot.y, w: c.img.width, h: c.img.height, footX: c.footX, footY: c.footY,
      joints: { head: joint("head"), fH: joint("fH"), bH: joint("bH") },
    };
  });

  return { pages, frames, index, anims, scale, colors: pal.length, ms: Math.round(performance.now() - t0) };
}

/** The pixel box a job needs (every part's box turned to its angle, plus room for outlines), with the feet point on a whole pixel. */
function jobBox(job: FrameJob, parts: Record<ShapeName, PartShape>, scale: number) {
  const pad = OUTLINE_WIDTH * (0.5 / scale) + 2 / scale;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of job.steps) {
    const b = parts[s.shape].bbox, c = Math.cos(s.r), n = Math.sin(s.r);
    for (const [px, py] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]] as const) {
      const x = s.x + px * c - py * n, y = s.y + px * n + py * c;
      x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad);
      y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad);
    }
  }
  if (!Number.isFinite(x0)) return { footX: 0, footY: 0, w: 1, h: 1 };
  const footX = Math.max(0, Math.ceil(-x0 * scale)), footY = Math.max(0, Math.ceil(-y0 * scale));
  return { footX, footY, w: footX + Math.max(1, Math.ceil(x1 * scale)), h: footY + Math.max(1, Math.ceil(y1 * scale)) };
}

/** Cut a frame down to its opaque pixels, keeping track of where the feet point went. */
function trim(img: ImageData, footX: number, footY: number): { img: ImageData; footX: number; footY: number } {
  const { width: W, height: H, data } = img;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { img: new ImageData(1, 1), footX: 0, footY: 0 }; // nothing drawn
  const w = x1 - x0 + 1, h = y1 - y0 + 1, out = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * W + x0) * 4;
    out.data.set(data.subarray(from, from + w * 4), y * w * 4);
  }
  return { img: out, footX: footX - x0, footY: footY - y0 };
}
