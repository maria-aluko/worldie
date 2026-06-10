"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { StickerButton } from "./sticker-button";
import type { StickerStatus } from "@/lib/types";

export interface AlbumSectionSticker {
  id: string;
  code: string;
  label: string | null;
  status: StickerStatus;
}

/**
 * One collapsible country/section. Closed by default; the sticker grid — a row
 * of stateful client buttons — is only rendered (and hydrated) once the section
 * is opened, so a large album stays cheap until the player drills in.
 */
export function AlbumSection({
  title,
  flag,
  collected,
  stickers,
}: {
  title: string;
  flag?: string | null;
  collected: number;
  stickers: AlbumSectionSticker[];
}) {
  const [open, setOpen] = useState(false);
  const total = stickers.length;
  const complete = total > 0 && collected === total;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-600/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        {flag && (
          <span className="text-xl leading-none" aria-hidden>
            {flag}
          </span>
        )}
        <span className="font-display text-base font-bold">{title}</span>
        <span
          className={cn(
            "ml-auto text-xs font-semibold tabular-nums",
            complete ? "text-lime" : "text-muted",
          )}
        >
          {collected}/{total}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-faint transition-transform",
            open && "rotate-180",
          )}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-4">
          {stickers.map((s) => (
            <StickerButton
              key={s.id}
              id={s.id}
              code={s.code}
              label={s.label}
              initialStatus={s.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
