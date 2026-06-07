import { NextResponse, type NextRequest } from "next/server";
import { confirmClaim } from "@/lib/actions/claim";

/**
 * Magic-link landing. Runs in a Route Handler so it can set the identity cookie,
 * then redirects to /me (success) or home with an error flag.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await confirmClaim(token);
  const dest = res.ok
    ? "/me?claimed=1"
    : `/me?claim_error=${encodeURIComponent(res.error ?? "This link could not be used.")}`;
  return NextResponse.redirect(new URL(dest, req.url));
}
