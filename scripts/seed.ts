import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { TEAMS } from "../src/lib/data/teams";
import { buildGroupFixtures } from "../src/lib/data/fixtures";
import { buildPaniniWc2026 } from "../src/lib/data/panini-wc2026";
import { NO_TIER } from "../src/lib/types";

/**
 * Seed (and re-sync) the reference data: the 48-team field and the 72 group
 * fixtures. Idempotent and self-healing — running it always converges the DB to
 * exactly what `teams.ts` / `buildGroupFixtures()` define:
 *  - teams are upserted, and any team NOT in teams.ts is pruned (so an older
 *    field can't linger),
 *  - matches are upserted by id (so changed group draws/kickoffs are corrected),
 *    while live status/scores are preserved.
 * Player data (users, entries, picks, groups) is never touched.
 */
async function main() {
  const fixtures = buildGroupFixtures();
  const teamIds = TEAMS.map((t) => t.id);
  const album = buildPaniniWc2026();
  console.log(
    `Syncing ${TEAMS.length} teams, ${fixtures.length} group matches, ` +
      `and ${album.stickers.length} stickers…`,
  );

  await db.transaction(async (tx) => {
    // Teams: upsert the canonical field…
    for (const t of TEAMS) {
      await tx
        .insert(schema.teams)
        .values({ ...t })
        .onConflictDoUpdate({
          target: schema.teams.id,
          set: { name: t.name, code: t.code, flag: t.flag, group: t.group },
        });
    }
    // …then drop any team that's no longer part of it.
    const pruned = await tx
      .delete(schema.teams)
      .where(notInArray(schema.teams.id, teamIds))
      .returning({ id: schema.teams.id });
    if (pruned.length) console.log(`Pruned ${pruned.length} stale teams: ${pruned.map((p) => p.id).join(", ")}`);

    // Matches: upsert structural fields + kickoff; keep any live status/scores.
    for (const m of fixtures) {
      const values = {
        id: m.id,
        stage: m.stage,
        group: m.group,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        kickoffAt: m.kickoffAt ? new Date(m.kickoffAt) : null,
        status: m.status,
      };
      await tx
        .insert(schema.matches)
        .values(values)
        .onConflictDoUpdate({
          target: schema.matches.id,
          set: {
            stage: values.stage,
            group: values.group,
            homeTeamId: values.homeTeamId,
            awayTeamId: values.awayTeamId,
            kickoffAt: values.kickoffAt,
          },
        });
    }

    // Sticker album: upsert the set + checklist by code; preserve player status.
    await tx
      .insert(schema.stickerSets)
      .values({
        id: album.id,
        name: album.name,
        season: album.season,
        totalCount: album.stickers.length,
      })
      .onConflictDoUpdate({
        target: schema.stickerSets.id,
        set: { name: album.name, season: album.season, totalCount: album.stickers.length },
      });

    const stickerRows = album.stickers.map((s, i) => ({
      setId: album.id,
      code: s.code,
      label: s.label,
      section: s.section,
      teamId: s.teamId,
      tier: s.tier ?? NO_TIER,
      sortOrder: i,
    }));
    await tx
      .insert(schema.stickers)
      .values(stickerRows)
      .onConflictDoUpdate({
        target: [schema.stickers.setId, schema.stickers.code, schema.stickers.tier],
        set: {
          label: sql`excluded.label`,
          section: sql`excluded.section`,
          teamId: sql`excluded.team_id`,
          sortOrder: sql`excluded.sort_order`,
        },
      });

    // …then drop any sticker no longer in the checklist, keyed by code+tier so
    // older single-finish Extra rows are cleaned up after re-tiering.
    const key = (code: string, tier: string) => `${code}|${tier}`;
    const validKeys = new Set(album.stickers.map((s) => key(s.code, s.tier ?? NO_TIER)));
    const existing = await tx
      .select({ id: schema.stickers.id, code: schema.stickers.code, tier: schema.stickers.tier })
      .from(schema.stickers)
      .where(eq(schema.stickers.setId, album.id));
    const staleIds = existing.filter((s) => !validKeys.has(key(s.code, s.tier))).map((s) => s.id);
    if (staleIds.length) {
      await tx
        .delete(schema.stickers)
        .where(and(eq(schema.stickers.setId, album.id), inArray(schema.stickers.id, staleIds)));
      console.log(`Pruned ${staleIds.length} stale stickers.`);
    }
  });

  console.log("✓ Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
