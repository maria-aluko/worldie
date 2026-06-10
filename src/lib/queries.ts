import "server-only";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Entry, Level, Pick, StickerStatus, Tier } from "@/lib/types";
import { NO_TIER } from "@/lib/types";
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

/* ------------------------------- Sticker album ---------------------------- */

export interface AlbumStickerView {
  id: string;
  code: string;
  label: string | null;
  tier: Tier | null; // finish for Extra Stickers; null otherwise
  status: StickerStatus; // "not_owned" when the player has no row
  count: number; // copies held (0 when not owned / desired)
}

export interface AlbumSectionView {
  section: string;
  teamId: string | null;
  stickers: AlbumStickerView[];
}

export interface AlbumProgress {
  total: number;
  /** Distinct stickers owned (copies ≥ 1). */
  collected: number;
  /** Spare copies available to swap = Σ(copies − 1) over owned stickers. */
  spares: number;
  /** Wanted-but-not-owned. */
  desired: number;
}

export interface AlbumView {
  set: { id: string; name: string; season: string | null; totalCount: number };
  sections: AlbumSectionView[];
  progress: AlbumProgress;
}

/**
 * The full album for `setId`, grouped into sections in checklist order, with the
 * player's per-sticker status folded in (absent rows default to "not_owned").
 * Pass `userId = null` for a logged-out preview (everything not owned).
 */
export async function getAlbum(setId: string, userId: string | null): Promise<AlbumView | null> {
  const [set] = await db
    .select()
    .from(schema.stickerSets)
    .where(eq(schema.stickerSets.id, setId))
    .limit(1);
  if (!set) return null;

  const stickerRows = await db
    .select()
    .from(schema.stickers)
    .where(eq(schema.stickers.setId, setId))
    .orderBy(schema.stickers.sortOrder);

  const ownedBySticker = new Map<string, { status: StickerStatus; count: number }>();
  if (userId) {
    const rows = await db
      .select({
        stickerId: schema.userStickers.stickerId,
        status: schema.userStickers.status,
        count: schema.userStickers.count,
      })
      .from(schema.userStickers)
      .innerJoin(schema.stickers, eq(schema.userStickers.stickerId, schema.stickers.id))
      .where(and(eq(schema.userStickers.userId, userId), eq(schema.stickers.setId, setId)));
    for (const r of rows)
      ownedBySticker.set(r.stickerId, { status: r.status as StickerStatus, count: r.count });
  }

  const progress: AlbumProgress = {
    total: stickerRows.length,
    collected: 0,
    spares: 0,
    desired: 0,
  };
  const sections: AlbumSectionView[] = [];
  let current: AlbumSectionView | null = null;

  for (const s of stickerRows) {
    const owned = ownedBySticker.get(s.id);
    const status = owned?.status ?? "not_owned";
    const count = owned?.count ?? 0;
    if (status === "owned") {
      progress.collected++;
      progress.spares += Math.max(0, count - 1);
    } else if (status === "desired") progress.desired++;

    if (!current || current.section !== s.section) {
      current = { section: s.section, teamId: s.teamId, stickers: [] };
      sections.push(current);
    }
    const tier = s.tier === NO_TIER ? null : (s.tier as Tier);
    current.stickers.push({ id: s.id, code: s.code, label: s.label, tier, status, count });
  }

  return {
    set: { id: set.id, name: set.name, season: set.season, totalCount: set.totalCount },
    sections,
    progress,
  };
}

export interface AlbumSummary {
  id: string;
  name: string;
  season: string | null;
  total: number;
  collected: number;
  /** Spare copies available to swap = Σ(copies − 1) over owned stickers. */
  spares: number;
  desired: number;
}

/** Lightweight per-set progress for the album hub (no per-sticker detail). */
export async function getAlbumOverview(userId: string | null): Promise<AlbumSummary[]> {
  const sets = await db.select().from(schema.stickerSets).orderBy(schema.stickerSets.id);
  if (!sets.length) return [];

  const totals = await db
    .select({ setId: schema.stickers.setId, count: sql<number>`count(*)::int` })
    .from(schema.stickers)
    .groupBy(schema.stickers.setId);
  const totalBySet = new Map(totals.map((t) => [t.setId, t.count]));

  const counts = userId
    ? await db
        .select({
          setId: schema.stickers.setId,
          status: schema.userStickers.status,
          stickers: sql<number>`count(*)::int`,
          copies: sql<number>`coalesce(sum(${schema.userStickers.count}), 0)::int`,
        })
        .from(schema.userStickers)
        .innerJoin(schema.stickers, eq(schema.userStickers.stickerId, schema.stickers.id))
        .where(eq(schema.userStickers.userId, userId))
        .groupBy(schema.stickers.setId, schema.userStickers.status)
    : [];

  // collected = owned stickers; spares = Σ(copies−1) over owned = ownedCopies − ownedStickers.
  const bySet = new Map<string, { collected: number; spares: number; desired: number }>();
  for (const c of counts) {
    const agg = bySet.get(c.setId) ?? { collected: 0, spares: 0, desired: 0 };
    if (c.status === "owned") {
      agg.collected = c.stickers;
      agg.spares = c.copies - c.stickers;
    } else if (c.status === "desired") agg.desired = c.stickers;
    bySet.set(c.setId, agg);
  }

  return sets.map((s) => {
    const agg = bySet.get(s.id) ?? { collected: 0, spares: 0, desired: 0 };
    return {
      id: s.id,
      name: s.name,
      season: s.season,
      total: totalBySet.get(s.id) ?? s.totalCount,
      collected: agg.collected,
      spares: agg.spares,
      desired: agg.desired,
    };
  });
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
