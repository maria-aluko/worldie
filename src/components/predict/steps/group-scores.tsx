"use client";

import type { Match, Team } from "@/lib/types";
import { deriveStandings } from "@/lib/predict/model";
import { cn } from "@/lib/utils";

type Scores = Record<string, { h: number; a: number }>;

export function GroupScores({
  groups,
  teamsByGroup,
  matchesByGroup,
  teamsById,
  value,
  onSet,
}: {
  groups: string[];
  teamsByGroup: Record<string, Team[]>;
  matchesByGroup: Record<string, Match[]>;
  teamsById: Map<string, Team>;
  value: Scores;
  onSet: (matchId: string, score: { h: number; a: number }) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.map((g) => {
        const table = deriveStandings(teamsByGroup[g], matchesByGroup[g], value);
        return (
          <div key={g} className="rounded-3xl border border-white/10 bg-ink-600/40 p-4">
            <h3 className="mb-3 font-display text-lg font-bold">Group {g}</h3>

            <div className="space-y-2">
              {matchesByGroup[g].map((m) => {
                const home = teamsById.get(m.homeTeamId!)!;
                const away = teamsById.get(m.awayTeamId!)!;
                const s = value[m.id] ?? { h: 0, a: 0 };
                const set = value[m.id] != null;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-ink/50 px-2 py-1.5"
                  >
                    <span className="flex w-[38%] items-center justify-end gap-1.5 truncate text-sm">
                      <span className="truncate">{home.code}</span>
                      <span>{home.flag}</span>
                    </span>
                    <Stepper
                      value={s.h}
                      dim={!set}
                      onChange={(h) => onSet(m.id, { h, a: s.a })}
                    />
                    <span className="text-faint">:</span>
                    <Stepper
                      value={s.a}
                      dim={!set}
                      onChange={(a) => onSet(m.id, { h: s.h, a })}
                    />
                    <span className="flex w-[38%] items-center gap-1.5 truncate text-sm">
                      <span>{away.flag}</span>
                      <span className="truncate">{away.code}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* live standings */}
            <div className="mt-3 border-t border-white/5 pt-3">
              {table.map((r, i) => {
                const t = teamsById.get(r.teamId)!;
                const adv = i < 2;
                return (
                  <div
                    key={r.teamId}
                    className={cn(
                      "flex items-center gap-2 py-0.5 text-xs",
                      adv ? "text-lime" : "text-faint",
                    )}
                  >
                    <span className="w-4 text-center font-bold">{i + 1}</span>
                    <span>{t.flag}</span>
                    <span className="flex-1 truncate">{t.name}</span>
                    <span className="tabular-nums">{r.pts} pts</span>
                    <span className="w-8 text-right tabular-nums">
                      {r.gd > 0 ? `+${r.gd}` : r.gd}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  dim,
  onChange,
}: {
  value: number;
  dim?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-500 text-faint hover:text-paper"
        aria-label="decrease"
      >
        −
      </button>
      <span
        className={cn(
          "w-5 text-center font-display text-lg font-bold tabular-nums",
          dim && "text-faint",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(15, value + 1))}
        className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-500 text-faint hover:text-paper"
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}
