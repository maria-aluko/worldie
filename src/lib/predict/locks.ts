import type { Match, Pick, Stage, Team } from "@/lib/types";

/**
 * Rolling prediction deadlines. A pick locks the moment the match (or the first
 * match of the round) that *decides* it kicks off — after that the player can no
 * longer set or change it, and a late entrant cannot choose it at all.
 *
 * Pure and side-effect free (no `server-only`): the predictor runs the same
 * logic in the browser to grey out locked picks, and `createEntry` runs it on
 * the server as the real guard.
 */

/** Earliest kickoff (ms epoch) among matches passing `pred`, or null if none/unknown. */
export function firstKickoff(matches: Match[], pred: (m: Match) => boolean): number | null {
  let min: number | null = null;
  for (const m of matches) {
    if (!m.kickoffAt || !pred(m)) continue;
    const t = Date.parse(m.kickoffAt);
    if (Number.isNaN(t)) continue;
    if (min === null || t < min) min = t;
  }
  return min;
}

/** First kickoff of the whole tournament (the opening group match). */
function tournamentStart(matches: Match[]): number | null {
  return firstKickoff(matches, (m) => m.stage === "group");
}

/** First kickoff within a single group. */
function groupStart(matches: Match[], group: string): number | null {
  return firstKickoff(matches, (m) => m.stage === "group" && m.group === group);
}

/** The round whose first kickoff closes a given advancement pick. */
const REACH_DECIDED_BY: Record<string, Stage> = {
  reach_r16: "r32",
  reach_qf: "r16",
  reach_sf: "qf",
  reach_final: "sf",
  champion: "final",
  runner_up: "final",
  third_place: "third",
};

/**
 * The deadline (ms epoch) after which `ref` is locked, or null when it has no
 * known deadline yet (e.g. a knockout round the feed hasn't scheduled).
 */
export function deadlineForPick(
  ref: string,
  pickTeamId: string | null,
  matches: Match[],
  teamsById: Map<string, Team>,
): number | null {
  // Exact group-table position: locks when that group kicks off.
  if (ref.startsWith("group_pos:")) {
    const group = ref.split(":")[1];
    return groupStart(matches, group);
  }

  // Top-2 qualifier: locks when the picked team's group kicks off.
  if (ref === "reach_r32") {
    const group = pickTeamId ? teamsById.get(pickTeamId)?.group ?? null : null;
    return group ? groupStart(matches, group) : tournamentStart(matches);
  }

  // Cross-group lucky losers and the tournament-long Golden Boot: lock at the
  // first group kickoff (any played game gives an unfair edge on these).
  if (ref === "reach_r32_third" || ref === "golden_boot") {
    return tournamentStart(matches);
  }

  // Advancement / podium picks: lock when the deciding round first kicks off.
  const decidedBy = REACH_DECIDED_BY[ref];
  if (decidedBy) {
    return firstKickoff(matches, (m) => m.stage === decidedBy);
  }

  // Otherwise `ref` is a match id (expert scoreline): that match's kickoff.
  const match = matches.find((m) => m.id === ref);
  return match?.kickoffAt ? Date.parse(match.kickoffAt) : null;
}

/** Whether `ref` is locked at `now` (its deciding kickoff has passed). */
export function isPickLocked(
  ref: string,
  pickTeamId: string | null,
  matches: Match[],
  teamsById: Map<string, Team>,
  now: number = Date.now(),
): boolean {
  const deadline = deadlineForPick(ref, pickTeamId, matches, teamsById);
  return deadline !== null && now >= deadline;
}

/** A pick whose optional fields may be absent (e.g. a raw submission). */
type PickInput = {
  ref: string;
  pickTeamId?: string | null;
  predHome?: number | null;
  predAway?: number | null;
};

function normalize(p: PickInput): Pick {
  return {
    ref: p.ref,
    pickTeamId: p.pickTeamId ?? null,
    predHome: p.predHome ?? null,
    predAway: p.predAway ?? null,
  };
}

/**
 * Apply the rolling-deadline rules when saving a prediction. The result is the
 * set of picks that may be persisted:
 *  - every *existing* pick that is now locked is preserved exactly as stored
 *    (the player can't rewrite a game that already kicked off), and
 *  - from the submission, only the picks that are *not* locked are taken
 *    (a late entrant can't choose already-decided games).
 *
 * Works for both new entries (`existingPicks: []`) and edits. Because locked
 * picks can only ever be ones written before their deadline, scoring needs no
 * special-casing — an absent pick simply scores 0.
 */
export function applyPickLocks(
  existingPicks: Pick[],
  incomingPicks: PickInput[],
  matches: Match[],
  teamsById: Map<string, Team>,
  now: number = Date.now(),
): Pick[] {
  const locked = (p: PickInput) => isPickLocked(p.ref, p.pickTeamId ?? null, matches, teamsById, now);
  const keptLocked = existingPicks.filter(locked);
  const incomingOpen = incomingPicks.filter((p) => !locked(p)).map(normalize);
  return [...keptLocked, ...incomingOpen];
}
