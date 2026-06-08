"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { groupExists } from "@/lib/actions/group";

export function JoinGroupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    // Check the code resolves before navigating, so a typo gives inline
    // feedback instead of dropping the player on a 404. The group page then
    // walks them through joining at the group's level.
    start(async () => {
      const exists = await groupExists(c);
      if (exists) router.push(`/g/${c}`);
      else setError("No group found with that code.");
    });
  }

  return (
    <div className="space-y-3">
      <input
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          if (error) setError(null);
        }}
        maxLength={6}
        placeholder="ABC123"
        className="h-12 w-full rounded-2xl border border-white/10 bg-ink-600/60 px-4 font-display text-lg tracking-[0.3em] text-paper outline-none placeholder:text-faint placeholder:tracking-normal focus:border-lime"
      />
      <Button
        onClick={submit}
        disabled={pending || code.trim().length < 4}
        className="w-full"
      >
        {pending ? "Checking…" : "Find group →"}
      </Button>
      {error && <p className="text-sm text-magenta">{error}</p>}
    </div>
  );
}
