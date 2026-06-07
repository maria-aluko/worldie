/** Shared domain types (mirror the DB schema in lib/db/schema.ts). */

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type Level = "casual" | "standard" | "expert";

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
