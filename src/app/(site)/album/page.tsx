import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProgressBar } from "@/components/stickers/progress-bar";
import { BuyLinks } from "@/components/stickers/buy-links";
import { requireLoggedInUser } from "@/lib/identity";
import { getAlbumOverview } from "@/lib/queries";

export const metadata: Metadata = { title: "Sticker album" };

export default async function AlbumHubPage() {
  const user = await requireLoggedInUser();
  if (!user) redirect("/login?returnTo=/album");

  const sets = await getAlbumOverview(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-faint">Your collection</p>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Sticker album</h1>
          <p className="mt-2 text-muted">
            Track which stickers you&apos;ve got, which you can swap, and which you still need.
          </p>
        </div>

        {sets.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-ink-600/40 p-8 text-center text-muted">
            No albums are available yet — check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {sets.map((s) => (
              <Link
                key={s.id}
                href={`/album/${s.id}`}
                className="block rounded-3xl border border-white/10 bg-ink-600/40 p-6 transition-colors hover:border-lime/40"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold">{s.name}</h2>
                    {s.season && <p className="text-xs text-faint">Season {s.season}</p>}
                  </div>
                  <span className="font-display text-sm font-bold text-lime">Open →</span>
                </div>
                <ProgressBar collected={s.collected} total={s.total} />
                <div className="mt-3 flex gap-4 text-xs text-muted">
                  <span>
                    <span className="font-semibold text-cyan">{s.swappable}</span> to swap
                  </span>
                  <span>
                    <span className="font-semibold text-magenta">{s.desired}</span> wanted
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8">
          <BuyLinks />
        </div>
    </main>
  );
}
