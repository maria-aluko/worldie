"use client";

import { motion } from "framer-motion";
import type { Team } from "@/lib/types";
import type { Tie } from "@/lib/predict/bracket";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";

/**
 * One knockout round rendered as its fixed ties. Each tie shows both teams and
 * the player taps the winner — so they can never advance both sides of a tie.
 * A side reads "TBD" until the upstream tie that feeds it is decided.
 */
export function KnockoutRound({
  ties,
  teamsById,
  onPick,
  locked = false,
}: {
  ties: Tie[];
  teamsById: Map<string, Team>;
  onPick: (tie: Tie, teamId: string) => void;
  /** This round has kicked off — show the picks read-only. */
  locked?: boolean;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {ties.map((tie) => (
        <div
          key={tie.id}
          className="flex items-stretch gap-1.5 rounded-2xl border border-white/10 bg-ink-600/40 p-1.5"
        >
          <Side tie={tie} teamId={tie.homeId} teamsById={teamsById} onPick={onPick} locked={locked} />
          <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-faint">
            v
          </div>
          <Side tie={tie} teamId={tie.awayId} teamsById={teamsById} onPick={onPick} locked={locked} />
        </div>
      ))}
    </div>
  );
}

function Side({
  tie,
  teamId,
  teamsById,
  onPick,
  locked,
}: {
  tie: Tie;
  teamId: string | null;
  teamsById: Map<string, Team>;
  onPick: (tie: Tie, teamId: string) => void;
  locked: boolean;
}) {
  const team = teamId ? teamsById.get(teamId) ?? null : null;
  const selected = teamId != null && tie.winnerId === teamId;
  const disabled = !team || locked;

  if (!team) {
    return (
      <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-faint">
        TBD
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      disabled={disabled && !selected}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={disabled ? undefined : () => onPick(tie, team.id)}
      className={cn(
        "flex h-12 flex-1 items-center gap-2 rounded-xl border px-2.5 text-left transition-colors duration-150",
        selected
          ? "border-lime bg-lime/15 text-paper"
          : "border-white/10 bg-ink-600/60 text-paper hover:border-white/25",
        locked && !selected && "cursor-not-allowed opacity-35",
      )}
    >
      <Flag flag={team.flag} className="text-xl" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{team.code}</span>
      {selected && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
          <CheckIcon />
        </span>
      )}
    </motion.button>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
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
