import { clampSettings, type Limits } from "@web-games/settings";
import { alternateColor } from "./color";

// Every list below is what a kid can type into a character file.
export const BODY_FRAMES = ["masculine", "feminine"] as const;
export const ARCHETYPES = ["martial", "brawler"] as const;
export const BUILDS = ["lean", "medium", "big"] as const;
export const HAIR_STYLES = ["swoop", "short", "spiky", "long", "buzz", "ponytail", "buns", "braids"] as const;
export const EXPRESSIONS = ["determined", "grin"] as const;
export const JAWS = ["square", "round", "soft", "pointed"] as const;
export const BROWS = ["heavy", "thin", "arched"] as const;
export const EYE_SHAPES = ["narrow", "round"] as const;
export const NOSES = ["straight", "button", "wide"] as const;
export const EXTRAS = ["headband", "cap", "bow", "earrings", "glasses", "sunglasses", "wristbands"] as const;
export const WEAPONS = ["none", "baseball-bat", "tennis-racket", "hockey-stick", "lacrosse-stick", "frying-pan"] as const;

/** Known names autocomplete in editors, but a typo still typechecks (the normalizer fixes it). */
type Choice<T extends readonly string[]> = T[number] | (string & {});

export interface Look {
  body: Choice<typeof BODY_FRAMES>;
  archetype: Choice<typeof ARCHETYPES>;
  height: number;
  build: Choice<typeof BUILDS>;
  muscle: number;
  skin: string;
  eyes: string;
  face: {
    expression: Choice<typeof EXPRESSIONS>;
    jaw: Choice<typeof JAWS>;
    brows: Choice<typeof BROWS>;
    eyeShape: Choice<typeof EYE_SHAPES>;
    nose: Choice<typeof NOSES>;
    freckles: boolean;
    lashes: boolean;
  };
  hair: { style: Choice<typeof HAIR_STYLES>; color: string };
  top: string;
  bottom: string;
  belt: string;
  shoes: string;
  extras: Choice<typeof EXTRAS>[];
  accent: string;
  weapon: Choice<typeof WEAPONS>;
}

/**
 * A field as a character file may write it: numbers may also be words (like
 * "tall"), lists may be one item, and objects may leave fields out.
 * normalizeLook() turns any of that into a real Look.
 */
type Loose<T> = T extends number
  ? number | (string & {})
  : T extends boolean
    ? boolean
    : T extends string
      ? T
      : T extends readonly (infer U)[]
        ? Loose<U>[] | Loose<U>
        : T extends object
          ? { [K in keyof T]?: Loose<T[K]> }
          : T;

/** What a character file writes for `look`: every field optional, and a typo still typechecks. */
export type LookFile = { [K in keyof Look]?: Loose<Look[K]> };

/** Colin, from the spike. Anything a character file leaves out comes from here. */
export const DEFAULT_LOOK: Look = {
  body: "masculine",
  archetype: "martial",
  height: 1.08,
  build: "lean",
  muscle: 1.15,
  skin: "#f1c08f",
  eyes: "#3b6fb6",
  face: { expression: "determined", jaw: "square", brows: "heavy", eyeShape: "narrow", nose: "straight", freckles: false, lashes: false },
  hair: { style: "swoop", color: "#f7d35c" },
  top: "#2f6fd6",
  bottom: "#2f6fd6",
  belt: "#1d1d1d",
  shoes: "#ffffff",
  extras: ["headband"],
  accent: "#e8e8e8",
  weapon: "none",
};

export const LOOK_LIMITS = {
  height: { min: 0.85, max: 1.15 },
  muscle: { min: 0.8, max: 1.4 },
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Turns whatever a kid typed into a complete, safe Look. Missing fields come
 * from Colin; typos get a friendly warning and a fallback.
 */
export function normalizeLook(raw: unknown, warn: (message: string) => void = console.warn): Look {
  const src = isObj(raw) ? raw : {};
  const faceSrc = isObj(src.face) ? src.face : {};
  const hairSrc = isObj(src.hair) ? src.hair : {};
  const d = DEFAULT_LOOK;

  const choice = (value: unknown, options: readonly string[], fallback: string, label: string): string => {
    if (value === undefined) return fallback;
    if (typeof value === "string" && options.includes(value)) return value;
    warn(`🥊 ${label} ${JSON.stringify(value)} isn't one we know yet. Try: ${options.join(", ")}`);
    return fallback;
  };
  const color = (value: unknown, fallback: string, label: string): string => {
    if (value === undefined) return fallback;
    if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
    warn(`🥊 ${label} color ${JSON.stringify(value)} should look like "#f1c08f" (a # and six letters or numbers).`);
    return fallback;
  };
  const flag = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);

  const body = choice(src.body, BODY_FRAMES, d.body, "body");

  let extras: Look["extras"] = d.extras;
  if (src.extras !== undefined) {
    const list = Array.isArray(src.extras) ? src.extras : [src.extras];
    extras = list.filter((e): e is string => {
      if (typeof e === "string" && (EXTRAS as readonly string[]).includes(e)) return true;
      warn(`🥊 extra ${JSON.stringify(e)} isn't one we know yet. Try: ${EXTRAS.join(", ")}`);
      return false;
    });
  }

  const numbers = clampSettings(
    {
      height: typeof src.height === "number" ? src.height : d.height,
      muscle: typeof src.muscle === "number" ? src.muscle : d.muscle,
    },
    LOOK_LIMITS satisfies Limits<{ height: number; muscle: number }>,
    warn,
  );
  for (const key of ["height", "muscle"] as const) {
    if (src[key] !== undefined && typeof src[key] !== "number") {
      warn(`🥊 ${key} should be a number from ${LOOK_LIMITS[key].min} to ${LOOK_LIMITS[key].max}. Using ${d[key]} for now.`);
    }
  }

  return {
    body,
    archetype: choice(src.archetype, ARCHETYPES, d.archetype, "archetype"),
    height: numbers.height,
    build: choice(src.build, BUILDS, d.build, "build"),
    muscle: numbers.muscle,
    skin: color(src.skin, d.skin, "skin"),
    eyes: color(src.eyes, d.eyes, "eyes"),
    face: {
      expression: choice(faceSrc.expression, EXPRESSIONS, d.face.expression, "expression"),
      jaw: choice(faceSrc.jaw, JAWS, d.face.jaw, "jaw"),
      brows: choice(faceSrc.brows, BROWS, d.face.brows, "brows"),
      eyeShape: choice(faceSrc.eyeShape, EYE_SHAPES, d.face.eyeShape, "eye shape"),
      nose: choice(faceSrc.nose, NOSES, d.face.nose, "nose"),
      freckles: flag(faceSrc.freckles, d.face.freckles),
      lashes: flag(faceSrc.lashes, body === "feminine"),
    },
    hair: {
      // An unknown style falls back to plain "short" rather than Colin's swoop.
      style: choice(hairSrc.style, HAIR_STYLES, hairSrc.style === undefined ? d.hair.style : "short", "hair style"),
      color: color(hairSrc.color, d.hair.color, "hair"),
    },
    top: color(src.top, d.top, "top"),
    bottom: color(src.bottom, d.bottom, "bottom"),
    belt: color(src.belt, d.belt, "belt"),
    shoes: color(src.shoes, d.shoes, "shoes"),
    extras,
    accent: color(src.accent, d.accent, "accent"),
    weapon: choice(src.weapon, WEAPONS, d.weapon, "weapon"),
  };
}

/**
 * A second outfit for when both fighters would wear the same colors. Colorful
 * clothes spin 180° around the color wheel; black, white and gray ones (which
 * a spin can't change) get lighter or darker instead (see alternateColor).
 */
export function alternateColors(look: Look): Look {
  const alt = alternateColor;
  return { ...look, top: alt(look.top), bottom: alt(look.bottom), accent: alt(look.accent), belt: alt(look.belt) };
}
