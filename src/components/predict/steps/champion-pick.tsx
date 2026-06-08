"use client";

import { motion } from "framer-motion";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";

/**
 * Pick a single winner from a small candidate pool — the champion (default) or,
 * with the `tone="bronze"` variant, the 3rd-place playoff winner.
 */
export function ChampionPick({
  candidates,
  value,
  onSelect,
  tone = "gold",
  locked = false,
}: {
  candidates: Team[];
  value: string | null;
  onSelect: (id: string) => void;
  tone?: "gold" | "bronze";
  /** This match has kicked off — show the pick read-only. */
  locked?: boolean;
}) {
  const t = TONES[tone];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {candidates.map((team) => {
        const sel = value === team.id;
        return (
          <motion.button
            key={team.id}
            type="button"
            disabled={locked && !sel}
            whileTap={locked ? undefined : { scale: 0.97 }}
            onClick={locked ? undefined : () => onSelect(team.id)}
            className={cn(
              "relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border p-8 transition-all",
              sel ? t.selected : "border-white/10 bg-ink-600/60 hover:border-white/25",
              locked && !sel && "cursor-not-allowed opacity-35",
            )}
          >
            {sel && <span className="absolute right-4 top-4 text-2xl">{t.emoji}</span>}
            <Flag flag={team.flag} className="text-6xl" />
            <span className="font-display text-2xl font-extrabold">{team.name}</span>
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                sel ? t.label : "text-faint",
              )}
            >
              {sel ? t.selectedHint : t.hint}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

const TONES = {
  gold: {
    emoji: "🏆",
    selected: "border-gold bg-gold/10 shadow-[0_0_40px_-8px_rgba(255,203,45,0.5)]",
    label: "text-gold",
    selectedHint: "Your champion",
    hint: "Tap to crown",
  },
  bronze: {
    emoji: "🥉",
    selected: "border-amber-600 bg-amber-600/10 shadow-[0_0_40px_-8px_rgba(217,119,6,0.5)]",
    label: "text-amber-500",
    selectedHint: "Your bronze",
    hint: "Tap for third",
  },
} as const;
