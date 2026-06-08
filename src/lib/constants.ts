import type { Level, Stage } from "./types";

export const GROUP_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
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
    minutes: "~5 min",
    blurb: "",
    includes: [
      "Rank every group 1→4",
      "Pick 8 lucky losers",
      "Knockout bracket, champion, bronze & Golden Boot",
    ],
    accent: "cyan",
  },
  expert: {
    id: "expert",
    name: "Expert",
    tagline: "Call every shot",
    minutes: "~10 min",
    blurb: "",
    includes: [
      "Exact scores for every group match",
      "Group tables auto-computed",
      "Knockout bracket, champion, bronze & Golden Boot",
    ],
    accent: "magenta",
  },
};

export const LEVEL_ORDER: Level[] = ["standard", "expert"];
