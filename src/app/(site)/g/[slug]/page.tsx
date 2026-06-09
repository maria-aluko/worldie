import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { CopyInvite } from "@/components/groups/group-actions";
import { JoinWithEntry } from "@/components/groups/join-with-entry";
import { getGroupBySlug, getMyEntry, summarize } from "@/lib/queries";
import { getUserIdFromCookie } from "@/lib/identity";
import { TEAMS_BY_ID } from "@/lib/data/teams";
import { LEVELS } from "@/lib/constants";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = { title: "Group" };

const MEDALS = ["🥇", "🥈", "🥉"];

// Single-level groups today, but mark each player's level clearly — Expert always
// has more points on the table.
const LEVEL_CHIP: Record<string, string> = {
  standard: "border-cyan/40 text-cyan",
  expert: "border-magenta/40 text-magenta",
};

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug).catch(() => null);
  if (!group) notFound();

  const userId = await getUserIdFromCookie();
  const isMember = userId ? group.members.some((m) => m.userId === userId) : false;
  const inviteUrl = `${siteUrl}/g/${group.inviteSlug}`;
  const anyScores = group.members.some((m) => m.points > 0);

  // A non-member who already predicted at this level can join in one tap.
  const myEntry =
    userId && !isMember ? await getMyEntry(userId, group.level).catch(() => null) : null;
  const myChampion = myEntry ? summarize(myEntry.picks).championTeam : null;
  const myChampionLabel = myChampion ? `🏆 ${myChampion.code}` : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-faint">Group</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-extrabold">{group.name}</h1>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-muted">
              {LEVELS[group.level].name}
            </span>
          </div>
          <p className="mt-2 text-muted">
            {group.members.length} member{group.members.length === 1 ? "" : "s"} ·{" "}
            {anyScores ? "Live standings" : "Leaderboard unlocks at kick-off"}
          </p>
        </div>

        <div className="mb-8">
          <CopyInvite url={inviteUrl} code={group.inviteSlug} />
        </div>

        {!isMember && (
          <div className="mb-8 rounded-3xl border border-lime/20 bg-ink-600/60 p-6">
            <h2 className="font-display text-xl font-bold">Join this group</h2>
            {myEntry ? (
              <>
                <p className="mb-4 mt-1 text-sm text-muted">
                  This group plays {LEVELS[group.level].name}. Join with the{" "}
                  {LEVELS[group.level].name} prediction you&apos;ve already made — no
                  need to start over.
                </p>
                <JoinWithEntry
                  inviteCode={group.inviteSlug}
                  entryId={myEntry.entry.id}
                  championLabel={myChampionLabel}
                />
                <p className="mt-3 text-sm text-faint">
                  <Link
                    href={`/predict/${group.level}?join=${group.inviteSlug}`}
                    className="text-lime hover:underline"
                  >
                    Edit your prediction first →
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className="mb-4 mt-1 text-sm text-muted">
                  This group plays {LEVELS[group.level].name}. Make your prediction to
                  take your spot on the leaderboard.
                </p>
                <Button href={`/predict/${group.level}?join=${group.inviteSlug}`}>
                  Make your prediction to join →
                </Button>
              </>
            )}
          </div>
        )}

        {/* Leaderboard / picks */}
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-white/10 bg-ink-600/60 px-4 py-3 text-xs font-bold uppercase tracking-widest text-faint">
            <span>#</span>
            <span>Player</span>
            <span>Champion</span>
            <span className="text-right">Pts</span>
          </div>
          {group.members.length === 0 && (
            <p className="px-4 py-8 text-center text-muted">No members yet.</p>
          )}
          {group.members.map((m, i) => {
            const champ = m.championId ? TEAMS_BY_ID.get(m.championId) : null;
            const me = m.userId === userId;
            return (
              <div
                key={m.userId}
                className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3.5 ${
                  i % 2 ? "bg-ink/40" : ""
                } ${me ? "bg-lime/5" : ""}`}
              >
                <span className="w-6 font-display font-bold">
                  {MEDALS[i] ?? i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {m.displayName || "Anonymous"} {me && <span className="text-lime">(you)</span>}
                  </span>
                  {m.level ? (
                    <span
                      className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${LEVEL_CHIP[m.level]}`}
                    >
                      {LEVELS[m.level].name}
                    </span>
                  ) : (
                    <span className="text-xs text-faint">No prediction</span>
                  )}
                </span>
                <span className="text-sm">
                  {champ ? (
                    <>
                      <Flag flag={champ.flag} /> {champ.code}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="text-right font-display font-bold tabular-nums">
                  {m.points}
                </span>
              </div>
            );
          })}
        </div>

        {isMember && (
          <div className="mt-8 text-center">
            <Button
              href={`/predict/${group.level}?join=${group.inviteSlug}`}
              variant="outline"
            >
              Update your prediction →
            </Button>
          </div>
        )}
    </main>
  );
}
