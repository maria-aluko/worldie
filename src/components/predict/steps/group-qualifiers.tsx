"use client";

import type { Team } from "@/lib/types";
import { TeamButton } from "../team-button";
import { cn } from "@/lib/utils";

/** Standard level: pick the 2 teams that advance from each group. */
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
    if (cur.includes(id)) {
      onChange(group, cur.filter((x) => x !== id));
    } else if (cur.length < 2) {
      onChange(group, [...cur, id]);
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {groups.map((g) => {
        const sel = value[g] ?? [];
        return (
          <div key={g} className="rounded-3xl border border-white/10 bg-ink-600/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Group {g}</h3>
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  sel.length === 2 ? "text-lime" : "text-faint",
                )}
              >
                {sel.length}/2
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
          </div>
        );
      })}
    </div>
  );
}
