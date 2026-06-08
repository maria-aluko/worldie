"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { requestClaim } from "@/lib/actions/claim";

/**
 * Optional email magic-link: lets a player carry their anonymous identity to
 * another device. No password, no account — the email only restores access.
 */
export function ClaimForm() {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    setDevLink(null);
    const value = email.trim();
    if (!value) return;
    start(async () => {
      const res = await requestClaim(value);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
      if (res.devLink) setDevLink(res.devLink);
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-lime/20 bg-lime/5 p-4 text-sm">
        <p className="font-semibold text-paper">Check your inbox 📬</p>
        <p className="mt-1 text-muted">
          We sent a link to open your predictions on another device.
        </p>
        {devLink && (
          <p className="mt-2 break-all text-xs text-faint">
            Dev (no mailer configured):{" "}
            <a href={devLink} className="text-lime hover:underline">
              {devLink}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={120}
          placeholder="you@example.com"
          className="h-12 w-full rounded-2xl border border-white/10 bg-ink-600/60 px-4 text-paper outline-none placeholder:text-faint focus:border-lime"
        />
        <Button onClick={submit} disabled={pending || !email.trim()} className="shrink-0">
          {pending ? "Sending…" : "Email me a link"}
        </Button>
      </div>
      {error && <p className="text-sm text-magenta">{error}</p>}
    </div>
  );
}
