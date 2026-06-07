"use client";

import type { Team } from "@/lib/types";
import { TeamButton } from "../team-button";

/** Generic "pick exactly N teams from a candidate pool" grid. */
export function SelectN({
  teams,
  selected,
  max,
  onToggle,
}: {
  teams: Team[];
  selected: string[];
  max: number;
  onToggle: (id: string) => void;
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
            disabled={full && !isSel}
            onClick={() => onToggle(t.id)}
          />
        );
      })}
    </div>
  );
}
