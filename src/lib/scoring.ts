import type { Match, Pick, Stage } from "./types";

/**
 * Hybrid scoring. Two kinds of picks:
 *  1. ADVANCEMENT — "team reaches stage X" (refs: reach_r32 / reach_r16 /
 *     reach_qf / reach_sf / reach_final / champion). Scored when results confirm
 *     the team actually reached that stage. Escalating reward by depth.
 *  2. MATCH SCORELINE — group-stage matches (Expert). Base points for the
 *     correct winner + a bonus for the exact scoreline.
 *  Plus structural awards (Golden Boot, etc.).
 *
 * All values are tunable here in one place.
 */
export const SCORING = {
  // Advancement: points for correctly sending a team to each stage.
  reach: {
    reach_r32: 2,
    reach_r16: 4,
    reach_qf: 7,
    reach_sf: 12,
    reach_final: 18,
  } as Record<string, number>,
  champion: 30,
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

/** The champion is the winner of the (finished) final. */
export function actualChampion(matches: Match[]): string | null {
  const final = matches.find((m) => m.stage === "final" && m.status === "finished");
  if (!final || final.homeScore == null || final.awayScore == null) return null;
  return final.homeScore > final.awayScore ? final.homeTeamId : final.awayTeamId;
}

/** Score one player's picks against current results. */
export function scorePicks(
  picks: Pick[],
  matches: Match[],
  opts: { goldenBoot?: string | null } = {},
): ScoredPick[] {
  const reached = teamsReachedByStage(matches);
  const champion = actualChampion(matches);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const out: ScoredPick[] = [];

  for (const p of picks) {
    // Advancement picks.
    if (p.ref in SCORING.reach) {
      const ok = p.pickTeamId ? reached[p.ref]?.has(p.pickTeamId) : false;
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
