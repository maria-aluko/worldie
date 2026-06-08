"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createGroup } from "@/lib/actions/group";
import { LEVELS, LEVEL_ORDER } from "@/lib/constants";
import type { Level } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CreateGroupForm() {
  const router = useRouter();
  const params = useSearchParams();
  // When arriving from a finished prediction, the group inherits that entry's
  // level — the creator only needs to name it.
  const entryId = params.get("entry") ?? undefined;

  const [name, setName] = useState("");
  const [level, setLevel] = useState<Level>("standard");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;

    if (entryId) {
      // Existing prediction → create the group right away.
      start(async () => {
        const res = await createGroup({ name: trimmed, entryId });
        if (res.ok && res.slug) router.push(`/g/${res.slug}`);
        else setError(res.error ?? "Something went wrong.");
      });
      return;
    }

    // Fresh group → make the creator's prediction first; the group is created
    // when they submit (see /predict/[level]).
    router.push(`/predict/${level}?newGroup=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="e.g. Office Sweepstake"
        className="h-12 w-full rounded-2xl border border-white/10 bg-ink-600/60 px-4 text-paper outline-none placeholder:text-faint focus:border-lime"
      />

      {!entryId && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-faint">
            Group level
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEVEL_ORDER.map((id) => {
              const lv = LEVELS[id];
              const active = level === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLevel(id)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors",
                    active
                      ? "border-lime bg-lime/10"
                      : "border-white/10 bg-ink-600/60 hover:border-white/25",
                  )}
                >
                  <span className="block font-display font-bold">
                    {lv.name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-faint">
            Everyone in the group predicts at this level.
          </p>
        </div>
      )}

      <Button
        onClick={submit}
        disabled={pending || !name.trim()}
        className="w-full"
      >
        {pending
          ? "Creating…"
          : entryId
            ? "Create group →"
            : "Next: make your prediction →"}
      </Button>
      {error && <p className="text-sm text-magenta">{error}</p>}
    </div>
  );
}
