import { config } from "dotenv";
config({ path: ".env.local" });

import { notInArray } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { TEAMS } from "../src/lib/data/teams";
import { buildGroupFixtures } from "../src/lib/data/fixtures";

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
  console.log(`Syncing ${TEAMS.length} teams and ${fixtures.length} group matches…`);

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
  });

  console.log("✓ Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
