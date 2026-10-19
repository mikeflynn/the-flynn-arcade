/**
 * @web-games/input — keyboard + gamepad input, mapped to per-player actions.
 *
 * Game-agnostic: each game picks its own action names ("jump", "fire", ...)
 * and says which keys / gamepad buttons trigger them.
 */

export interface StickDirection {
  axis: number;
  direction: -1 | 1;
}

export interface PadBindings {
  /** Which gamepad to read (0 = the first one plugged in). */
  index: number;
  /** Standard-layout button numbers per action (0 = A, 9 = Start, 12-15 = D-pad). */
  buttons: Record<string, number[]>;
  /** Stick directions per action, e.g. left: [{ axis: 0, direction: -1 }]. */
  axes?: Record<string, StickDirection[]>;
}

export interface Bindings {
  /** KeyboardEvent.code values per action, e.g. jump: ["Space", "ArrowUp"]. */
  keys: Record<string, string[]>;
  pad?: PadBindings;
}

export interface PadState {
  buttons: boolean[];
  axes: number[];
}

/** How far a stick must be pushed (0 to 1) before it counts. */
export const STICK_DEADZONE = 0.4;

/** Which actions are active right now for one player. Pure, so it's easy to test. */
export function resolveActions(
  bindings: Bindings,
  pressedKeys: ReadonlySet<string>,
  pad: PadState | null,
): Set<string> {
  const active = new Set<string>();
  for (const [action, codes] of Object.entries(bindings.keys)) {
    if (codes.some((code) => pressedKeys.has(code))) active.add(action);
  }
  if (pad && bindings.pad) {
    for (const [action, buttons] of Object.entries(bindings.pad.buttons)) {
      if (buttons.some((b) => pad.buttons[b] === true)) active.add(action);
    }
    for (const [action, dirs] of Object.entries(bindings.pad.axes ?? {})) {
      if (dirs.some(({ axis, direction }) => (pad.axes[axis] ?? 0) * direction > STICK_DEADZONE)) {
        active.add(action);
      }
    }
  }
  return active;
}

/** Combines several bindings: keys are added together, and the first gamepad wins. */
export function mergeBindings(...list: Bindings[]): Bindings {
  const keys: Record<string, string[]> = {};
  for (const b of list) {
    for (const [action, codes] of Object.entries(b.keys)) {
      keys[action] = [...new Set([...(keys[action] ?? []), ...codes])];
    }
  }
  return { keys, pad: list.find((b) => b.pad)?.pad };
}

export type GamepadSource = () => ArrayLike<Gamepad | null>;

const browserGamepads: GamepadSource = () =>
  typeof navigator !== "undefined" && typeof navigator.getGamepads === "function"
    ? navigator.getGamepads()
    : [];

/**
 * Listens to the keyboard, reads gamepads, and answers "is player 1 pressing jump?".
 * Call update() once per frame, before reading.
 */
export class InputManager {
  private readonly pressedKeys = new Set<string>();
  /** Keys pressed since the last update(), so a tap shorter than one frame still counts. */
  private readonly tappedKeys = new Set<string>();
  private readonly bindings = new Map<number, Bindings>();
  private current = new Map<number, Set<string>>();
  private previous = new Map<number, Set<string>>();
  private boundCodes = new Set<string>();

  constructor(
    private readonly target: EventTarget,
    private readonly getGamepads: GamepadSource = browserGamepads,
  ) {
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.onBlur);
  }

  setBindings(player: number, bindings: Bindings): void {
    this.bindings.set(player, bindings);
    this.rebuildBoundCodes();
  }

  clearBindings(player: number): void {
    this.bindings.delete(player);
    this.current.delete(player);
    this.previous.delete(player);
    this.rebuildBoundCodes();
  }

  update(): void {
    this.previous = this.current;
    this.current = new Map();
    const keys = new Set([...this.pressedKeys, ...this.tappedKeys]);
    this.tappedKeys.clear();
    for (const [player, bindings] of this.bindings) {
      const pad = bindings.pad ? this.readPad(bindings.pad.index) : null;
      this.current.set(player, resolveActions(bindings, keys, pad));
    }
  }

  isDown(player: number, action: string): boolean {
    return this.current.get(player)?.has(action) ?? false;
  }

  justPressed(player: number, action: string): boolean {
    return this.isDown(player, action) && !(this.previous.get(player)?.has(action) ?? false);
  }

  anyJustPressed(action: string): boolean {
    return [...this.bindings.keys()].some((player) => this.justPressed(player, action));
  }

  destroy(): void {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("blur", this.onBlur);
  }

  private readPad(index: number): PadState | null {
    try {
      const pad = this.getGamepads()[index];
      if (!pad) return null;
      return { buttons: Array.from(pad.buttons, (b) => b.pressed), axes: Array.from(pad.axes) };
    } catch {
      return null; // some browsers throw if gamepads are blocked
    }
  }

  private rebuildBoundCodes(): void {
    this.boundCodes = new Set(
      [...this.bindings.values()].flatMap((b) => Object.values(b.keys).flat()),
    );
  }

  private readonly onKeyDown = (event: Event): void => {
    const { code } = event as KeyboardEvent;
    this.pressedKeys.add(code);
    this.tappedKeys.add(code);
    // Stop arrows/space from scrolling the page, but leave other keys alone.
    if (this.boundCodes.has(code)) event.preventDefault();
  };

  private readonly onKeyUp = (event: Event): void => {
    this.pressedKeys.delete((event as KeyboardEvent).code);
  };

  private readonly onBlur = (): void => {
    // The window lost focus, so we'll never hear the key-ups. Let go of everything.
    this.pressedKeys.clear();
    this.tappedKeys.clear();
  };
}
