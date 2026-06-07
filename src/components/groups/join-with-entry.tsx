"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/lib/actions/group";

/**
 * One-tap join for a player who already has a prediction at the group's level —
 * reuses that entry instead of forcing them to predict again.
 */
export function JoinWithEntry({
  inviteCode,
  entryId,
  championLabel,
}: {
  inviteCode: string;
  entryId: string;
  championLabel: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function join() {
    setError(null);
    start(async () => {
      const res = await joinGroup({ inviteCode, entryId });
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not join the group.");
    });
  }

  return (
    <div className="space-y-3">
      <Button onClick={join} disabled={pending}>
        {pending
          ? "Joining…"
          : championLabel
            ? `Join with your prediction (${championLabel}) →`
            : "Join with your prediction →"}
      </Button>
      {error && <p className="text-sm text-magenta">{error}</p>}
    </div>
  );
}
