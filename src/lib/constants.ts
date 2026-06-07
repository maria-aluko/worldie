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
  standard: {
    id: "standard",
    name: "Standard",
    tagline: "Pick who progresses",
    minutes: "~3 min",
    blurb:
      "Pick the teams that advance at every stage, all the way to the trophy.",
    includes: [
      "Top 2 from all 12 groups",
      "Full knockout bracket (R32 → Final)",
      "Champion & Golden Boot",
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

export const LEVEL_ORDER: Level[] = ["standard", "expert"];
