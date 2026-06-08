"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createShareLink } from "@/lib/actions/claim";

/**
 * Optional cross-device access: mints a single-use link that carries this
 * anonymous identity to another device. No password, no account, no email —
 * you generate the link and share it with yourself.
 */
export function ClaimForm() {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(null);
    start(async () => {
      const res = await createShareLink();
      if (!res.ok || !res.link) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      setLink(res.link);
      setCopied(false);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the field is selectable.
    }
  }

  if (link) {
    return (
      <div className="rounded-2xl border border-lime/20 bg-lime/5 p-4 text-sm">
        <p className="font-semibold text-paper">Your link is ready 🔗</p>
        <p className="mt-1 text-muted">
          Open it on your other device to load your predictions there. It works once and
          expires in 30 minutes.
        </p>
        <p className="mt-2 text-xs text-magenta">
          ⚠️ Anyone with this link can access your predictions — don&apos;t share it with
          others.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 w-full rounded-2xl border border-white/10 bg-ink-600/60 px-4 text-xs text-paper outline-none focus:border-lime"
          />
          <Button onClick={copy} variant="outline" className="shrink-0">
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button onClick={generate} disabled={pending}>
        {pending ? "Generating…" : "Generate a link"}
      </Button>
      {error && <p className="text-sm text-magenta">{error}</p>}
    </div>
  );
}
