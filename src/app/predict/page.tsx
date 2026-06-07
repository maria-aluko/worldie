import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { LEVELS, LEVEL_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Choose your level",
};

const ACCENT: Record<string, string> = {
  lime: "hover:border-lime/60 hover:shadow-[0_0_40px_-12px_rgba(204,255,0,0.4)]",
  cyan: "hover:border-cyan/60 hover:shadow-[0_0_40px_-12px_rgba(0,229,255,0.4)]",
  magenta: "hover:border-magenta/60 hover:shadow-[0_0_40px_-12px_rgba(255,45,120,0.4)]",
};
const ACCENT_TEXT: Record<string, string> = {
  lime: "text-lime",
  cyan: "text-cyan",
  magenta: "text-magenta",
};

export default function PredictHome() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-5 py-12 sm:py-20">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-extrabold sm:text-6xl">
            How deep do you go?
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted">
            Pick a level to start your 2026 World Cup prediction. You can always
            play again at another level.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          {LEVEL_ORDER.map((id) => {
            const lv = LEVELS[id];
            return (
              <Link
                key={id}
                href={`/predict/${id}`}
                className={cn(
                  "group flex flex-col rounded-3xl border border-white/10 bg-ink-600/60 p-7 transition-all duration-300 hover:-translate-y-1.5",
                  ACCENT[lv.accent],
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-extrabold">{lv.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-faint">
                    {lv.minutes}
                  </span>
                </div>
                <p className={cn("mt-1 font-semibold", ACCENT_TEXT[lv.accent])}>
                  {lv.tagline}
                </p>
                <p className="mt-3 text-sm text-muted">{lv.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-paper/80">
                  {lv.includes.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className={ACCENT_TEXT[lv.accent]}>›</span>
                      {it}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-1 font-display text-sm font-bold uppercase tracking-wide">
                  Start
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
