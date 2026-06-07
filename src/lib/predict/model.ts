import type { Level, Match, Pick, Team } from "@/lib/types";

export interface PredictionState {
  /** Standard: group letter -> up to 2 selected team ids. */
  groupTop2: Record<string, string[]>;
  /** Expert: match id -> predicted score. */
  groupScores: Record<string, { h: number; a: number }>;
  /** The 8 best third-placed teams that also qualify for the Round of 32. */
  thirdPlace: string[];
  reach_r16: string[];
  reach_qf: string[];
  reach_sf: string[];
  finalists: string[]; // reach_final (2)
  champion: string | null;
  goldenBoot: string | null;
}

export function emptyState(): PredictionState {
  return {
    groupTop2: {},
    groupScores: {},
    thirdPlace: [],
    reach_r16: [],
    reach_qf: [],
    reach_sf: [],
    finalists: [],
    champion: null,
    goldenBoot: null,
  };
}

export interface GroupRow {
  teamId: string;
  pts: number;
  gd: number;
  gf: number;
  played: number;
}

/** Derive a group table from predicted scorelines (3/1/0, GD, GF, then code). */
export function deriveStandings(
  groupTeams: Team[],
  groupMatches: Match[],
  scores: Record<string, { h: number; a: number }>,
): GroupRow[] {
  const rows = new Map<string, GroupRow>(
    groupTeams.map((t) => [t.id, { teamId: t.id, pts: 0, gd: 0, gf: 0, played: 0 }]),
  );
  for (const m of groupMatches) {
    const s = scores[m.id];
    if (!s || !m.homeTeamId || !m.awayTeamId) continue;
    const home = rows.get(m.homeTeamId)!;
    const away = rows.get(m.awayTeamId)!;
    home.played++;
    away.played++;
    home.gf += s.h;
    away.gf += s.a;
    home.gd += s.h - s.a;
    away.gd += s.a - s.h;
    if (s.h > s.a) home.pts += 3;
    else if (s.a > s.h) away.pts += 3;
    else {
      home.pts += 1;
      away.pts += 1;
    }
  }
  const codeOf = new Map(groupTeams.map((t) => [t.id, t.code]));
  return [...rows.values()].sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      (codeOf.get(a.teamId)! < codeOf.get(b.teamId)! ? -1 : 1),
  );
}

/** The 24 top-2 group qualifiers (before adding the 8 best-third picks). */
function top2Qualifiers(
  level: Level,
  state: PredictionState,
  teams: Team[],
  matches: Match[],
): string[] {
  if (level === "expert") {
    const groups = [...new Set(teams.map((t) => t.group).filter(Boolean))] as string[];
    const out: string[] = [];
    for (const g of groups.sort()) {
      const gTeams = teams.filter((t) => t.group === g);
      const gMatches = matches.filter((m) => m.group === g);
      const table = deriveStandings(gTeams, gMatches, state.groupScores);
      out.push(...table.slice(0, 2).map((r) => r.teamId));
    }
    return out;
  }
  return Object.values(state.groupTop2).flat();
}

/** All 32 Round-of-32 qualifiers: 24 top-2 + 8 best-third-placed. */
export function qualifiers(
  level: Level,
  state: PredictionState,
  teams: Team[],
  matches: Match[],
): string[] {
  return [...top2Qualifiers(level, state, teams, matches), ...state.thirdPlace];
}

/** Candidate pool for the 8 best-third-placed picks.
 *  Expert: 12 derived 3rd-place teams.
 *  Standard: all 24 teams not chosen as top 2 (3rd + 4th per group). */
export function thirdPlaceCandidates(
  level: Level,
  state: PredictionState,
  teams: Team[],
  matches: Match[],
): string[] {
  if (level === "expert") {
    const groups = [...new Set(teams.map((t) => t.group).filter(Boolean))] as string[];
    const out: string[] = [];
    for (const g of groups.sort()) {
      const gTeams = teams.filter((t) => t.group === g);
      const gMatches = matches.filter((m) => m.group === g);
      const table = deriveStandings(gTeams, gMatches, state.groupScores);
      if (table[2]) out.push(table[2].teamId);
    }
    return out;
  }
  const picked = new Set(Object.values(state.groupTop2).flat());
  return teams
    .filter((t) => t.group && !picked.has(t.id))
    .sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "") || a.name.localeCompare(b.name))
    .map((t) => t.id);
}

/** Flatten the working state into DB-ready picks. */
export function flattenToPicks(
  level: Level,
  state: PredictionState,
  teams: Team[],
  matches: Match[],
): Pick[] {
  const picks: Pick[] = [];
  const add = (ref: string, teamId: string | null) =>
    picks.push({ ref, pickTeamId: teamId, predHome: null, predAway: null });

  // standard + expert: top-2 → reach_r32, 8 best-third → reach_r32_third
  top2Qualifiers(level, state, teams, matches).forEach((id) => add("reach_r32", id));
  state.thirdPlace.forEach((id) => add("reach_r32_third", id));
  state.reach_r16.forEach((id) => add("reach_r16", id));
  state.reach_qf.forEach((id) => add("reach_qf", id));
  state.reach_sf.forEach((id) => add("reach_sf", id));
  state.finalists.forEach((id) => add("reach_final", id));
  if (state.champion) add("champion", state.champion);
  if (state.goldenBoot) add("golden_boot", state.goldenBoot);

  if (level === "expert") {
    for (const [matchId, s] of Object.entries(state.groupScores)) {
      picks.push({ ref: matchId, pickTeamId: null, predHome: s.h, predAway: s.a });
    }
  }
  return picks;
}

/** Rebuild working state from stored picks — used to prefill the editor. */
export function unflattenPicks(
  level: Level,
  picks: Pick[],
  teams: Team[],
  matches: Match[],
): PredictionState {
  const state = emptyState();
  const groupOf = new Map(teams.map((t) => [t.id, t.group]));
  const matchIds = new Set(matches.map((m) => m.id));

  for (const p of picks) {
    switch (p.ref) {
      case "reach_r32":
        // Standard players choose group qualifiers directly; expert derives them
        // from scorelines, so only rehydrate groupTop2 for standard.
        if (level === "standard" && p.pickTeamId) {
          const g = groupOf.get(p.pickTeamId);
          if (g) (state.groupTop2[g] ??= []).push(p.pickTeamId);
        }
        break;
      case "reach_r32_third":
        if (p.pickTeamId) state.thirdPlace.push(p.pickTeamId);
        break;
      case "reach_r16":
        if (p.pickTeamId) state.reach_r16.push(p.pickTeamId);
        break;
      case "reach_qf":
        if (p.pickTeamId) state.reach_qf.push(p.pickTeamId);
        break;
      case "reach_sf":
        if (p.pickTeamId) state.reach_sf.push(p.pickTeamId);
        break;
      case "reach_final":
        if (p.pickTeamId) state.finalists.push(p.pickTeamId);
        break;
      case "champion":
        state.champion = p.pickTeamId ?? null;
        break;
      case "golden_boot":
        state.goldenBoot = p.pickTeamId ?? null;
        break;
      default:
        if (matchIds.has(p.ref) && p.predHome != null && p.predAway != null) {
          state.groupScores[p.ref] = { h: p.predHome, a: p.predAway };
        }
    }
  }
  return state;
}
