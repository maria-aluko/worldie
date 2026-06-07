"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createGroup } from "@/lib/actions/group";

export function CreateGroupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const entryId = params.get("entry") ?? undefined;
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createGroup({ name: name.trim(), entryId });
      if (res.ok && res.slug) router.push(`/g/${res.slug}`);
      else setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="e.g. Office Sweepstake"
        className="h-12 w-full rounded-2xl border border-white/10 bg-ink-600/60 px-4 text-paper outline-none placeholder:text-faint focus:border-lime"
      />
      <Button onClick={submit} disabled={pending || !name.trim()} className="w-full">
        {pending ? "Creating…" : "Create group →"}
      </Button>
      {error && <p className="text-sm text-magenta">{error}</p>}
    </div>
  );
}
