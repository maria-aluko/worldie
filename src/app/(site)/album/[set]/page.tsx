import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProgressBar } from "@/components/stickers/progress-bar";
import { BuyLinks } from "@/components/stickers/buy-links";
import { AlbumSection } from "@/components/stickers/album-section";
import { requireLoggedInUser } from "@/lib/identity";
import { getAlbum, type AlbumSectionView } from "@/lib/queries";
import { TEAMS_BY_ID } from "@/lib/data/teams";

export const metadata: Metadata = { title: "Sticker album" };

const LEGEND: { label: string; dot: string }[] = [
  { label: "Owned", dot: "bg-lime" },
  { label: "Swap", dot: "bg-cyan" },
  { label: "Want", dot: "bg-magenta" },
  { label: "Missing", dot: "bg-white/20" },
];

/**
 * Bucket the album's sections by World Cup group (A–L) using each section's
 * team. Groups are ordered alphabetically; sections without a team/group (e.g.
 * legends, stadiums) fall into a trailing "Other" bucket.
 */
function bucketByGroup(sections: AlbumSectionView[]) {
  const buckets = new Map<string, AlbumSectionView[]>();
  for (const section of sections) {
    const group = section.teamId ? TEAMS_BY_ID.get(section.teamId)?.group ?? null : null;
    const key = group ?? "_";
    const list = buckets.get(key) ?? [];
    list.push(section);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a === "_" ? 1 : b === "_" ? -1 : a.localeCompare(b)))
    .map(([key, groupSections]) => ({
      key,
      label: key === "_" ? "Other" : `Group ${key}`,
      sections: groupSections.sort((a, b) => a.section.localeCompare(b.section)),
    }));
}

const collectedIn = (section: AlbumSectionView) =>
  section.stickers.filter((s) => s.status === "owned").length;

export default async function AlbumSetPage({
  params,
}: {
  params: Promise<{ set: string }>;
}) {
  const { set } = await params;
  const user = await requireLoggedInUser();
  if (!user) redirect(`/login?returnTo=/album/${set}`);

  const album = await getAlbum(set, user.id);
  if (!album) notFound();

  const groups = bucketByGroup(album.sections);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <div className="mb-2">
          <Link href="/album" className="text-xs font-semibold text-faint hover:text-paper">
            ← All albums
          </Link>
        </div>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{album.set.name}</h1>

        {/* Progress + legend */}
        <div className="mt-5 rounded-3xl border border-white/10 bg-ink-600/40 p-5">
          <ProgressBar collected={album.progress.collected} total={album.progress.total} />
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            {LEGEND.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
                {l.label}
              </span>
            ))}
            <span className="text-faint">Tap a code to set its status and how many copies you have.</span>
          </div>
        </div>

        {/* Sections — grouped by World Cup group, each country collapsible */}
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 font-display text-lg font-bold text-muted">{group.label}</h2>
              <div className="space-y-2">
                {group.sections.map((section) => {
                  const team = section.teamId ? TEAMS_BY_ID.get(section.teamId) : null;
                  return (
                    <AlbumSection
                      key={section.section}
                      title={section.section}
                      flag={team?.flag ?? null}
                      collected={collectedIn(section)}
                      stickers={section.stickers}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10">
          <BuyLinks />
        </div>
    </main>
  );
}
