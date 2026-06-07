"use client";

import { motion } from "framer-motion";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TeamButton({
  team,
  selected,
  disabled,
  onClick,
  badge,
  size = "md",
}: {
  team: Team;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-2xl border px-3 text-left transition-colors duration-150",
        size === "md" ? "h-14" : "h-12",
        selected
          ? "border-lime bg-lime/15 text-paper"
          : "border-white/10 bg-ink-600/60 text-paper hover:border-white/25",
        disabled && !selected && "cursor-not-allowed opacity-35 hover:border-white/10",
      )}
    >
      <span className={cn(size === "md" ? "text-2xl" : "text-xl")}>{team.flag}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold leading-tight">{team.name}</span>
        <span className="text-xs text-faint">{team.code}</span>
      </span>
      {badge}
      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
          <CheckIcon />
        </span>
      )}
    </motion.button>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
