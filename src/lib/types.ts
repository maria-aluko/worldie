/** Shared domain types (mirror the DB schema in lib/db/schema.ts). */

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type Level = "standard" | "expert";

/**
 * A player's relationship to a sticker. "not_owned" is the default and is
 * represented by the absence of a `user_stickers` row. "owned" carries a copy
 * count (≥1); spares to trade are derived (`count - 1`), not a separate status.
 * "desired" means wanted-but-not-owned (count 0).
 */
export type StickerStatus = "not_owned" | "owned" | "desired";

/**
 * Finish of an Extra Sticker. Each of the 20 Extra players exists in three
 * finishes; regular stickers have no tier (`null`).
 */
export type Tier = "bronze" | "silver" | "gold";

/**
 * DB sentinel stored in `stickers.tier` for a regular (single-finish) sticker.
 * The column is non-null so the unique index keys cleanly; the app treats this
 * value as "no finish" (null). See `stickers` in lib/db/schema.ts.
 */
export const NO_TIER = "base";

export type MatchStatus = "scheduled" | "live" | "finished";

export interface Team {
  id: string;
  name: string;
  code: string; // 3-letter, e.g. "BRA"
  flag: string; // emoji or url
  group: string | null; // "A".."L"
}

export interface Match {
  id: string;
  stage: Stage;
  group: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffAt: string | null; // ISO
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
}

/**
 * A single pick within an entry.
 * `ref` is either a match id or a structural slot like:
 *   "champion", "runner_up", "third_place", "golden_boot",
 *   "winner_group_A" … "winner_group_L", "runner_group_A" …
 */
export interface Pick {
  ref: string;
  pickTeamId: string | null;
  predHome: number | null;
  predAway: number | null;
}

export interface Entry {
  id: string;
  userId: string;
  level: Level;
  slug: string;
  displayName: string | null;
  createdAt: string;
  lockedAt: string | null;
  totalPoints: number;
}
