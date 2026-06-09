import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { LEVELS, LEVEL_ORDER } from "@/lib/constants";
import { REACH_STAGES, SCORING } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "How it works" };

const ACCENT_TEXT: Record<string, string> = {
  lime: "text-lime",
  cyan: "text-cyan",
  magenta: "text-magenta",
};

/** A label + a points pill, the building block of every scoring card. */
function PointRow({ label, points }: { label: string; points: number }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-white/5 py-2.5 last:border-0">
      <span className="text-sm text-paper/85">{label}</span>
      <span className="shrink-0 rounded-full bg-lime/10 px-2.5 py-0.5 font-display text-sm font-bold text-lime">
        +{points}
      </span>
    </li>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-white/10 bg-ink-600/40 p-6 sm:p-7", className)}>
      {children}
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        {/* Intro */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">How it works</h1>
          <p className="mt-4 max-w-xl text-muted">
            Predict the 2026 World Cup, then watch your score climb as the real
            results roll in. The closer your picks land to reality, the more
            points you earn — no luck-of-the-draw, just football calls.
          </p>
        </div>

        {/* The two levels */}
        <h2 className="mb-4 font-display text-2xl font-bold">Two ways to play</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {LEVEL_ORDER.map((id) => {
            const lv = LEVELS[id];
            return (
              <Card key={id} className="bg-ink-600/60">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl font-extrabold">{lv.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-faint">
                    {lv.minutes}
                  </span>
                </div>
                <p className={cn("mt-1 font-semibold", ACCENT_TEXT[lv.accent])}>{lv.tagline}</p>
                <ul className="mt-4 space-y-2 text-sm text-paper/80">
                  {lv.includes.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className={ACCENT_TEXT[lv.accent]}>›</span>
                      {it}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted">
          Both levels earn points the same way for advancement, the final podium
          and the Golden Boot. <span className="text-paper">Expert</span> simply
          adds points for predicting individual group-match scorelines.
        </p>

        {/* Scoring — everyone */}
        <h2 className="mb-4 mt-12 font-display text-2xl font-bold">How points are earned</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="font-display text-lg font-bold">Going deep</h3>
            <p className="mt-1 text-xs text-muted">
              Points for every team you correctly send to each round.
            </p>
            <ul className="mt-3">
              {REACH_STAGES.map((s) => (
                <PointRow
                  key={s.ref}
                  label={`Reaches the ${s.label}`}
                  points={SCORING.reach[s.ref]}
                />
              ))}
            </ul>
            <p className="mt-3 text-xs text-faint">
              A best-third-place team that sneaks into the Round of 32 scores the
              same +{SCORING.reach.reach_r32_third} as any other R32 team.
            </p>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-bold">The big calls</h3>
            <p className="mt-1 text-xs text-muted">
              The trophies, the medals and the table.
            </p>
            <ul className="mt-3">
              <PointRow label="Champion" points={SCORING.champion} />
              <PointRow label="Runner-up" points={SCORING.runnerUp} />
              <PointRow label="Third place (bronze)" points={SCORING.thirdPlace} />
              <PointRow label="Golden Boot (top scorer)" points={SCORING.goldenBoot} />
              <PointRow label="Exact group-table position" points={SCORING.groupPosition} />
            </ul>
          </Card>
        </div>

        {/* Expert-only scoreline points */}
        <Card className="mt-4 border-magenta/20 bg-magenta/[0.04]">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold">Scorelines</h3>
            <span className="rounded-full bg-magenta/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-magenta">
              Expert only
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            For each of the 72 group-stage matches, predict the result.
          </p>
          <ul className="mt-3">
            <PointRow label="Correct outcome (win / draw / loss)" points={SCORING.groupWinner} />
            <PointRow
              label="Exact scoreline (bonus on top)"
              points={SCORING.exactScoreBonus}
            />
          </ul>
          <p className="mt-3 text-xs text-faint">
            Nail the exact score and you bank both — {SCORING.groupWinner} +{" "}
            {SCORING.exactScoreBonus} = {SCORING.groupWinner + SCORING.exactScoreBonus} points for
            that match.
          </p>
        </Card>

        {/* Worked example */}
        <Card className="mt-8">
          <h3 className="font-display text-lg font-bold">A quick example</h3>
          <p className="mt-2 text-sm text-paper/85">
            Say you backed Brazil to win their group and go all the way to the
            semi-finals. If they finish 1st in the group and reach the last four,
            you collect:
          </p>
          <ul className="mt-3">
            <PointRow label="Exact group-table position (1st)" points={SCORING.groupPosition} />
            <PointRow label="Reached the Round of 32" points={SCORING.reach.reach_r32} />
            <PointRow label="Reached the Round of 16" points={SCORING.reach.reach_r16} />
            <PointRow label="Reached the Quarter-finals" points={SCORING.reach.reach_qf} />
            <PointRow label="Reached the Semi-finals" points={SCORING.reach.reach_sf} />
          </ul>
          <p className="mt-3 text-sm">
            <span className="text-muted">That run alone is worth </span>
            <span className="font-display font-bold text-lime">
              {SCORING.groupPosition +
                SCORING.reach.reach_r32 +
                SCORING.reach.reach_r16 +
                SCORING.reach.reach_qf +
                SCORING.reach.reach_sf}{" "}
              points
            </span>
            <span className="text-muted"> — before any knockout upsets or podium calls.</span>
          </p>
        </Card>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-muted">Ready to make your calls?</p>
          <Button href="/predict" size="lg">
            Start predicting →
          </Button>
        </div>
    </main>
  );
}
