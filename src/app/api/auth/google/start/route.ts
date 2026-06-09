import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, createSupabaseServerClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Kick off Google sign-in via Supabase Auth. Supabase handles the OAuth dance
 * (PKCE, state) and redirects back to our callback with a `code`. Runs in a
 * Route Handler so the PKCE/session cookies can be written.
 */
export async function GET(req: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.redirect(new URL("/login?error=unconfigured", req.url));
  }

  const rawReturn = req.nextUrl.searchParams.get("returnTo") ?? "/album";
  const returnTo = rawReturn.startsWith("/") ? rawReturn : "/album"; // same-site only
  const callback = `${siteUrl}/api/auth/google/callback?returnTo=${encodeURIComponent(returnTo)}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback },
  });

  if (error || !data?.url) {
    console.error("signInWithOAuth failed", error);
    return NextResponse.redirect(new URL("/login?error=Could%20not%20start%20sign-in.", req.url));
  }
  return NextResponse.redirect(data.url);
}
