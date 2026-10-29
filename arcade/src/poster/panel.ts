import { playerLabel } from "../badges";
import { pictureFor, type GameMedia } from "../media";
import { drawScreenArt } from "../screenArt";
import type { Slot } from "../selection";

/** "GAME 01", "GAME 02", ... */
const gameNumber = (n: number) => `GAME ${String(n).padStart(2, "0")}`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * One game on the poster: a header line, a big picture and the title.
 * The picture is the game's screenshot (or its little text picture), and the
 * selected game plays its clip on top.
 */
export class Panel {
  readonly el: HTMLElement;
  private readonly pic: HTMLElement;
  private video: HTMLVideoElement | null = null;
  private clipFailed = false;
  private selected = false;

  constructor(
    private readonly slot: Slot,
    number: number,
    private readonly media: GameMedia | undefined,
    private readonly reducedMotion: boolean,
  ) {
    const game = slot.kind === "game" ? slot.game : null;
    this.el = el("article", game ? "panel" : "panel soon");
    const hd = el("div", "hd");
    hd.append(el("span", "", gameNumber(number)), el("span", "", game ? playerLabel(game.players) : "??"));
    this.pic = el("div", "pic");
    const ft = el("div", "ft");
    const title = el("h2", "", game ? game.title : "???");
    title.append(el("span", "arrow", " ▶"));
    ft.append(title);
    const tagline = game ? game.tagline : "Your game here";
    if (tagline) ft.append(el("p", "", tagline));
    this.el.append(hd, this.pic, ft);
    this.showStill();
  }

  setSelected(on: boolean): void {
    this.selected = on;
    this.el.classList.toggle("sel", on);
    this.updateClip();
  }

  /** The clip wouldn't load or play: show the still picture from now on. */
  onClipFailed(): void {
    this.clipFailed = true;
    this.updateClip();
  }

  private showStill(): void {
    if (this.slot.kind === "soon") {
      this.pic.append(el("div", "soon-label", "COMING SOON"));
      return;
    }
    const kind = pictureFor(this.media, { selected: false, reducedMotion: this.reducedMotion, clipFailed: true });
    if (kind === "screenshot") {
      const img = el("img", "still");
      img.alt = "";
      img.src = this.media!.screenshot!;
      // A screenshot that's missing or broken falls back to the little picture.
      img.addEventListener("error", () => {
        img.remove();
        this.showArt();
      });
      this.pic.append(img);
    } else {
      this.showArt();
    }
  }

  private showArt(): void {
    if (this.slot.kind !== "game") return;
    const canvas = el("canvas", "still art");
    canvas.width = 32;
    canvas.height = 24;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const { width, height } = drawScreenArt(ctx, this.slot.game.screenArt);
      if (width > 0 && height > 0) {
        // Crop the canvas to the picture so it fills the panel.
        const image = ctx.getImageData(0, 0, width, height);
        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(image, 0, 0);
      }
    }
    this.pic.prepend(canvas);
  }

  private updateClip(): void {
    const wanted = pictureFor(this.media, { selected: this.selected, reducedMotion: this.reducedMotion, clipFailed: this.clipFailed }) === "clip";
    if (!wanted) {
      if (this.video) {
        this.video.pause();
        this.video.classList.remove("playing");
        if (this.clipFailed) {
          this.video.remove();
          this.video = null;
        }
      }
      return;
    }
    if (!this.video) {
      const v = el("video", "clip");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "none";
      v.setAttribute("aria-hidden", "true");
      // The clip only shows once it's really playing, so there's never a black box.
      v.addEventListener("playing", () => v.classList.add("playing"));
      v.addEventListener("error", () => this.onClipFailed());
      v.src = this.media!.clip!;
      this.pic.append(v);
      this.video = v;
    }
    const video = this.video;
    video.currentTime = 0;
    video.play().catch((error: unknown) => {
      // Pausing on purpose (the player moved on) isn't a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      this.onClipFailed();
    });
  }
}
