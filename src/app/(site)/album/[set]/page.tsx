import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProgressBar } from "@/components/stickers/progress-bar";
import { BuyLinks } from "@/components/stickers/buy-links";
import { StickerButton } from "@/components/stickers/sticker-button";
import { requireLoggedInUser } from "@/lib/identity";
import { getAlbum } from "@/lib/queries";

export const metadata: Metadata = { title: "Sticker album" };

const LEGEND: { label: string; dot: string }[] = [
  { label: "Owned", dot: "bg-lime" },
  { label: "Swap", dot: "bg-cyan" },
  { label: "Want", dot: "bg-magenta" },
  { label: "Missing", dot: "bg-white/20" },
];

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
            <span className="text-faint">Tap a code to change its status.</span>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-8 space-y-8">
          {album.sections.map((section) => (
            <section key={section.section}>
              <h2 className="mb-3 font-display text-lg font-bold">{section.section}</h2>
              <div className="flex flex-wrap gap-2">
                {section.stickers.map((s) => (
                  <StickerButton
                    key={s.id}
                    id={s.id}
                    code={s.code}
                    label={s.label}
                    initialStatus={s.status}
                  />
                ))}
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
