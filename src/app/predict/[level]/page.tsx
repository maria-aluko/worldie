import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Predictor, type GroupContext } from "@/components/predict/predictor";
import { TEAMS } from "@/lib/data/teams";
import { buildGroupFixtures } from "@/lib/data/fixtures";
import { LEVELS } from "@/lib/constants";
import { getGroupBySlug } from "@/lib/queries";
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

  return (
    <Predictor
      level={level as Level}
      teams={teams}
      matches={matches}
      groupContext={groupContext}
    />
  );
}
