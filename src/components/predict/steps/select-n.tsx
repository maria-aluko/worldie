"use client";

import type { Team } from "@/lib/types";
import { TeamButton } from "../team-button";

/** Generic "pick exactly N teams from a candidate pool" grid. */
export function SelectN({
  teams,
  selected,
  max,
  onToggle,
  locked = false,
}: {
  teams: Team[];
  selected: string[];
  max: number;
  onToggle: (id: string) => void;
  /** This round has kicked off — show the picks read-only. */
  locked?: boolean;
}) {
  const full = selected.length >= max;
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((t) => {
        const isSel = selected.includes(t.id);
        return (
          <TeamButton
            key={t.id}
            team={t}
            selected={isSel}
            disabled={locked || (full && !isSel)}
            onClick={locked ? undefined : () => onToggle(t.id)}
          />
        );
      })}
    </div>
  );
}
