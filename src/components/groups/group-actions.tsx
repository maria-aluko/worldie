"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyInvite({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-600/60 px-4 py-3">
        <span className="text-xs uppercase tracking-widest text-faint">Invite code</span>
        <span className="font-display text-xl font-bold tracking-[0.3em] text-lime">
          {code}
        </span>
      </div>
      <Button
        variant="secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? "Copied!" : "Copy invite link"}
      </Button>
    </div>
  );
}
