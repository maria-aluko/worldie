import "server-only";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import type { Stage } from "@/lib/types";

/**
 * Sync results from football-data.org (free tier).
 * Docs: https://www.football-data.org/documentation/quickstart
 * Competition "WC" = FIFA World Cup. Free tier scores are slightly delayed,
 * which is fine: we score on finished results.
 *
 * Our seed teams are illustrative, so this maps feed teams to our teams by
 * 3-letter code (FIFA "tla"); unmatched matches are upserted by external id so
 * knockout participants still flow into advancement scoring once codes align.
 */
const FD_BASE = "https://api.football-data.org/v4";

interface FdMatch {
  id: number;
  stage: string;
  group: string | null;
  status: string;
  utcDate: string;
  homeTeam: { tla?: string | null };
  awayTeam: { tla?: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
}

const STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: "group",
  LAST_32: "r32",
  ROUND_OF_16: "r16",
  LAST_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  THIRD_PLACE: "third",
  FINAL: "final",
};

const STATUS_MAP: Record<string, "scheduled" | "live" | "finished"> = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "live",
  PAUSED: "live",
  FINISHED: "finished",
};

export async function syncResultsFromFeed(): Promise<{ updated: number; skipped: boolean }> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return { updated: 0, skipped: true };

  const res = await fetch(`${FD_BASE}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    console.error("football-data fetch failed", res.status);
    return { updated: 0, skipped: true };
  }
  const data = (await res.json()) as { matches: FdMatch[] };

  let updated = 0;
  for (const m of data.matches ?? []) {
    const stage = STAGE_MAP[m.stage] ?? "group";
    const status = STATUS_MAP[m.status] ?? "scheduled";
    const home = m.homeTeam.tla ?? null;
    const away = m.awayTeam.tla ?? null;
    const id = `FD-${m.id}`;

    await db
      .insert(schema.matches)
      .values({
        id,
        stage,
        group: m.group?.replace("GROUP_", "") ?? null,
        homeTeamId: home,
        awayTeamId: away,
        kickoffAt: new Date(m.utcDate),
        status,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        externalId: String(m.id),
      })
      .onConflictDoUpdate({
        target: schema.matches.id,
        set: {
          status,
          homeTeamId: home,
          awayTeamId: away,
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
        },
      });
    updated++;
  }

  return { updated, skipped: false };
}

/** True once the first match has kicked off (used to lock predictions). */
export async function tournamentHasStarted(): Promise<boolean> {
  const [row] = await db
    .select({ started: sql<boolean>`bool_or(${schema.matches.status} <> 'scheduled')` })
    .from(schema.matches);
  return row?.started ?? false;
}
