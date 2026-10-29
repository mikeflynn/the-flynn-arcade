// What a character file looks like, and the code that cleans one up.
// A typo in a character file never breaks the game: it gets a friendly
// message in the console (press F12) and a safe fallback.

import { clampSettings, type Limits } from "@web-games/settings";
import { normalizeLook, type Look, type LookFile } from "@web-games/rig";
import { KNOWN_MOVE_TYPES } from "./moves";

export type MoveType =
  | "fireball" | "uppercut" | "spin-kick" | "charge-dash" | "flip-kick" | "rapid-hits" | "command-throw"
  | (string & {});

export interface SpecialChoice {
  type: MoveType;
  name: string;
  color?: string;
  /** 0.5 (slow) to 2 (fast) */
  speed?: number;
  /** 0 to 5 extra damage */
  damageBonus?: number;
}

export type NormalId =
  | "st.LP" | "st.MP" | "st.HP" | "st.LK" | "st.MK" | "st.HK"
  | "cr.LP" | "cr.MP" | "cr.HP" | "cr.LK" | "cr.MK" | "cr.HK"
  | "j.LP" | "j.MP" | "j.HP" | "j.LK" | "j.MK" | "j.HK"
  | "cl.MP" | "cl.HP";

export const NORMAL_IDS: readonly NormalId[] = [
  "st.LP", "st.MP", "st.HP", "st.LK", "st.MK", "st.HK",
  "cr.LP", "cr.MP", "cr.HP", "cr.LK", "cr.MK", "cr.HK",
  "j.LP", "j.MP", "j.HP", "j.LK", "j.MK", "j.HK",
  "cl.MP", "cl.HP",
];

/** A number in a character file. A word like "fast" still typechecks: the game warns and uses a default. */
type LooseNumber = number | (string & {});

/**
 * What a character file in src/characters/ writes. Everything is optional and
 * forgiving: a typo, a missing field or a word where a number goes still
 * typechecks, and normalizeFighter() fixes it (with a message in the console).
 * The game itself only ever sees the cleaned-up `Fighter` below.
 */
export interface FighterFile {
  /** Ignored: a fighter's id is always its file's name. */
  id?: string;
  name?: string;
  look?: LookFile;
  stats?: { speed?: LooseNumber; power?: LooseNumber; health?: LooseNumber; jump?: LooseNumber };
  specials?: {
    type: MoveType;
    name?: string;
    color?: string;
    speed?: LooseNumber;
    damageBonus?: LooseNumber;
  }[];
  normals?: { [id in NormalId | (string & {})]?: { damage?: LooseNumber; reach?: LooseNumber } };
  winQuote?: string;
  stage?: string;
}

/** A complete, safe fighter: what normalizeFighter() makes from a character file. */
export interface Fighter {
  id: string;
  name: string;
  look: Look;
  stats: { speed: number; power: number; health: number; jump: number };
  specials: SpecialChoice[];
  normals: Partial<Record<NormalId, { damage?: number; reach?: number }>>;
  winQuote: string;
  stage?: string;
}

export const STAT_LIMITS = {
  speed: { min: 1, max: 10 },
  power: { min: 1, max: 10 },
  health: { min: 50, max: 150 },
  jump: { min: 1, max: 10 },
} satisfies Limits<Fighter["stats"]>;
export const NORMAL_LIMITS = { damage: { min: 1, max: 30 }, reach: { min: 0.8, max: 1.3 } };
export const SPECIAL_LIMITS = { speed: { min: 0.5, max: 2 }, damageBonus: { min: 0, max: 5 } };
export const MAX_SPECIALS = 4;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A number from a character file, kept inside its range. Left out (undefined) if missing; a wrong type is ignored with a warning. */
function tweak(
  value: unknown, key: string, range: { min: number; max: number }, label: string, warn: (message: string) => void,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    warn(`🥊 ${label}: ${key} should be a number from ${range.min} to ${range.max}. Ignoring it.`);
    return undefined;
  }
  return clampSettings({ [key]: value }, { [key]: range }, (m) => warn(`${label}: ${m}`))[key]!;
}

/**
 * Turns whatever a character file exports into a complete, safe Fighter.
 * Returns null (with a warning) if it isn't even an object.
 */
export function normalizeFighter(
  raw: unknown,
  fileId: string,
  knownMoveTypes: readonly string[] = KNOWN_MOVE_TYPES,
  warn: (message: string) => void = console.warn,
): Fighter | null {
  if (!isObj(raw)) {
    warn(`🥊 ${fileId}.ts: "fighter" should be an object like { name: "COLIN", look: {...}, ... }. Leaving this fighter out.`);
    return null;
  }

  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : fileId.toUpperCase();
  if (raw.name !== undefined && name !== raw.name) warn(`🥊 ${fileId}.ts: name should be some text, like "COLIN". Using ${name}.`);

  const statsSrc = isObj(raw.stats) ? raw.stats : {};
  const num = (key: keyof Fighter["stats"], fallback: number) => {
    const v = statsSrc[key];
    if (typeof v === "number") return v;
    if (v !== undefined) {
      const { min, max } = STAT_LIMITS[key];
      warn(`🥊 ${name}: stats.${key} should be a number from ${min} to ${max}, not ${JSON.stringify(v)}. Using ${fallback}.`);
    }
    return fallback;
  };
  const stats = clampSettings(
    {
      speed: num("speed", 5),
      power: num("power", 5),
      health: num("health", 100),
      jump: num("jump", 5),
    },
    STAT_LIMITS,
    (m) => warn(`${name}: ${m}`),
  );

  const specials: SpecialChoice[] = [];
  const specialsSrc = Array.isArray(raw.specials) ? raw.specials : [];
  for (const s of specialsSrc) {
    if (!isObj(s) || typeof s.type !== "string" || !knownMoveTypes.includes(s.type)) {
      const type = isObj(s) ? JSON.stringify(s.type) : JSON.stringify(s);
      warn(`🥊 ${name}: special move type ${type} isn't one we know yet. Try: ${knownMoveTypes.join(", ")}. Leaving it out.`);
      continue;
    }
    const choice: SpecialChoice = { type: s.type, name: typeof s.name === "string" && s.name.trim() ? s.name : s.type.toUpperCase() };
    if (typeof s.color === "string") choice.color = s.color;
    const label = `${name} ${choice.name}`;
    const speed = tweak(s.speed, "speed", SPECIAL_LIMITS.speed, label, warn);
    const damageBonus = tweak(s.damageBonus, "damageBonus", SPECIAL_LIMITS.damageBonus, label, warn);
    if (speed !== undefined) choice.speed = speed;
    if (damageBonus !== undefined) choice.damageBonus = damageBonus;
    specials.push(choice);
  }
  if (specials.length > MAX_SPECIALS) {
    warn(`🥊 ${name} has ${specials.length} special moves, but the limit is ${MAX_SPECIALS}. Keeping the first ${MAX_SPECIALS}.`);
    specials.length = MAX_SPECIALS;
  }

  const normals: Fighter["normals"] = {};
  if (isObj(raw.normals)) {
    for (const [id, v] of Object.entries(raw.normals)) {
      if (!(NORMAL_IDS as readonly string[]).includes(id)) {
        warn(`🥊 ${name}: "${id}" isn't a move we know. Try: ${NORMAL_IDS.join(", ")}. Leaving it out.`);
        continue;
      }
      if (!isObj(v)) continue;
      const entry: { damage?: number; reach?: number } = {};
      const damage = tweak(v.damage, "damage", NORMAL_LIMITS.damage, `${name} ${id}`, warn);
      const reach = tweak(v.reach, "reach", NORMAL_LIMITS.reach, `${name} ${id}`, warn);
      if (damage !== undefined) entry.damage = damage;
      if (reach !== undefined) entry.reach = reach;
      normals[id as NormalId] = entry;
    }
  }

  const fighter: Fighter = {
    id: fileId,
    name,
    look: normalizeLook(raw.look, (m) => warn(`${name}: ${m}`)),
    stats,
    specials,
    normals,
    winQuote: typeof raw.winQuote === "string" ? raw.winQuote : "",
  };
  if (typeof raw.stage === "string") fighter.stage = raw.stage;
  return fighter;
}
