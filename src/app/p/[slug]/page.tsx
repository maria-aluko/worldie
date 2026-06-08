import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PredictionCard } from "@/components/share/prediction-card";
import { ShareRow } from "@/components/share/share-row";
import { Button } from "@/components/ui/button";
import { getEntryBySlug, summarize } from "@/lib/queries";
import { LEVELS } from "@/lib/constants";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const view = await getEntryBySlug(slug).catch(() => null);
  if (!view) return { title: "Prediction not found" };
  const s = summarize(view.picks);
  const who = view.entry.displayName ? `${view.entry.displayName}'s` : "A";
  const title = s.championTeam
    ? `${who} pick: ${s.championTeam.name} to win it all`
    : `${who} 2026 World Cup prediction`;
  return {
    title,
    description: "See this 2026 World Cup prediction and make your own on Worldie.",
    openGraph: { title, url: `${siteUrl}/p/${slug}` },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const view = await getEntryBySlug(slug).catch(() => null);
  if (!view) notFound();

  const { entry, picks } = view;
  const s = summarize(picks);
  const url = `${siteUrl}/p/${slug}`;
  const shareText = s.championTeam
    ? `I've got ${s.championTeam.name} winning the 2026 World Cup 🏆 Make your call:`
    : "My 2026 World Cup prediction — make yours:";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-extrabold">
            Your call is in. ✅
          </h1>
          <p className="mt-2 text-muted">
            Share your {LEVELS[entry.level].name} prediction and see who agrees. You can{" "}
            <Link href={`/predict/${entry.level}`} className="text-lime hover:underline">
              tweak any pick
            </Link>{" "}
            until that match kicks off.
          </p>
        </div>

        <PredictionCard
          level={entry.level}
          name={entry.displayName}
          champion={s.championTeam}
          runnerUp={s.runnerUpTeam}
          third={s.thirdTeam}
          goldenBoot={s.goldenBootTeam}
        />

        <div className="mt-7">
          <ShareRow url={url} text={shareText} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button href="/compare" variant="outline">
            Beat the crowd
          </Button>
          <Button href={`/groups?entry=${entry.id}`} variant="outline">
            Start a group
          </Button>
        </div>

        <p className="mt-4 text-center text-sm text-faint">
          Got an invite code?{" "}
          <Link href="/groups" className="text-lime hover:underline">
            Join a friend&apos;s group →
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-faint">
          Want a different take?{" "}
          <Link href="/predict" className="text-lime hover:underline">
            Play another level →
          </Link>
        </p>
      </main>
    </>
  );
}
