import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/identity";
import { authConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  unconfigured: "Google sign-in isn't set up on this site yet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { returnTo, error } = await searchParams;
  const dest = returnTo && returnTo.startsWith("/") ? returnTo : "/me";

  const user = await getAuthedUser();
  if (user?.isLoggedIn) redirect(dest);

  const startHref = `/api/auth/google/start?returnTo=${encodeURIComponent(dest)}`;
  const message = error ? (ERRORS[error] ?? decodeURIComponent(error)) : null;
  const configured = authConfigured();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
        <div className="rounded-3xl border border-white/10 bg-ink-600/40 p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-faint">Optional</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Save your stuff</h1>
          <p className="mt-3 text-sm text-muted">
            Log in to keep your predictions and sticker album safe across devices. You can
            still play and predict without an account — logging in is optional.
          </p>

          {message && (
            <p className="mt-5 rounded-2xl border border-magenta/30 bg-magenta/5 px-4 py-3 text-sm text-paper">
              {message}
            </p>
          )}

          <div className="mt-7">
            {configured ? (
              <a
                href={startHref}
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-paper px-6 font-display text-sm font-bold uppercase tracking-wide text-ink transition-all duration-200 hover:brightness-95 active:scale-[0.97]"
              >
                <GoogleMark />
                Continue with Google
              </a>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-ink-700/60 px-4 py-3 text-sm text-muted">
                Google sign-in isn&apos;t configured yet. Set{" "}
                <code className="text-faint">NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
                <code className="text-faint">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and enable
                the Google provider in Supabase to turn it on.
              </p>
            )}
          </div>

          <p className="mt-5 text-xs text-faint">
            We only use your Google account to recognise you. No posting, ever.
          </p>
        </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
