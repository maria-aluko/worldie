import type { Match } from "../types";
import { TEAMS } from "./teams";
import { GROUP_LETTERS } from "../constants";

/**
 * Generate the 72 group-stage matches (round-robin, 6 per group) with kickoff
 * times spread from the tournament opener. Knockout matches are created later
 * from the live feed once participants are known.
 */
export function buildGroupFixtures(): Match[] {
  const matches: Match[] = [];
  // 4-team round-robin pairings by index.
  const rounds: [number, number][][] = [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [3, 1],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ];

  const start = new Date("2026-06-11T17:00:00Z").getTime();
  const hours = 60 * 60 * 1000;
  let slot = 0;

  for (const g of GROUP_LETTERS) {
    const groupTeams = TEAMS.filter((t) => t.group === g);
    rounds.forEach((round, r) => {
      round.forEach(([a, b], i) => {
        const kickoff = new Date(start + slot * 6 * hours);
        matches.push({
          id: `M-${g}-${r + 1}-${i + 1}`,
          stage: "group",
          group: g,
          homeTeamId: groupTeams[a].id,
          awayTeamId: groupTeams[b].id,
          kickoffAt: kickoff.toISOString(),
          status: "scheduled",
          homeScore: null,
          awayScore: null,
        });
        slot++;
      });
    });
  }

  return matches;
}
