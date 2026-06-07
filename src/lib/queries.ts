import "server-only";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Entry, Level, Pick } from "@/lib/types";
import { TEAMS_BY_ID } from "@/lib/data/teams";

export interface EntryView {
  entry: Entry;
  picks: Pick[];
}

function toEntry(row: typeof schema.entries.$inferSelect): Entry {
  return {
    id: row.id,
    userId: row.userId,
    level: row.level as Level,
    slug: row.slug,
    displayName: row.displayName,
    createdAt: row.createdAt.toISOString(),
    lockedAt: row.lockedAt?.toISOString() ?? null,
    totalPoints: row.totalPoints,
  };
}

export async function getEntryBySlug(slug: string): Promise<EntryView | null> {
  const [row] = await db
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.slug, slug))
    .limit(1);
  if (!row) return null;

  const pickRows = await db
    .select()
    .from(schema.entryPicks)
    .where(eq(schema.entryPicks.entryId, row.id));

  const picks: Pick[] = pickRows.map((p) => ({
    ref: p.ref,
    pickTeamId: p.pickTeamId,
    predHome: p.predHome,
    predAway: p.predAway,
  }));

  return { entry: toEntry(row), picks };
}

/** Convenience: the headline picks used on cards/leaderboards. */
export function summarize(picks: Pick[]) {
  const champion = picks.find((p) => p.ref === "champion")?.pickTeamId ?? null;
  const finalists = picks.filter((p) => p.ref === "reach_final").map((p) => p.pickTeamId!);
  const semis = picks.filter((p) => p.ref === "reach_sf").map((p) => p.pickTeamId!);
  const goldenBoot = picks.find((p) => p.ref === "golden_boot")?.pickTeamId ?? null;
  return {
    champion,
    championTeam: champion ? TEAMS_BY_ID.get(champion) ?? null : null,
    finalists,
    finalistTeams: finalists.map((id) => TEAMS_BY_ID.get(id)).filter(Boolean),
    semis,
    goldenBoot,
    goldenBootTeam: goldenBoot ? TEAMS_BY_ID.get(goldenBoot) ?? null : null,
  };
}

/** Crowd distribution for a given ref (e.g. "champion"), cached upstream. */
export async function pickDistribution(
  ref: string,
): Promise<{ teamId: string; count: number }[]> {
  const rows = await db
    .select({
      teamId: schema.entryPicks.pickTeamId,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.entryPicks)
    .where(eq(schema.entryPicks.ref, ref))
    .groupBy(schema.entryPicks.pickTeamId)
    .orderBy(desc(sql`count(*)`));
  return rows
    .filter((r) => r.teamId)
    .map((r) => ({ teamId: r.teamId as string, count: r.count }));
}

export async function totalEntries(): Promise<number> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(schema.entries);
  return row?.c ?? 0;
}

export interface GroupMemberView {
  userId: string;
  displayName: string | null;
  entryId: string | null;
  level: Level | null;
  championId: string | null;
  points: number;
}

export interface GroupView {
  id: string;
  name: string;
  level: Level;
  inviteSlug: string;
  members: GroupMemberView[];
}

export async function getGroupBySlug(slug: string): Promise<GroupView | null> {
  const [g] = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.inviteSlug, slug))
    .limit(1);
  if (!g) return null;

  const rows = await db
    .select({
      userId: schema.groupMembers.userId,
      entryId: schema.groupMembers.entryId,
      displayName: schema.entries.displayName,
      level: schema.entries.level,
      points: schema.entries.totalPoints,
    })
    .from(schema.groupMembers)
    .leftJoin(schema.entries, eq(schema.groupMembers.entryId, schema.entries.id))
    .where(eq(schema.groupMembers.groupId, g.id));

  const entryIds = rows.map((r) => r.entryId).filter(Boolean) as string[];
  const champById = new Map<string, string>();
  if (entryIds.length) {
    const champs = await db
      .select({ entryId: schema.entryPicks.entryId, teamId: schema.entryPicks.pickTeamId })
      .from(schema.entryPicks)
      .where(
        and(inArray(schema.entryPicks.entryId, entryIds), eq(schema.entryPicks.ref, "champion")),
      );
    for (const c of champs) if (c.teamId) champById.set(c.entryId, c.teamId);
  }

  const members: GroupMemberView[] = rows
    .map((r) => ({
      userId: r.userId,
      displayName: r.displayName ?? null,
      entryId: r.entryId,
      level: (r.level as Level) ?? null,
      championId: r.entryId ? champById.get(r.entryId) ?? null : null,
      points: r.points ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  return {
    id: g.id,
    name: g.name,
    level: g.level as Level,
    inviteSlug: g.inviteSlug,
    members,
  };
}

/** Leaderboard rows for a set of entry ids (used by groups). */
export async function entriesByIds(ids: string[]): Promise<Entry[]> {
  if (!ids.length) return [];
  const rows = await db
    .select()
    .from(schema.entries)
    .where(inArray(schema.entries.id, ids))
    .orderBy(desc(schema.entries.totalPoints));
  return rows.map(toEntry);
}
