// 🏟️ STAGES
//
// Every place you can fight is one block in the STAGES list below. The game
// draws each one with code: a sky, layers of mountains, a floor, and some
// "props" (things standing in the background).
//
// Colors are written like "#ff8c52": a # and six letters/numbers
// (red, green, blue). Search "color picker" online to find any color's code.
//
// 🛠️ TRY THIS: make your own stage! Copy a whole block (from { to },),
// paste it at the end of the list, and change the id, the name and the colors.
// Then put stage: "your-id" in a character file to make it their home stage.
//
// Props you can use (in any order, as many as you like):
//   "palms"     palm trees
//   "bleachers" gray stands behind the floor
//   "crowd"     people on the bleachers who bob up and down
//   "fence"     a chain-link fence
//   "backstop"  a baseball backstop
//   "house"     a house with a roof and windows
//   "swings"    a swing set

export type PropName = "palms" | "bleachers" | "crowd" | "fence" | "backstop" | "house" | "swings";

/** A complete, safe stage: what normalizeStage() makes from a block in STAGES. */
export interface StageDef {
  /** A short name with no spaces, used in character files (stage: "track"). */
  id: string;
  /** The name shown on screen. */
  name: string;
  /** The sky's color at the top and at the horizon. The game fills in the steps between. */
  sky: [string, string];
  /** Mountain layers, from farthest away to closest. */
  mountains: string[];
  /** The ground you fight on. */
  floor: string;
  /** The stripes painted on the floor. */
  floorLines: string;
  /** Things standing in the background. Unknown names are skipped. */
  props: (PropName | (string & {}))[];
}

/**
 * What a stage block below may write. Every field is optional, and
 * a typo still typechecks: the game fills in or fixes anything wrong (with a
 * message in the console) and only ever uses the complete StageDef above.
 */
export interface StageFile {
  id?: string;
  name?: string;
  sky?: string[];
  mountains?: string[];
  floor?: string;
  floorLines?: string;
  props?: (PropName | (string & {}))[] | PropName | (string & {});
}

export const STAGES: StageFile[] = [
  // The running track at sunset, with the crowd in the bleachers.
  // The first stage is the one used when a fighter has no home stage.
  {
    id: "track",
    name: "THE TRACK",
    sky: ["#4a2378", "#ffa64a"],
    mountains: ["#7a4a9a", "#553877"],
    floor: "#c4553a",
    floorLines: "#fff2e0",
    props: ["palms", "bleachers", "crowd"],
  },
  // The school yard: blacktop with painted lines, a fence and the swings.
  {
    id: "schoolyard",
    name: "SCHOOL YARD",
    sky: ["#2b5fbf", "#ffd27a"],
    mountains: ["#6a7fc0", "#4a5e9e"],
    floor: "#5c5f73",
    floorLines: "#f2e14c",
    props: ["palms", "fence", "swings"],
  },
  // The ball field: an orange evening, the backstop and a crowd watching.
  {
    id: "ballfield",
    name: "BALL FIELD",
    sky: ["#d0456a", "#ffe08a"],
    mountains: ["#9a5a9a", "#74407a"],
    floor: "#c98a4a",
    floorLines: "#ffffff",
    props: ["backstop", "bleachers", "crowd", "palms"],
  },
  // The back yard at dusk: grass, the house, the fence and the swings.
  {
    id: "backyard",
    name: "BACK YARD",
    sky: ["#1e2a6e", "#ff9a6a"],
    mountains: ["#4c3a7a", "#352a5a"],
    floor: "#4fa83d",
    floorLines: "#3d8a30",
    props: ["house", "fence", "swings"],
  },
];

// ─── You don't need to change anything below here. ──────────────────────────
// It checks a stage for typos and fixes them, so a mistake never breaks the game.

export const PROP_NAMES: readonly PropName[] = ["palms", "bleachers", "crowd", "fence", "backstop", "house", "swings"];

const isColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The track as it first came, for any stage that's missing a color (even if the track above gets changed). */
export const DEFAULT_STAGE: StageDef = {
  id: "track",
  name: "THE TRACK",
  sky: ["#4a2378", "#ffa64a"],
  mountains: ["#7a4a9a", "#553877"],
  floor: "#c4553a",
  floorLines: "#fff2e0",
  props: ["palms", "bleachers", "crowd"],
};

const copy = (s: StageDef): StageDef => ({ ...s, sky: [s.sky[0], s.sky[1]], mountains: [...s.mountains], props: [...s.props] });

/**
 * Turns a stage block into a complete, safe StageDef. Anything wrong is
 * replaced with the track's value, with a friendly warning in the console.
 */
export function normalizeStage(raw: unknown, warn: (message: string) => void = console.warn): StageDef {
  const fallback = DEFAULT_STAGE;
  if (!isObj(raw)) {
    warn(`🏟️ stages.ts: a stage should look like { id: "park", name: "THE PARK", ... }. Using ${fallback.name}.`);
    return copy(fallback);
  }

  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "stage";
  if (id !== raw.id) warn(`🏟️ stages.ts: a stage's id should be a short name like "park". Using "${id}".`);
  const label = `stages.ts "${id}"`;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : id.toUpperCase();

  let sky = fallback.sky;
  if (raw.sky !== undefined) {
    if (Array.isArray(raw.sky) && raw.sky.length === 2 && raw.sky.every(isColor)) sky = [raw.sky[0], raw.sky[1]];
    else warn(`🏟️ ${label}: sky should be two colors, like ["#4a2378", "#ffa64a"]. Using the track's sky.`);
  }

  let mountains = fallback.mountains;
  if (raw.mountains !== undefined) {
    const list = Array.isArray(raw.mountains) ? raw.mountains : [];
    const good = list.filter(isColor);
    if (good.length !== list.length || good.length === 0) {
      warn(`🏟️ ${label}: mountains should be a list of colors, like ["#7a4a9a", "#553877"]. Skipping the ones that aren't.`);
    }
    if (good.length > 0) mountains = good;
  }

  const color = (key: "floor" | "floorLines"): string => {
    const v = raw[key];
    if (v === undefined) return fallback[key];
    if (isColor(v)) return v;
    warn(`🏟️ ${label}: ${key} should be a color like "#c4553a". Using the track's.`);
    return fallback[key];
  };

  const props: StageDef["props"] = [];
  if (raw.props !== undefined) {
    const list = Array.isArray(raw.props) ? raw.props : [raw.props];
    for (const p of list) {
      if (typeof p === "string" && (PROP_NAMES as readonly string[]).includes(p)) props.push(p);
      else warn(`🏟️ ${label}: prop ${JSON.stringify(p)} isn't one we know. Try: ${PROP_NAMES.join(", ")}. Leaving it out.`);
    }
  }

  return { id, name, sky: [sky[0], sky[1]], mountains: [...mountains], floor: color("floor"), floorLines: color("floorLines"), props };
}

/** The stage with this id, or the first stage if there isn't one. */
export function stageById(id: string | undefined): StageDef {
  const found = STAGES.find((s) => isObj(s) && s.id === id);
  return normalizeStage(found ?? STAGES[0]);
}
