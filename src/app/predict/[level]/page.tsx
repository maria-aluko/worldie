import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Predictor } from "@/components/predict/predictor";
import { TEAMS } from "@/lib/data/teams";
import { buildGroupFixtures } from "@/lib/data/fixtures";
import { LEVELS } from "@/lib/constants";
import type { Level } from "@/lib/types";

const VALID: Level[] = ["casual", "standard", "expert"];

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
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  if (!VALID.includes(level as Level)) notFound();

  // Static reference data — no DB needed to play; only submission persists.
  const teams = TEAMS;
  const matches = buildGroupFixtures();

  return <Predictor level={level as Level} teams={teams} matches={matches} />;
}
