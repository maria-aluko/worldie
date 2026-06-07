"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function JoinGroupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit() {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    // The group page locks the format and walks the player through making a
    // prediction at the group's level before they're added.
    router.push(`/g/${c}`);
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
      <Button onClick={submit} disabled={code.trim().length < 4} className="w-full">
        Find group →
      </Button>
    </div>
  );
}
