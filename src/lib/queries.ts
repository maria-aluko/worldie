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

/** The caller's single entry at a level (for prefilling the editor / one-tap join). */
export async function getMyEntry(userId: string, level: Level): Promise<EntryView | null> {
  const [row] = await db
    .select()
    .from(schema.entries)
    .where(and(eq(schema.entries.userId, userId), eq(schema.entries.level, level)))
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
  const third = picks.find((p) => p.ref === "third_place")?.pickTeamId ?? null;
  const goldenBoot = picks.find((p) => p.ref === "golden_boot")?.pickTeamId ?? null;
  const runnerUp = finalists.find((id) => id !== champion) ?? null;
  return {
    champion,
    championTeam: champion ? TEAMS_BY_ID.get(champion) ?? null : null,
    runnerUp,
    runnerUpTeam: runnerUp ? TEAMS_BY_ID.get(runnerUp) ?? null : null,
    third,
    thirdTeam: third ? TEAMS_BY_ID.get(third) ?? null : null,
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
    // Points first; then a deterministic tie-break so equal scores don't jitter
    // between renders.
    .sort(
      (a, b) =>
        b.points - a.points ||
        (a.displayName ?? "").localeCompare(b.displayName ?? "") ||
        a.userId.localeCompare(b.userId),
    );

  return {
    id: g.id,
    name: g.name,
    level: g.level as Level,
    inviteSlug: g.inviteSlug,
    members,
  };
}

export interface MyEntry {
  id: string;
  level: Level;
  slug: string;
  displayName: string | null;
  totalPoints: number;
  championId: string | null;
  championTeam: ReturnType<typeof TEAMS_BY_ID.get> | null;
}

export interface MyGroup {
  id: string;
  name: string;
  level: Level;
  inviteSlug: string;
  memberCount: number;
  myPoints: number;
  rank: number;
}

export interface UserOverview {
  entries: MyEntry[];
  groups: MyGroup[];
}

/** Everything the current player has: their predictions and the groups they're in. */
export async function getUserOverview(userId: string): Promise<UserOverview> {
  // Predictions (at most one per level).
  const entryRows = await db
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.userId, userId))
    .orderBy(schema.entries.level);

  const entryIds = entryRows.map((e) => e.id);
  const champByEntry = new Map<string, string>();
  if (entryIds.length) {
    const champs = await db
      .select({ entryId: schema.entryPicks.entryId, teamId: schema.entryPicks.pickTeamId })
      .from(schema.entryPicks)
      .where(
        and(inArray(schema.entryPicks.entryId, entryIds), eq(schema.entryPicks.ref, "champion")),
      );
    for (const c of champs) if (c.teamId) champByEntry.set(c.entryId, c.teamId);
  }

  const entries: MyEntry[] = entryRows.map((e) => {
    const championId = champByEntry.get(e.id) ?? null;
    return {
      id: e.id,
      level: e.level as Level,
      slug: e.slug,
      displayName: e.displayName,
      totalPoints: e.totalPoints,
      championId,
      championTeam: championId ? TEAMS_BY_ID.get(championId) ?? null : null,
    };
  });

  // Groups the player belongs to.
  const memberships = await db
    .select({
      groupId: schema.groups.id,
      name: schema.groups.name,
      level: schema.groups.level,
      inviteSlug: schema.groups.inviteSlug,
      myEntryId: schema.groupMembers.entryId,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.groups, eq(schema.groupMembers.groupId, schema.groups.id))
    .where(eq(schema.groupMembers.userId, userId));

  const groupIds = memberships.map((m) => m.groupId);
  // Every member's points across those groups → lets us compute size and rank.
  const allMembers = groupIds.length
    ? await db
        .select({
          groupId: schema.groupMembers.groupId,
          points: schema.entries.totalPoints,
        })
        .from(schema.groupMembers)
        .leftJoin(schema.entries, eq(schema.groupMembers.entryId, schema.entries.id))
        .where(inArray(schema.groupMembers.groupId, groupIds))
    : [];

  const pointsByGroup = new Map<string, number[]>();
  for (const r of allMembers) {
    const arr = pointsByGroup.get(r.groupId) ?? [];
    arr.push(r.points ?? 0);
    pointsByGroup.set(r.groupId, arr);
  }

  const entryPointsById = new Map(entryRows.map((e) => [e.id, e.totalPoints]));

  const groups: MyGroup[] = memberships.map((m) => {
    const myPoints = m.myEntryId ? entryPointsById.get(m.myEntryId) ?? 0 : 0;
    const all = pointsByGroup.get(m.groupId) ?? [];
    return {
      id: m.groupId,
      name: m.name,
      level: m.level as Level,
      inviteSlug: m.inviteSlug,
      memberCount: all.length,
      myPoints,
      rank: all.filter((p) => p > myPoints).length + 1,
    };
  });

  return { entries, groups };
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
