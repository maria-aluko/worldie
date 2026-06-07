import { config } from "dotenv";
config({ path: ".env.local" });

import { db, schema } from "../src/lib/db";
import { TEAMS } from "../src/lib/data/teams";
import { buildGroupFixtures } from "../src/lib/data/fixtures";

async function main() {
  const fixtures = buildGroupFixtures();
  console.log(`Seeding ${TEAMS.length} teams and ${fixtures.length} group matches…`);

  await db
    .insert(schema.teams)
    .values(TEAMS.map((t) => ({ ...t })))
    .onConflictDoNothing();

  await db
    .insert(schema.matches)
    .values(
      fixtures.map((m) => ({
        id: m.id,
        stage: m.stage,
        group: m.group,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        kickoffAt: m.kickoffAt ? new Date(m.kickoffAt) : null,
        status: m.status,
      })),
    )
    .onConflictDoNothing();

  console.log("✓ Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
