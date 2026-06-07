import type { Level, Stage } from "./types";

export const GROUP_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

export const STAGE_LABEL: Record<Stage, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  third: "Third place",
  final: "Final",
};

export const STAGE_SHORT: Record<Stage, string> = {
  group: "GRP",
  r32: "R32",
  r16: "R16",
  qf: "QF",
  sf: "SF",
  third: "3rd",
  final: "F",
};

export interface LevelMeta {
  id: Level;
  name: string;
  tagline: string;
  minutes: string;
  blurb: string;
  /** What this level asks the player to predict. */
  includes: string[];
  accent: "lime" | "cyan" | "magenta";
}

export const LEVELS: Record<Level, LevelMeta> = {
  casual: {
    id: "casual",
    name: "Casual",
    tagline: "Crown your champion",
    minutes: "~30 sec",
    blurb: "Just the big picks. Perfect for a quick, shareable take.",
    includes: ["Pick the champion", "Pick both finalists"],
    accent: "lime",
  },
  standard: {
    id: "standard",
    name: "Standard",
    tagline: "Fill the bracket",
    minutes: "~3 min",
    blurb: "Run the full knockout gauntlet and call the Golden Boot.",
    includes: [
      "Full knockout bracket (R32 → Final)",
      "Champion",
      "Golden Boot winner",
    ],
    accent: "cyan",
  },
  expert: {
    id: "expert",
    name: "Expert",
    tagline: "Call every shot",
    minutes: "~10 min",
    blurb: "Group tables, exact scorelines, awards — the full forecast.",
    includes: [
      "All 12 group tables",
      "Full bracket with exact scorelines",
      "Champion, Golden Boot & more awards",
    ],
    accent: "magenta",
  },
};

export const LEVEL_ORDER: Level[] = ["casual", "standard", "expert"];
