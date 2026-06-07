import type { Level, Team } from "@/lib/types";
import { LEVELS } from "@/lib/constants";

/** The shareable "prediction card" rendered on the result page. */
export function PredictionCard({
  level,
  name,
  champion,
  finalists,
  goldenBoot,
}: {
  level: Level;
  name: string | null;
  champion: Team | null;
  finalists: Team[];
  goldenBoot: Team | null;
}) {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-ink-600 via-ink to-ink p-8 shadow-2xl">
      {/* glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-magenta/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-extrabold">
            WOR<span className="text-lime">L</span>DIE
          </span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
            {LEVELS[level].name}
          </span>
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-faint">
          {name ? `${name}'s call` : "My call for 2026"}
        </p>

        {/* Champion */}
        <div className="mt-3 rounded-3xl border border-gold/30 bg-gold/5 p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gold">
            🏆 Champion
          </p>
          {champion ? (
            <>
              <div className="mt-2 text-6xl">{champion.flag}</div>
              <div className="mt-1 font-display text-2xl font-extrabold">
                {champion.name}
              </div>
            </>
          ) : (
            <div className="mt-2 text-muted">—</div>
          )}
        </div>

        {/* Finalists */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {finalists.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center"
            >
              <div className="text-2xl">{t.flag}</div>
              <div className="mt-1 text-sm font-semibold">{t.code}</div>
              <div className="text-[10px] uppercase tracking-wide text-faint">Finalist</div>
            </div>
          ))}
        </div>

        {/* Golden boot */}
        {goldenBoot && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan">
              ⚽ Golden Boot
            </span>
            <span className="text-sm font-semibold">
              {goldenBoot.flag} {goldenBoot.name}
            </span>
          </div>
        )}

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-faint">
          worldie · predict 2026
        </p>
      </div>
    </div>
  );
}
