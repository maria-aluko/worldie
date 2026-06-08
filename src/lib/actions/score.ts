import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Match, Team } from "@/lib/types";
import { scorePicks, totalPoints } from "@/lib/scoring";

/** Load all matches as domain objects. */
export async function loadMatches(): Promise<Match[]> {
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

/** Load all teams as domain objects (needed for group-position scoring). */
export async function loadTeams(): Promise<Team[]> {
  const rows = await db.select().from(schema.teams);
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    flag: t.flag,
    group: t.group,
  }));
}

/**
 * Recompute every entry's points against current results and persist
 * `entries.total_points` (and per-pick points). Idempotent.
 */
export async function recomputeAllScores(): Promise<{ entries: number }> {
  const matches = await loadMatches();
  const teams = await loadTeams();

  const entries = await db
    .select({ id: schema.entries.id })
    .from(schema.entries);

  let count = 0;
  for (const e of entries) {
    const pickRows = await db
      .select()
      .from(schema.entryPicks)
      .where(eq(schema.entryPicks.entryId, e.id));

    const scored = scorePicks(
      pickRows.map((p) => ({
        ref: p.ref,
        pickTeamId: p.pickTeamId,
        predHome: p.predHome,
        predAway: p.predAway,
      })),
      matches,
      teams,
    );
    const scoreByKey = new Map(scored.map((s) => [`${s.ref}|${s.pickTeamId ?? ""}`, s.points]));

    // Persist per-pick points (only where changed-ish; simple loop for v1).
    for (const p of pickRows) {
      const pts = scoreByKey.get(`${p.ref}|${p.pickTeamId ?? ""}`) ?? 0;
      if (pts !== p.points) {
        await db
          .update(schema.entryPicks)
          .set({ points: pts })
          .where(eq(schema.entryPicks.id, p.id));
      }
    }

    await db
      .update(schema.entries)
      .set({ totalPoints: totalPoints(scored) })
      .where(eq(schema.entries.id, e.id));
    count++;
  }

  return { entries: count };
}

/** Lock all entries once the tournament has kicked off. */
export async function lockEntries(): Promise<void> {
  await db
    .update(schema.entries)
    .set({ lockedAt: sql`now()` })
    .where(sql`${schema.entries.lockedAt} is null`);
}
