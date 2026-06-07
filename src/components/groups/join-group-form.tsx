"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/lib/actions/group";

export function JoinGroupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    const c = code.trim().toUpperCase();
    start(async () => {
      const res = await joinGroup(c);
      if (res.ok) router.push(`/g/${c}`);
      else setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-3">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        placeholder="ABC123"
        className="h-12 w-full rounded-2xl border border-white/10 bg-ink-600/60 px-4 font-display text-lg tracking-[0.3em] text-paper outline-none placeholder:text-faint placeholder:tracking-normal focus:border-lime"
      />
      <Button onClick={submit} disabled={pending || code.trim().length < 4} className="w-full">
        {pending ? "Joining…" : "Join group →"}
      </Button>
      {error && <p className="text-sm text-magenta">{error}</p>}
    </div>
  );
}
