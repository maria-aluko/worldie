"use client";

import { motion } from "framer-motion";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Crown the champion from a small candidate pool (the finalists). */
export function ChampionPick({
  candidates,
  value,
  onSelect,
}: {
  candidates: Team[];
  value: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {candidates.map((t) => {
        const sel = value === t.id;
        return (
          <motion.button
            key={t.id}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(t.id)}
            className={cn(
              "relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border p-8 transition-all",
              sel
                ? "border-gold bg-gold/10 shadow-[0_0_40px_-8px_rgba(255,203,45,0.5)]"
                : "border-white/10 bg-ink-600/60 hover:border-white/25",
            )}
          >
            {sel && (
              <span className="absolute right-4 top-4 text-2xl text-glow-gold">🏆</span>
            )}
            <span className="text-6xl">{t.flag}</span>
            <span className="font-display text-2xl font-extrabold">{t.name}</span>
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                sel ? "text-gold" : "text-faint",
              )}
            >
              {sel ? "Your champion" : "Tap to crown"}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
