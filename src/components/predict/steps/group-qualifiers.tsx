"use client";

import { motion } from "framer-motion";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";

/**
 * Standard level: rank all four teams in each group, 1 → 4. The top 2 advance
 * directly, the 3rd becomes a lucky-loser candidate, the 4th is out. The order
 * is scored both for advancement and for landing teams in their exact position.
 */
const SLOTS = [
  { hint: "Advances", cls: "border-gold bg-gold/15 text-paper" },
  { hint: "Advances", cls: "border-lime bg-lime/15 text-paper" },
  { hint: "Lucky-loser shot", cls: "border-cyan bg-cyan/15 text-paper" },
  { hint: "Out", cls: "border-white/15 bg-ink-600/60 text-faint" },
];

export function GroupQualifiers({
  groups,
  teamsByGroup,
  value,
  onChange,
}: {
  groups: string[];
  teamsByGroup: Record<string, Team[]>;
  value: Record<string, string[]>;
  onChange: (group: string, ids: string[]) => void;
}) {
  function toggle(group: string, id: string) {
    const cur = value[group] ?? [];
    let next: string[];
    if (cur.includes(id)) {
      next = cur.filter((x) => x !== id);
    } else if (cur.length >= 4) {
      return;
    } else {
      next = [...cur, id];
      // Once three are ranked the 4th is forced — auto-complete it.
      if (next.length === 3) {
        const last = teamsByGroup[group].find((t) => !next.includes(t.id));
        if (last) next.push(last.id);
      }
    }
    onChange(group, next);
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {groups.map((g) => {
        const order = value[g] ?? [];
        const done = order.length === 4;
        return (
          <div key={g} className="rounded-3xl border border-white/10 bg-ink-600/40 p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Group {g}</h3>
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  done ? "text-lime" : "text-faint",
                )}
              >
                {done ? "Done" : `${order.length}/4`}
              </span>
            </div>
            <p className="mb-3 text-xs text-faint">Tap to rank 1 → 4.</p>

            <div className="space-y-2">
              {teamsByGroup[g].map((t) => {
                const rank = order.indexOf(t.id); // -1 if unranked
                const slot = rank >= 0 ? SLOTS[rank] : null;
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggle(g, t.id)}
                    className={cn(
                      "flex h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors",
                      slot
                        ? slot.cls
                        : "border-white/10 bg-ink-600/60 text-muted hover:border-white/25",
                    )}
                  >
                    <Flag flag={t.flag} className="text-xl" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {t.name}
                    </span>
                    {slot ? (
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-faint">
                          {slot.hint}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 font-display text-xs font-bold">
                          {rank + 1}
                        </span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-faint">Tap</span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-3 border-t border-white/5 pt-2 text-[11px] leading-relaxed text-faint">
              1st &amp; 2nd advance. 3rd may still qualify as a lucky loser. 4th is out.
            </p>
          </div>
        );
      })}
    </div>
  );
}
