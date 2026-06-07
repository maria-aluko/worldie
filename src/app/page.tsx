import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import { Button } from "@/components/ui/button";
import { LEVELS, LEVEL_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ACCENT: Record<string, string> = {
  lime: "text-lime border-lime/30 hover:border-lime/60",
  cyan: "text-cyan border-cyan/30 hover:border-cyan/60",
  magenta: "text-magenta border-magenta/30 hover:border-magenta/60",
};

const STEPS = [
  {
    n: "01",
    t: "Pick your level",
    d: "Casual, Standard or Expert — go as deep as you dare.",
  },
  {
    n: "02",
    t: "Make the calls",
    d: "Crown a champion, fill the bracket, predict the scores.",
  },
  {
    n: "03",
    t: "Share & compete",
    d: "Post your card, invite friends, climb the live leaderboard.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-3xl border border-white/10 bg-ink-600/60 p-7"
              >
                <div className="font-display text-3xl font-extrabold text-lime/80">
                  {s.n}
                </div>
                <h3 className="mt-4 font-display text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Levels */}
        <section className="mx-auto max-w-6xl px-5 py-10">
          <div className="mb-8 text-center">
            <h2 className="font-display text-4xl font-extrabold sm:text-5xl">
              Two ways to play
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Choose how far down the rabbit hole you go. More depth, more
              points.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {LEVEL_ORDER.map((id) => {
              const lv = LEVELS[id];
              return (
                <Link
                  key={id}
                  href={`/predict/${id}`}
                  className={cn(
                    "group flex flex-col rounded-3xl border bg-ink-600/60 p-7 transition-all duration-300 hover:-translate-y-1",
                    ACCENT[lv.accent],
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-extrabold text-paper">
                      {lv.name}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-faint">
                      {lv.minutes}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{lv.tagline}</p>
                  <p className="mt-3 text-sm text-muted">{lv.blurb}</p>
                  <ul className="mt-5 space-y-2 text-sm text-paper/80">
                    {lv.includes.map((it) => (
                      <li key={it} className="flex gap-2">
                        <span className="text-current">›</span>
                        {it}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-6 inline-flex items-center gap-1 font-display text-sm font-bold uppercase tracking-wide">
                    Play {lv.name}
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="relative overflow-hidden rounded-[2rem] border border-lime/20 bg-gradient-to-br from-ink-600 to-ink p-10 text-center sm:p-16">
            <h2 className="font-display text-4xl font-extrabold sm:text-6xl">
              Your bracket is <span className="text-gradient">waiting.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">
              48 teams. 104 matches. One champion. Make the calls before the
              world finds out who&apos;s right.
            </p>
            <div className="mt-8">
              <Button href="/predict" size="lg">
                Start predicting →
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
