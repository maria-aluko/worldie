"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { setStickerStatus } from "@/lib/actions/stickers";
import type { StickerStatus, Tier } from "@/lib/types";

/** Status order shown in the popover picker (Swappable is derived, not picked). */
const PICKER: StickerStatus[] = ["owned", "desired", "not_owned"];

/**
 * Trigger styles. "swap" is a derived visual — an owned sticker with spares
 * (copies ≥ 2) — not a stored status.
 */
type Visual = StickerStatus | "swap";
const STYLE: Record<Visual, string> = {
  not_owned: "border-white/10 bg-ink-600/40 text-faint hover:border-white/25 hover:text-muted",
  owned: "border-lime/60 bg-lime/15 text-lime",
  swap: "border-cyan/60 bg-cyan/15 text-cyan",
  desired: "border-magenta/60 bg-magenta/15 text-magenta",
};

const LABEL: Record<StickerStatus, string> = {
  not_owned: "Missing",
  owned: "Owned",
  desired: "Wanted",
};

/** Accent ring per Extra-Sticker finish (the trigger keeps its status color). */
const TIER_ACCENT: Record<Tier, string> = {
  bronze: "ring-1 ring-[#cd7f32]/70",
  silver: "ring-1 ring-[#cbd0d8]/70",
  gold: "ring-1 ring-gold/70",
};

const TIER_SHORT: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

export function StickerButton({
  id,
  code,
  label,
  tier = null,
  initialStatus,
  initialCount,
}: {
  id: string;
  code: string;
  label: string | null;
  tier?: Tier | null;
  initialStatus: StickerStatus;
  initialCount: number;
}) {
  const [status, setStatus] = useState<StickerStatus>(initialStatus);
  const [count, setCount] = useState<number>(initialCount);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Off-screen until measured so the pre-paint placement below avoids a flash.
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  // The popover renders in a portal (fixed-positioned) so it isn't clipped by an
  // ancestor's `overflow-hidden` (e.g. the collapsible album section). Place it
  // relative to the trigger, flipping above / shifting in when near an edge.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const t = triggerRef.current?.getBoundingClientRect();
      if (!t) return;
      const w = panelRef.current?.offsetWidth ?? 208;
      const h = panelRef.current?.offsetHeight ?? 180;
      const left = Math.max(8, Math.min(t.left, window.innerWidth - w - 8));
      let top = t.bottom + 6;
      if (top + h > window.innerHeight - 8) {
        const above = t.top - h - 6;
        top = above >= 8 ? above : Math.max(8, window.innerHeight - h - 8);
      }
      setCoords({ top, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Close on outside click / Escape (the panel lives in a portal, so check both).
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Persist a status + count, optimistically, reverting both on failure. */
  function persist(nextStatus: StickerStatus, nextCount: number) {
    const prev = { status, count };
    setStatus(nextStatus);
    setCount(nextCount);
    start(async () => {
      const res = await setStickerStatus({ stickerId: id, status: nextStatus, count: nextCount });
      if (!res.ok) {
        setStatus(prev.status);
        setCount(prev.count);
      }
    });
  }

  function pickStatus(next: StickerStatus) {
    // Owned keeps any copies already entered (min 1); Missing/Wanted clear to 0.
    const nextCount = next === "owned" ? Math.max(1, count) : 0;
    persist(next, nextCount);
  }

  function setCopies(next: number) {
    // Dropping below 1 copy means you no longer own it → Missing.
    if (next <= 0) persist("not_owned", 0);
    else persist("owned", Math.min(99, next));
  }

  const text = tier ? TIER_SHORT[tier] : code;
  const spares = status === "owned" ? Math.max(0, count - 1) : 0;
  const showsCount = status === "owned" && count > 1;
  // Owned with spares shows the "swap" colour; otherwise the status colour.
  const visual: Visual = spares > 0 ? "swap" : status;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Sticker ${code}${label ? ` (${label})` : ""}: ${LABEL[status]}${showsCount ? `, ${count} copies (${spares} to swap)` : ""}. Tap to edit.`}
        title={`${code}${label ? ` · ${label}` : ""} — ${LABEL[status]}${showsCount ? ` ×${count}` : ""}`}
        className={cn(
          "relative h-9 min-w-[3.25rem] rounded-lg border px-2 text-xs font-bold tabular-nums transition-colors active:scale-[0.96]",
          STYLE[visual],
          tier && TIER_ACCENT[tier],
          pending && "opacity-60",
        )}
      >
        {text}
        {showsCount && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-paper px-1 text-[10px] font-bold leading-none text-ink">
            {count}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-50 w-52 rounded-xl border border-white/15 bg-ink-700 p-3 shadow-xl"
          >
            <p className="mb-2 text-xs font-semibold text-paper">
              {code}
              {label && <span className="font-normal text-muted"> · {label}</span>}
            </p>

            <div className="grid grid-cols-3 gap-1.5">
              {PICKER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickStatus(s)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                    status === s ? STYLE[s] : "border-white/10 text-muted hover:border-white/25 hover:text-paper",
                  )}
                >
                  {LABEL[s]}
                </button>
              ))}
            </div>

            {status === "owned" && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted">Copies</span>
                  <span className="text-[10px] text-faint">
                    {spares > 0 ? `${spares} to swap` : "no spares"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCopies(count - 1)}
                    aria-label={count <= 1 ? "Remove (mark missing)" : "One fewer copy"}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-paper transition-colors hover:border-white/30"
                  >
                    −
                  </button>
                  <span className="min-w-5 text-center text-sm font-bold tabular-nums text-paper">{count}</span>
                  <button
                    type="button"
                    onClick={() => setCopies(count + 1)}
                    aria-label="One more copy"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-paper transition-colors hover:border-white/30"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
