import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ClaimForm } from "@/components/claim/claim-form";
import { getUserIdFromCookie } from "@/lib/identity";
import { getUserOverview } from "@/lib/queries";
import { LEVELS } from "@/lib/constants";

export const metadata: Metadata = { title: "My stuff" };

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string; claim_error?: string }>;
}) {
  const { claimed, claim_error: claimError } = await searchParams;
  const userId = await getUserIdFromCookie();
  const data = userId
    ? await getUserOverview(userId).catch(() => ({ entries: [], groups: [] }))
    : { entries: [], groups: [] };

  const isEmpty = data.entries.length === 0 && data.groups.length === 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-faint">Your account</p>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">My stuff</h1>
          <p className="mt-2 text-muted">
            Your predictions and every group you&apos;re in — all in one place.
          </p>
        </div>

        {claimed && (
          <div className="mb-6 rounded-2xl border border-lime/20 bg-lime/5 px-4 py-3 text-sm text-paper">
            ✅ You&apos;re signed in on this device.
          </div>
        )}
        {claimError && (
          <div className="mb-6 rounded-2xl border border-magenta/30 bg-magenta/5 px-4 py-3 text-sm text-paper">
            {claimError}
          </div>
        )}

        {isEmpty ? (
          <div className="rounded-3xl border border-white/10 bg-ink-600/40 p-8 text-center">
            <p className="text-muted">You haven&apos;t made a prediction yet.</p>
            <div className="mt-5">
              <Button href="/predict">Make your first prediction →</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Predictions */}
            <section>
              <h2 className="mb-4 font-display text-xl font-bold">Your predictions</h2>
              {data.entries.length === 0 ? (
                <p className="text-sm text-muted">
                  No predictions yet.{" "}
                  <Link href="/predict" className="text-lime hover:underline">
                    Make one →
                  </Link>
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.entries.map((e) => (
                    <div
                      key={e.id}
                      className="flex flex-col rounded-3xl border border-white/10 bg-ink-600/40 p-5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg font-bold">
                          {LEVELS[e.level].name}
                        </span>
                        <span className="font-display font-bold tabular-nums text-lime">
                          {e.totalPoints} pts
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        Champion:{" "}
                        {e.championTeam ? `${e.championTeam.flag} ${e.championTeam.name}` : "—"}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <Button href={`/predict/${e.level}`} variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button href={`/p/${e.slug}`} variant="ghost" size="sm">
                          Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {data.entries.length < 2 && (
                <p className="mt-3 text-sm text-faint">
                  <Link href="/predict" className="text-lime hover:underline">
                    Play another level →
                  </Link>
                </p>
              )}
            </section>

            {/* Groups */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Your groups</h2>
                <Button href="/groups" variant="ghost" size="sm">
                  Create / join →
                </Button>
              </div>
              {data.groups.length === 0 ? (
                <p className="text-sm text-muted">
                  You&apos;re not in any groups yet.{" "}
                  <Link href="/groups" className="text-lime hover:underline">
                    Start or join one →
                  </Link>
                </p>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  {data.groups.map((g, i) => (
                    <Link
                      key={g.id}
                      href={`/g/${g.inviteSlug}`}
                      className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-lime/5 ${
                        i % 2 ? "bg-ink/40" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{g.name}</span>
                        <span className="text-xs text-faint">
                          {LEVELS[g.level].name} · {g.memberCount} member
                          {g.memberCount === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-display font-bold">
                          {MEDALS[g.rank - 1] ?? `#${g.rank}`}
                        </span>
                        <span className="text-xs tabular-nums text-muted">{g.myPoints} pts</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Cross-device access */}
            <section>
              <h2 className="mb-1 font-display text-xl font-bold">Use on another device</h2>
              <p className="mb-4 text-sm text-muted">
                Your stuff lives in this browser. Add an email to open it on your phone or
                another computer — no password, no account.
              </p>
              <ClaimForm />
            </section>
          </div>
        )}
      </main>
    </>
  );
}
