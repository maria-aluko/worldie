"use client";

import { useState } from "react";
import type { Team } from "@/lib/types";
import { TeamButton } from "../team-button";

/** Pick the nation whose striker wins the Golden Boot. */
export function GoldenBoot({
  teams,
  value,
  onSelect,
}: {
  teams: Team[];
  value: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
    : teams;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search teams…"
        className="mb-4 h-12 w-full rounded-2xl border border-white/10 bg-ink-600/60 px-4 text-paper outline-none placeholder:text-faint focus:border-lime"
      />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <TeamButton
            key={t.id}
            team={t}
            selected={value === t.id}
            onClick={() => onSelect(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
