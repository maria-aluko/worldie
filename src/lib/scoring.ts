import type { Match, Pick, Stage, Team } from "./types";
import { deriveStandings } from "./predict/model";

/**
 * Hybrid scoring. Kinds of picks:
 *  1. ADVANCEMENT — "team reaches stage X" (refs: reach_r32 / reach_r16 /
 *     reach_qf / reach_sf / reach_final / champion). Scored when results confirm
 *     the team actually reached that stage. Escalating reward by depth.
 *  2. GROUP POSITION — "team finishes Nth in its group" (refs: group_pos:{g}:{n}).
 *     A bonus for landing a team in its exact final group position. Both levels.
 *  3. MATCH SCORELINE — group-stage matches (Expert). Base points for the
 *     correct winner + a bonus for the exact scoreline.
 *  Plus structural awards (Golden Boot, etc.).
 *
 * All values are tunable here in one place.
 */
export const SCORING = {
  // Advancement: points for correctly sending a team to each stage.
  reach: {
    reach_r32: 2,
    reach_r32_third: 2,
    reach_r16: 4,
    reach_qf: 7,
    reach_sf: 12,
    reach_final: 18,
  } as Record<string, number>,
  champion: 30,
  runnerUp: 18,
  thirdPlace: 10,
  // Exact group-table position (both levels), on top of advancement points.
  groupPosition: 2,
  // Match scoreline (group stage).
  groupWinner: 3,
  exactScoreBonus: 2,
  // Awards.
  goldenBoot: 12,
} as const;

export type ReachRef = keyof typeof SCORING.reach | "champion";

export const REACH_STAGES: { ref: string; label: string; count: number; from: Stage }[] = [
  { ref: "reach_r32", label: "Round of 32", count: 32, from: "r32" },
  { ref: "reach_r16", label: "Round of 16", count: 16, from: "r16" },
  { ref: "reach_qf", label: "Quarter-finals", count: 8, from: "qf" },
  { ref: "reach_sf", label: "Semi-finals", count: 4, from: "sf" },
  { ref: "reach_final", label: "Final", count: 2, from: "final" },
];

export interface ScoredPick {
  ref: string;
  pickTeamId: string | null;
  points: number;
  detail: string;
}

function winnerSide(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Compute, from finished matches, the set of teams that actually reached each
 * stage. A team "reached" stage S if it appears in any match of stage S.
 */
export function teamsReachedByStage(matches: Match[]): Record<string, Set<string>> {
  const reached: Record<string, Set<string>> = {};
  const stageToRef: Partial<Record<Stage, string>> = {
    r32: "reach_r32",
    r16: "reach_r16",
    qf: "reach_qf",
    sf: "reach_sf",
    final: "reach_final",
  };
  for (const m of matches) {
    const ref = stageToRef[m.stage];
    if (!ref) continue;
    (reached[ref] ??= new Set());
    if (m.homeTeamId) reached[ref].add(m.homeTeamId);
    if (m.awayTeamId) reached[ref].add(m.awayTeamId);
  }
  return reached;
}

/**
 * From real results, the final group-table position (1..4) of every team, for
 * groups whose six group matches have ALL finished (partial groups are skipped,
 * so positions don't score prematurely). Reuses the same pts→GD→GF→code tiebreak
 * as the predictor's live tables — an approximation of FIFA's head-to-head rules,
 * which is fine for the game.
 */
export function actualGroupStandings(matches: Match[], teams: Team[]): Map<string, number> {
  const pos = new Map<string, number>();
  const groups = [...new Set(teams.map((t) => t.group).filter(Boolean))] as string[];
  for (const g of groups) {
    const gMatches = matches.filter((m) => m.stage === "group" && m.group === g);
    const finished = gMatches.filter(
      (m) => m.status === "finished" && m.homeScore != null && m.awayScore != null,
    );
    if (finished.length === 0 || finished.length < gMatches.length) continue;
    const scores: Record<string, { h: number; a: number }> = {};
    for (const m of finished) scores[m.id] = { h: m.homeScore!, a: m.awayScore! };
    const gTeams = teams.filter((t) => t.group === g);
    deriveStandings(gTeams, gMatches, scores).forEach((r, i) => pos.set(r.teamId, i + 1));
  }
  return pos;
}

/** The champion is the winner of the (finished) final. */
export function actualChampion(matches: Match[]): string | null {
  const final = matches.find((m) => m.stage === "final" && m.status === "finished");
  if (!final || final.homeScore == null || final.awayScore == null) return null;
  return final.homeScore > final.awayScore ? final.homeTeamId : final.awayTeamId;
}

/** The runner-up is the loser of the (finished) final. */
export function actualRunnerUp(matches: Match[]): string | null {
  const final = matches.find((m) => m.stage === "final" && m.status === "finished");
  if (!final || final.homeScore == null || final.awayScore == null) return null;
  return final.homeScore > final.awayScore ? final.awayTeamId : final.homeTeamId;
}

/** Third place is the winner of the (finished) third-place playoff. */
export function actualThirdPlace(matches: Match[]): string | null {
  const m = matches.find((x) => x.stage === "third" && x.status === "finished");
  if (!m || m.homeScore == null || m.awayScore == null) return null;
  return m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
}

/** Score one player's picks against current results. */
export function scorePicks(
  picks: Pick[],
  matches: Match[],
  teams: Team[],
  opts: { goldenBoot?: string | null } = {},
): ScoredPick[] {
  const reached = teamsReachedByStage(matches);
  const champion = actualChampion(matches);
  const runnerUp = actualRunnerUp(matches);
  const thirdPlace = actualThirdPlace(matches);
  const groupPos = actualGroupStandings(matches, teams);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const out: ScoredPick[] = [];

  for (const p of picks) {
    // Exact group-table position, ref === "group_pos:{group}:{n}".
    if (p.ref.startsWith("group_pos:")) {
      const n = Number(p.ref.split(":")[2]);
      const ok = p.pickTeamId != null && groupPos.get(p.pickTeamId) === n;
      out.push({
        ref: p.ref,
        pickTeamId: p.pickTeamId,
        points: ok ? SCORING.groupPosition : 0,
        detail: ok ? `exact spot +${SCORING.groupPosition}` : "",
      });
      continue;
    }

    // Advancement picks.
    if (p.ref in SCORING.reach) {
      // best-third picks are scored against the same reached set as top-2 qualifiers
      const reachKey = p.ref === "reach_r32_third" ? "reach_r32" : p.ref;
      const ok = p.pickTeamId ? reached[reachKey]?.has(p.pickTeamId) : false;
      const value = SCORING.reach[p.ref];
      out.push({
        ref: p.ref,
        pickTeamId: p.pickTeamId,
        points: ok ? value : 0,
        detail: ok ? `reached +${value}` : "",
      });
      continue;
    }

    // Champion.
    if (p.ref === "champion") {
      const ok = champion != null && p.pickTeamId === champion;
      out.push({
        ref: p.ref,
        pickTeamId: p.pickTeamId,
        points: ok ? SCORING.champion : 0,
        detail: ok ? `champion +${SCORING.champion}` : "",
      });
      continue;
    }

    // Runner-up (loser of the final).
    if (p.ref === "runner_up") {
      const ok = runnerUp != null && p.pickTeamId === runnerUp;
      out.push({
        ref: p.ref,
        pickTeamId: p.pickTeamId,
        points: ok ? SCORING.runnerUp : 0,
        detail: ok ? `runner-up +${SCORING.runnerUp}` : "",
      });
      continue;
    }

    // Third place (winner of the 3rd-place playoff).
    if (p.ref === "third_place") {
      const ok = thirdPlace != null && p.pickTeamId === thirdPlace;
      out.push({
        ref: p.ref,
        pickTeamId: p.pickTeamId,
        points: ok ? SCORING.thirdPlace : 0,
        detail: ok ? `third place +${SCORING.thirdPlace}` : "",
      });
      continue;
    }

    // Golden boot.
    if (p.ref === "golden_boot") {
      const ok = opts.goldenBoot != null && p.pickTeamId === opts.goldenBoot;
      out.push({
        ref: p.ref,
        pickTeamId: p.pickTeamId,
        points: ok ? SCORING.goldenBoot : 0,
        detail: ok ? `golden boot +${SCORING.goldenBoot}` : "",
      });
      continue;
    }

    // Match scoreline (group stage), ref === match id.
    const m = matchById.get(p.ref);
    if (m && m.status === "finished" && m.homeScore != null && m.awayScore != null) {
      let points = 0;
      const parts: string[] = [];
      if (p.predHome != null && p.predAway != null) {
        if (winnerSide(p.predHome, p.predAway) === winnerSide(m.homeScore, m.awayScore)) {
          points += SCORING.groupWinner;
          parts.push(`winner +${SCORING.groupWinner}`);
          if (p.predHome === m.homeScore && p.predAway === m.awayScore) {
            points += SCORING.exactScoreBonus;
            parts.push(`exact +${SCORING.exactScoreBonus}`);
          }
        }
      }
      out.push({ ref: p.ref, pickTeamId: p.pickTeamId, points, detail: parts.join(", ") });
    }
  }

  return out;
}

export function totalPoints(scored: ScoredPick[]): number {
  return scored.reduce((s, p) => s + p.points, 0);
}
