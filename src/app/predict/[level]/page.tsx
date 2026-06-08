import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Predictor, type GroupContext } from "@/components/predict/predictor";
import { TEAMS } from "@/lib/data/teams";
import { buildGroupFixtures } from "@/lib/data/fixtures";
import { LEVELS } from "@/lib/constants";
import { getGroupBySlug, getMyEntry } from "@/lib/queries";
import { getUserIdFromCookie } from "@/lib/identity";
import { loadMatches } from "@/lib/actions/score";
import { nowMs } from "@/lib/now";
import { unflattenPicks } from "@/lib/predict/model";
import type { Level } from "@/lib/types";

const VALID: Level[] = ["standard", "expert"];

export function generateStaticParams() {
  return VALID.map((level) => ({ level }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string }>;
}): Promise<Metadata> {
  const { level } = await params;
  const meta = LEVELS[level as Level];
  return { title: meta ? `${meta.name} prediction` : "Predict" };
}

export default async function PredictLevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ newGroup?: string; join?: string }>;
}) {
  const { level } = await params;
  const { newGroup, join } = await searchParams;
  if (!VALID.includes(level as Level)) notFound();

  let groupContext: GroupContext | undefined;

  if (join) {
    // Joining a group forces the predictor to that group's format — the player
    // doesn't get to pick their own level.
    const group = await getGroupBySlug(join).catch(() => null);
    if (!group) notFound();
    if (group.level !== level) {
      redirect(`/predict/${group.level}?join=${join}`);
    }
    groupContext = { mode: "join", inviteCode: join };
  } else if (newGroup) {
    groupContext = { mode: "create", name: newGroup };
  }

  // Static reference data — no DB needed to play; only submission persists.
  const teams = TEAMS;
  const matches = buildGroupFixtures();

  // Authoritative kickoffs/results (group fixtures are seeded; knockout matches
  // arrive from the feed) drive the rolling per-event lock. `now` is fixed on
  // the server so the client renders the same lock state (no hydration drift).
  const lockMatches = await loadMatches().catch(() => []);
  const now = nowMs();

  // If the player already has an entry at this level, prefill it so the form
  // edits in place rather than starting from scratch.
  const userId = await getUserIdFromCookie();
  const existing = userId ? await getMyEntry(userId, level as Level).catch(() => null) : null;
  const initialState = existing
    ? unflattenPicks(level as Level, existing.picks, teams, matches)
    : undefined;
  const initialName = existing?.entry.displayName ?? undefined;

  return (
    <Predictor
      level={level as Level}
      teams={teams}
      matches={matches}
      lockMatches={lockMatches}
      now={now}
      groupContext={groupContext}
      initialState={initialState}
      initialName={initialName}
      editing={!!existing}
    />
  );
}
