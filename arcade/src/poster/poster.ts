import { playerLabel } from "../badges";
import { safeColor, textList } from "../colors";
import type { GameMedia } from "../media";
import { mouseMoved, type Slot } from "../selection";
import { colors, logoLines, settings, tickerBottom, tickerTop } from "../settings";
import { tickerLine } from "../ticker";
import { Panel } from "./panel";
import "./poster.css";

export interface PosterData {
  slots: Slot[];
  media: Map<string, GameMedia>;
  gameCount: number;
  reducedMotion: boolean;
}

/** Everything the controller can ask the poster to do. */
export interface PosterView {
  /** Light up a panel, show its info, and play its clip. */
  select(index: number): void;
  /** How many panels fit side by side right now (changes when the window does). */
  columns(): number;
  onHover(fn: (index: number) => void): void;
  onClick(fn: (index: number) => void): void;
  /** The last line of the stamp box: "CREDITS ∞", then "CREDIT 1". */
  setCredit(text: string): void;
  /** A little shake: that game isn't here yet. */
  notYet(index: number): void;
  /** The big "GAME START!" moment. */
  showGameStart(): void;
  /** Fade to black (resolves when it's dark). */
  fadeOut(ms: number): Promise<void>;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** A strip that scrolls forever: the words, repeated so it never runs out. */
function ticker(className: string, messages: readonly string[], gameCount: number): HTMLElement {
  const strip = el("div", `ticker ${className}`);
  const line = tickerLine(messages, gameCount);
  const track = el("div", "track");
  // Two identical halves: sliding by exactly one half loops without a jump.
  for (let half = 0; half < 2; half++) track.append(el("span", "", line.repeat(6)));
  strip.append(track);
  strip.setAttribute("aria-hidden", "true");
  return strip;
}

const twoDigits = (n: number) => String(n).padStart(2, "0");
const clockText = (d: Date) => `${twoDigits(d.getHours())}:${twoDigits(d.getMinutes())}:${twoDigits(d.getSeconds())}`;

/**
 * Sizes the logo to fill its box as big as it can: all on one line, or one
 * word per line, whichever comes out bigger. On a phone it just fills the width.
 */
function fitLogo(logo: HTMLElement): void {
  const lines = [...logo.children].map((s) => s.textContent ?? "");
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx || lines.length === 0) return;
  ctx.font = `100px ${getComputedStyle(logo).fontFamily}`;
  // How wide each line is at 100px (letters sit a little closer, like the CSS says).
  const width = (text: string) => ctx.measureText(text).width * 0.98;
  const box = logo.getBoundingClientRect();
  const tall = window.matchMedia("(max-width: 720px), (max-aspect-ratio: 4/5)").matches;
  const room = (w: number) => (box.width * 0.98 * 100) / Math.max(1, w);
  const stacked = Math.min(room(Math.max(...lines.map(width))), tall ? Infinity : box.height / (lines.length * 0.82));
  const single = Math.min(room(width(lines.join(" ")) + 25 * (lines.length - 1)), tall ? Infinity : box.height / 0.82);
  const oneLine = single > stacked;
  logo.classList.toggle("one-line", oneLine);
  logo.style.fontSize = `${Math.max(12, Math.floor(oneLine ? single : stacked))}px`;
}

function fitLogoWhenReady(logo: HTMLElement): void {
  const fit = () => fitLogo(logo);
  new ResizeObserver(fit).observe(logo.parentElement ?? logo);
  void document.fonts?.ready.then(fit);
}

/** Builds the whole poster inside `root` and returns the handle the controller uses. */
export function buildPoster(root: HTMLElement, data: PosterData): PosterView {
  const style = document.documentElement.style;
  style.setProperty("--bg", safeColor(colors.background, "#18171b"));
  style.setProperty("--ink", safeColor(colors.ink, "#efe6cf"));
  style.setProperty("--hi", safeColor(colors.highlight, "#ffd23b"));
  style.setProperty("--ticker-s", `${settings.tickerSecondsPerLoop}s`);
  document.body.classList.toggle("scanlines", settings.showScanlines !== false);

  root.replaceChildren();
  root.classList.add("poster");

  // The logo row: giant words plus the little stamp box.
  const logoRow = el("header", "logo-row");
  const logo = el("h1", "logo");
  textList(logoLines, ["FLYNN", "ARCADE"]).forEach((line) => logo.append(el("span", "", line)));
  const stamp = el("div", "stamp");
  const credit = el("span", "credit", "CREDITS ∞");
  const stampName = el("strong", "");
  ["THE", "FLYNN", "ARCADE"].forEach((w) => stampName.append(el("span", "", w)));
  stamp.append(el("span", "", "EST. 2026"), stampName, credit);
  logoRow.append(logo, stamp);

  // The info bar: what's selected, typed out letter by letter.
  const bar = el("div", "infobar");
  const info = el("div", "info");
  const infoTitle = el("span", "title");
  const infoBlurb = el("span", "blurb");
  info.append(infoTitle, infoBlurb);
  const players = el("div", "players");
  const clock = el("div", "clock", clockText(new Date()));
  bar.append(el("div", "label", "PLAYER SELECT"), el("div", "cursor", "▮"), info, players, clock);
  window.setInterval(() => (clock.textContent = clockText(new Date())), 1000);

  // The games.
  const grid = el("section", "panels");
  grid.setAttribute("aria-label", "Games");
  const panels = data.slots.map((slot, i) => {
    const media = slot.kind === "game" ? data.media.get(slot.game.id) : undefined;
    const panel = new Panel(slot, i + 1, media, data.reducedMotion);
    grid.append(panel.el);
    return panel;
  });

  const startBanner = el("div", "game-start", "GAME START!");
  const fade = el("div", "fade");
  const top = ticker("top", textList(tickerTop, ["INSERT COIN"]), data.gameCount);
  const bottom = ticker("bottom", textList(tickerBottom, ["ENTER TO PLAY"]), data.gameCount);
  root.append(top, logoRow, bar, grid, bottom, startBanner, fade);

  fitLogoWhenReady(logo);
  // When the window changes shape the panels move around: keep the selected one on screen.
  new ResizeObserver(() => panels[selected]?.el.scrollIntoView({ block: "nearest", inline: "nearest" })).observe(grid);

  let selected = -1;
  let typing = 0;
  const typeOut = (text: string) => {
    window.clearInterval(typing);
    if (data.reducedMotion) {
      infoBlurb.textContent = text;
      return;
    }
    let shown = 0;
    infoBlurb.textContent = "";
    typing = window.setInterval(() => {
      shown++;
      infoBlurb.textContent = text.slice(0, shown);
      if (shown >= text.length) window.clearInterval(typing);
    }, 1000 / settings.typeLettersPerSecond);
  };

  return {
    select(index) {
      if (index === selected || !panels[index]) return;
      panels[selected]?.setSelected(false);
      selected = index;
      const panel = panels[index];
      panel.setSelected(true);
      panel.el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: data.reducedMotion ? "auto" : "smooth" });
      const slot = data.slots[index];
      if (slot.kind === "game") {
        infoTitle.textContent = `${slot.game.title} — `;
        players.textContent = playerLabel(slot.game.players);
        typeOut(slot.game.blurb);
      } else {
        infoTitle.textContent = "COMING SOON — ";
        players.textContent = "??";
        typeOut("A new game is on its way. Maybe you'll make it!");
      }
    },
    columns() {
      const tracks = getComputedStyle(grid).gridTemplateColumns.split(" ").filter((t) => t && t !== "none");
      return Math.max(1, tracks.length);
    },
    onHover(fn) {
      let last: { x: number; y: number } | null = null;
      panels.forEach((p, i) =>
        p.el.addEventListener("pointermove", (e) => {
          if (e.pointerType !== "mouse" || !mouseMoved(last, e.clientX, e.clientY)) return;
          last = { x: e.clientX, y: e.clientY };
          if (i !== selected) fn(i);
        }),
      );
    },
    onClick(fn) {
      panels.forEach((p, i) => p.el.addEventListener("click", () => fn(i)));
    },
    setCredit(text) {
      credit.textContent = text;
    },
    notYet(index) {
      const node = panels[index]?.el;
      if (!node) return;
      node.classList.remove("nope");
      void node.offsetWidth; // restart the shake if it's already shaking
      node.classList.add("nope");
    },
    showGameStart() {
      panels[selected]?.el.classList.add("starting");
      startBanner.classList.add("show");
    },
    fadeOut(ms) {
      fade.style.transitionDuration = `${ms}ms`;
      fade.classList.add("show");
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    },
  };
}
