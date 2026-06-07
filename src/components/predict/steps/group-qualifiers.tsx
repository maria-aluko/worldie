"use client";

import { motion } from "framer-motion";
import type { Team } from "@/lib/types";
import { TeamButton } from "../team-button";
import { cn } from "@/lib/utils";

/**
 * Standard level: pick the 2 teams that advance from each group, then designate
 * which of the remaining 2 finishes 3rd — those become the lucky-loser pool.
 */
export function GroupQualifiers({
  groups,
  teamsByGroup,
  value,
  third,
  onChange,
  onThird,
}: {
  groups: string[];
  teamsByGroup: Record<string, Team[]>;
  value: Record<string, string[]>;
  third: Record<string, string>;
  onChange: (group: string, ids: string[]) => void;
  onThird: (group: string, id: string) => void;
}) {
  function toggle(group: string, id: string) {
    const cur = value[group] ?? [];
    if (cur.includes(id)) {
      onChange(group, cur.filter((x) => x !== id));
    } else if (cur.length < 2) {
      const next = [...cur, id];
      onChange(group, next);
      // If the newly-qualified team was marked 3rd, clear that stale designation.
      if (third[group] === id) onThird(group, "");
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {groups.map((g) => {
        const sel = value[g] ?? [];
        const top2Done = sel.length === 2;
        const rest = teamsByGroup[g].filter((t) => !sel.includes(t.id));
        const thirdDone = !!third[g] && rest.some((t) => t.id === third[g]);
        return (
          <div key={g} className="rounded-3xl border border-white/10 bg-ink-600/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Group {g}</h3>
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  top2Done && thirdDone ? "text-lime" : "text-faint",
                )}
              >
                {top2Done && thirdDone ? "Done" : `${sel.length}/2`}
              </span>
            </div>
            <div className="space-y-2">
              {teamsByGroup[g].map((t) => (
                <TeamButton
                  key={t.id}
                  team={t}
                  size="sm"
                  selected={sel.includes(t.id)}
                  disabled={sel.length >= 2 && !sel.includes(t.id)}
                  onClick={() => toggle(g, t.id)}
                />
              ))}
            </div>

            {top2Done && (
              <div className="mt-4 border-t border-white/5 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                  🥉 Who finishes 3rd?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {rest.map((t) => {
                    const isThird = third[g] === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onThird(g, isThird ? "" : t.id)}
                        className={cn(
                          "flex h-11 items-center gap-2 rounded-xl border px-3 text-left transition-colors",
                          isThird
                            ? "border-gold bg-gold/15 text-paper"
                            : "border-white/10 bg-ink-600/60 text-muted hover:border-white/25",
                        )}
                      >
                        <span className="text-lg">{t.flag}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {t.code}
                        </span>
                        {isThird && <span className="shrink-0 text-base">🥉</span>}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
