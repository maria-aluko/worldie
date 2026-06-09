"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setStickerStatus } from "@/lib/actions/stickers";
import type { StickerStatus } from "@/lib/types";

/** Tap order: cycle through every state and back to not-owned. */
const ORDER: StickerStatus[] = ["not_owned", "owned", "swappable", "desired"];

const STYLE: Record<StickerStatus, string> = {
  not_owned: "border-white/10 bg-ink-600/40 text-faint hover:border-white/25 hover:text-muted",
  owned: "border-lime/60 bg-lime/15 text-lime",
  swappable: "border-cyan/60 bg-cyan/15 text-cyan",
  desired: "border-magenta/60 bg-magenta/15 text-magenta",
};

const LABEL: Record<StickerStatus, string> = {
  not_owned: "Not owned",
  owned: "Owned",
  swappable: "Swappable (double)",
  desired: "Wanted",
};

export function StickerButton({
  id,
  code,
  label,
  initialStatus,
}: {
  id: string;
  code: string;
  label: string | null;
  initialStatus: StickerStatus;
}) {
  const [status, setStatus] = useState<StickerStatus>(initialStatus);
  const [pending, start] = useTransition();

  function cycle() {
    const next = ORDER[(ORDER.indexOf(status) + 1) % ORDER.length];
    const prev = status;
    setStatus(next); // optimistic
    start(async () => {
      const res = await setStickerStatus({ stickerId: id, status: next });
      if (!res.ok) setStatus(prev); // revert on failure
    });
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Sticker ${code}${label ? ` (${label})` : ""}: ${LABEL[status]}. Tap to change.`}
      title={`${code}${label ? ` · ${label}` : ""} — ${LABEL[status]}`}
      className={cn(
        "h-9 min-w-[3.25rem] rounded-lg border px-2 text-xs font-bold tabular-nums transition-colors active:scale-[0.96]",
        STYLE[status],
        pending && "opacity-60",
      )}
    >
      {code}
    </button>
  );
}
