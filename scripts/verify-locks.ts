/**
 * Integration check for rolling prediction locks against the LIVE database.
 * READ-ONLY: reads your real matches/teams, then back-dates one group's opener
 * *in memory only* (no DB writes) to simulate a kicked-off group, and verifies
 * the real loadMatches() -> applyPickLocks() pipeline:
 *   - an existing player's locked group pick is preserved,
 *   - a late entrant cannot set that locked group pick,
 *   - picks for a still-open group flow through normally.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db, schema } from "../src/lib/db";
import { applyPickLocks, isPickLocked } from "../src/lib/predict/locks";
import type { Match, Pick, Team } from "../src/lib/types";

// Read matches/teams directly (mirrors loadMatches/loadTeams, but without the
// Next-only `server-only` import that a plain script can't resolve).
async function loadMatches(): Promise<Match[]> {
  const rows = await db.select().from(schema.matches);
  return rows.map((m) => ({
    id: m.id,
    stage: m.stage as Match["stage"],
    group: m.group,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    kickoffAt: m.kickoffAt?.toISOString() ?? null,
    status: m.status as Match["status"],
    homeScore: m.homeScore,
    awayScore: m.awayScore,
  }));
}
async function loadTeams(): Promise<Team[]> {
  const rows = await db.select().from(schema.teams);
  return rows.map((t) => ({ id: t.id, name: t.name, code: t.code, flag: t.flag, group: t.group }));
}

const PAST_ISO = "2020-01-01T00:00:00Z";
let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  if (!cond) failures++;
}

async function main() {
  const teamsById = new Map((await loadTeams()).map((t) => [t.id, t]));

  // Real matches, straight from your DB (read-only).
  const realMatches = await loadMatches();
  const aMatch = realMatches.find((m) => m.stage === "group" && m.group === "A");
  if (!aMatch) throw new Error("No group A match found — run `npm run db:seed` first.");

  // 1. Baseline against the real schedule: with the seeded opener on 2026-06-11,
  //    nothing should be locked yet.
  const now = Date.now();
  check(
    "baseline: group A is not locked under the real (future) schedule",
    !isPickLocked("group_pos:A:1", null, realMatches, teamsById, now),
  );

  // 2. Simulate group A having kicked off — IN MEMORY ONLY, no DB write. The
  //    lock uses the group's earliest kickoff, so back-date all of group A.
  const matches: Match[] = realMatches.map((m) =>
    m.stage === "group" && m.group === "A" ? { ...m, kickoffAt: PAST_ISO } : m,
  );

  check(
    "group A ranking is locked once its opener has kicked off",
    isPickLocked("group_pos:A:1", null, matches, teamsById, now),
  );
  check(
    "group B ranking stays open",
    !isPickLocked("group_pos:B:1", null, matches, teamsById, now),
  );

  const teamA = [...teamsById.values()].find((t) => t.group === "A")!;
  const teamB = [...teamsById.values()].find((t) => t.group === "B")!;
  const otherA = [...teamsById.values()].find((t) => t.group === "A" && t.id !== teamA.id)!;

  // 3a. Existing player edits: the locked group-A pick is preserved even though
  //     the submission tries to rewrite it; the open group-B pick applies.
  const existing: Pick[] = [
    { ref: "group_pos:A:1", pickTeamId: teamA.id, predHome: null, predAway: null },
    { ref: "group_pos:B:1", pickTeamId: teamB.id, predHome: null, predAway: null },
  ];
  const incomingEdit: Pick[] = [
    { ref: "group_pos:A:1", pickTeamId: otherA.id, predHome: null, predAway: null }, // rewrite attempt
    { ref: "group_pos:B:1", pickTeamId: teamB.id, predHome: null, predAway: null },
  ];
  const merged = applyPickLocks(existing, incomingEdit, matches, teamsById, now);
  check(
    "edit preserves the original locked group-A pick",
    merged.find((p) => p.ref === "group_pos:A:1")?.pickTeamId === teamA.id,
  );
  check(
    "edit still applies the open group-B pick",
    merged.some((p) => p.ref === "group_pos:B:1" && p.pickTeamId === teamB.id),
  );

  // 3b. New entrant: cannot set the locked group-A pick; open group-B accepted.
  const newEntrant = applyPickLocks([], incomingEdit, matches, teamsById, now);
  check(
    "new entrant cannot set the locked group-A pick",
    !newEntrant.some((p) => p.ref === "group_pos:A:1"),
  );
  check(
    "new entrant can set the open group-B pick",
    newEntrant.some((p) => p.ref === "group_pos:B:1"),
  );

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
