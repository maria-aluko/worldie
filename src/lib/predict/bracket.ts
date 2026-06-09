import type { Level, Match, Team } from "@/lib/types";
import { effectiveThirdPlace, groupOrder, type PredictionState } from "./model";
import { THIRD_PLACE_ALLOCATION, type WinnerSlot } from "@/lib/data/third-place-allocation";

/**
 * The 2026 World Cup knockout bracket is fixed by group position once the group
 * standings and the eight qualifying third-placed teams are known. This module
 * resolves a player's prediction state into concrete ties so the knockout picker
 * can offer one winner per tie instead of a free pick-N — making it impossible to
 * advance both teams of a tie.
 *
 * The working state shape is unchanged: a tie's winner is simply the element of
 * the relevant `reach_*` set (or champion/bronze) belonging to that tie.
 */

/** The stage a tie belongs to. Winners of a stage's ties reach the *next* stage. */
export type TieStage = "r32" | "r16" | "qf" | "sf" | "final" | "third";

export interface Tie {
  /** Official match id, e.g. "M73". */
  id: string;
  homeId: string | null;
  awayId: string | null;
  winnerId: string | null;
}

export interface ResolvedBracket {
  /** 16 ties; winners populate reach_r16. */
  r32: Tie[];
  /** 8 ties; winners populate reach_qf. */
  r16: Tie[];
  /** 4 ties; winners populate reach_sf. */
  qf: Tie[];
  /** 2 ties; winners populate finalists. */
  sf: Tie[];
  /** Winner is the champion. */
  final: Tie;
  /** Third-place play-off between the two beaten semi-finalists; winner is bronze. */
  third: Tie;
}

/** A Round-of-32 tie side: a fixed group position, or an allocated third-placed team. */
type Slot =
  | { kind: "pos"; pos: 1 | 2; group: string }
  | { kind: "third"; slot: WinnerSlot };

const pos = (p: 1 | 2, group: string): Slot => ({ kind: "pos", pos: p, group });
const third = (slot: WinnerSlot): Slot => ({ kind: "third", slot });

/** The 16 Round-of-32 ties (matches 73–88), per FIFA's fixed bracket. */
const R32: { id: string; home: Slot; away: Slot }[] = [
  { id: "M73", home: pos(2, "A"), away: pos(2, "B") },
  { id: "M74", home: pos(1, "E"), away: third("1E") },
  { id: "M75", home: pos(1, "F"), away: pos(2, "C") },
  { id: "M76", home: pos(1, "C"), away: pos(2, "F") },
  { id: "M77", home: pos(1, "I"), away: third("1I") },
  { id: "M78", home: pos(2, "E"), away: pos(2, "I") },
  { id: "M79", home: pos(1, "A"), away: third("1A") },
  { id: "M80", home: pos(1, "L"), away: third("1L") },
  { id: "M81", home: pos(1, "D"), away: third("1D") },
  { id: "M82", home: pos(1, "G"), away: third("1G") },
  { id: "M83", home: pos(2, "K"), away: pos(2, "L") },
  { id: "M84", home: pos(1, "H"), away: pos(2, "J") },
  { id: "M85", home: pos(1, "B"), away: third("1B") },
  { id: "M86", home: pos(1, "J"), away: pos(2, "H") },
  { id: "M87", home: pos(1, "K"), away: third("1K") },
  { id: "M88", home: pos(2, "D"), away: pos(2, "G") },
];

/** Later-round ties reference winners ("W74") / losers ("L101") of earlier matches. */
const R16: { id: string; home: string; away: string }[] = [
  { id: "M89", home: "W74", away: "W77" },
  { id: "M90", home: "W73", away: "W75" },
  { id: "M91", home: "W76", away: "W78" },
  { id: "M92", home: "W79", away: "W80" },
  { id: "M93", home: "W83", away: "W84" },
  { id: "M94", home: "W81", away: "W82" },
  { id: "M95", home: "W86", away: "W88" },
  { id: "M96", home: "W85", away: "W87" },
];
const QF: { id: string; home: string; away: string }[] = [
  { id: "M97", home: "W89", away: "W90" },
  { id: "M98", home: "W93", away: "W94" },
  { id: "M99", home: "W91", away: "W92" },
  { id: "M100", home: "W95", away: "W96" },
];
const SF: { id: string; home: string; away: string }[] = [
  { id: "M101", home: "W97", away: "W98" },
  { id: "M102", home: "W99", away: "W100" },
];
const FINAL = { id: "M104", home: "W101", away: "W102" };
const THIRD = { id: "M103", home: "L101", away: "L102" };

/** Resolve a player's state into concrete ties for every knockout round. */
export function resolveBracket(
  level: Level,
  state: PredictionState,
  teams: Team[],
  matches: Match[],
): ResolvedBracket {
  const order = groupOrder(level, state, teams, matches);
  const thirds = effectiveThirdPlace(level, state, teams, matches);
  const groupOf = new Map(teams.map((t) => [t.id, t.group]));
  const thirdGroups = thirds.map((id) => groupOf.get(id)).filter(Boolean) as string[];
  // Any set of exactly 8 of the 12 groups maps to one of FIFA's 495 scenarios.
  const allocation =
    thirdGroups.length === 8
      ? THIRD_PLACE_ALLOCATION[[...thirdGroups].sort().join("")]
      : undefined;

  const posId = (p: 1 | 2, g: string) => order[g]?.[p - 1] ?? null;
  const slotId = (s: Slot): string | null =>
    s.kind === "pos" ? posId(s.pos, s.group) : allocation ? order[allocation[s.slot]]?.[2] ?? null : null;

  const winnerOf = new Map<string, string | null>();
  const loserOf = new Map<string, string | null>();
  const tie = (id: string, homeId: string | null, awayId: string | null, winners: Set<string>): Tie => {
    let winnerId: string | null = null;
    if (homeId && winners.has(homeId)) winnerId = homeId;
    else if (awayId && winners.has(awayId)) winnerId = awayId;
    winnerOf.set(id, winnerId);
    loserOf.set(id, winnerId ? (winnerId === homeId ? awayId : homeId) : null);
    return { id, homeId, awayId, winnerId };
  };
  // Resolve a "W<n>"/"L<n>" reference against already-resolved earlier rounds.
  const ref = (r: string): string | null =>
    (r[0] === "W" ? winnerOf : loserOf).get(`M${r.slice(1)}`) ?? null;

  const r32 = R32.map((s) => tie(s.id, slotId(s.home), slotId(s.away), new Set(state.reach_r16)));
  const r16 = R16.map((s) => tie(s.id, ref(s.home), ref(s.away), new Set(state.reach_qf)));
  const qf = QF.map((s) => tie(s.id, ref(s.home), ref(s.away), new Set(state.reach_sf)));
  const sf = SF.map((s) => tie(s.id, ref(s.home), ref(s.away), new Set(state.finalists)));
  const final = tie(FINAL.id, ref(FINAL.home), ref(FINAL.away), state.champion ? new Set([state.champion]) : new Set());
  const thirdTie = tie(THIRD.id, ref(THIRD.home), ref(THIRD.away), state.bronze ? new Set([state.bronze]) : new Set());

  return { r32, r16, qf, sf, final, third: thirdTie };
}

/** A round is complete when every tie has a winner (unresolved ties have none). */
export function roundComplete(ties: Tie[]): boolean {
  return ties.every((t) => t.winnerId != null);
}

/** Which `reach_*` set holds the winners of each multi-tie stage. */
const STAGE_KEY = {
  r32: "reach_r16",
  r16: "reach_qf",
  qf: "reach_sf",
  sf: "finalists",
} as const satisfies Record<"r32" | "r16" | "qf" | "sf", keyof PredictionState>;

/** Set the winner of a tie, then drop any downstream picks it invalidated. */
export function setTieWinner(
  level: Level,
  state: PredictionState,
  teams: Team[],
  matches: Match[],
  stage: TieStage,
  tie: Tie,
  teamId: string,
): PredictionState {
  let next: PredictionState;
  if (stage === "final") next = { ...state, champion: teamId };
  else if (stage === "third") next = { ...state, bronze: teamId };
  else {
    const key = STAGE_KEY[stage];
    const cur = (state[key] as string[]) ?? [];
    // Remove both of this tie's teams, then add the chosen winner.
    const kept = cur.filter((id) => id !== tie.homeId && id !== tie.awayId);
    next = { ...state, [key]: [...kept, teamId] };
  }
  return normalizeBracket(level, next, teams, matches);
}

/** Drop knockout picks that are no longer valid winners of their (re-derived) tie. */
export function normalizeBracket(
  level: Level,
  state: PredictionState,
  teams: Team[],
  matches: Match[],
): PredictionState {
  let s = state;
  const teamsIn = (ties: Tie[]) =>
    new Set(ties.flatMap((t) => [t.homeId, t.awayId].filter(Boolean) as string[]));

  // Prune each round's winners to teams that still appear in that round's ties,
  // re-resolving after each prune so downstream ties reflect upstream changes.
  let b = resolveBracket(level, s, teams, matches);
  s = { ...s, reach_r16: s.reach_r16.filter((id) => teamsIn(b.r32).has(id)) };
  b = resolveBracket(level, s, teams, matches);
  s = { ...s, reach_qf: s.reach_qf.filter((id) => teamsIn(b.r16).has(id)) };
  b = resolveBracket(level, s, teams, matches);
  s = { ...s, reach_sf: s.reach_sf.filter((id) => teamsIn(b.qf).has(id)) };
  b = resolveBracket(level, s, teams, matches);
  s = { ...s, finalists: s.finalists.filter((id) => teamsIn(b.sf).has(id)) };

  // Champion must be a finalist; bronze must be a beaten semi-finalist.
  if (s.champion && !s.finalists.includes(s.champion)) s = { ...s, champion: null };
  if (s.bronze && (!s.reach_sf.includes(s.bronze) || s.finalists.includes(s.bronze))) {
    s = { ...s, bronze: null };
  }
  return s;
}
