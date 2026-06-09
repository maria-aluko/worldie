import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Distribution } from "@/components/compare/distribution";
import { pickDistribution, totalEntries } from "@/lib/queries";
import { compact } from "@/lib/utils";

export const metadata: Metadata = { title: "The Crowd" };
export const revalidate = 60; // cache aggregates for a minute

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function ComparePage() {
  const [champion, finalists, goldenBoot, total] = await Promise.all([
    safe(pickDistribution("champion"), []),
    safe(pickDistribution("reach_final"), []),
    safe(pickDistribution("golden_boot"), []),
    safe(totalEntries(), 0),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
            What the world thinks
          </h1>
          <p className="mt-3 text-muted">
            {total > 0
              ? `Based on ${compact(total)} prediction${total === 1 ? "" : "s"} so far.`
              : "No predictions yet — make the first one and set the tone."}
          </p>
        </div>

        <div className="space-y-6">
          <Panel title="🏆 Who wins it all" accent="gold">
            <Distribution rows={champion} total={total} accent="gold" />
          </Panel>
          <Panel title="🥇 Reaching the final" accent="lime">
            <Distribution rows={finalists} total={total} accent="lime" />
          </Panel>
          <Panel title="⚽ Golden Boot nation" accent="cyan">
            <Distribution rows={goldenBoot} total={total} accent="cyan" />
          </Panel>
        </div>

        <div className="mt-10 rounded-3xl border border-lime/20 bg-ink-600/60 p-8 text-center">
          <h2 className="font-display text-2xl font-extrabold">Think they&apos;re wrong?</h2>
          <p className="mt-2 text-muted">Make your own call and prove the crowd wrong.</p>
          <div className="mt-5">
            <Button href="/predict">Make your prediction →</Button>
          </div>
        </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-ink-600/40 p-6">
      <h2 className="mb-4 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
