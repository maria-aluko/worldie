import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUser, getUserIdFromCookie, setUserIdCookie } from "@/lib/identity";
import { mergeUsers } from "@/lib/actions/merge";

/**
 * Supabase redirects here after Google consent. We exchange the code for a
 * Supabase session, read the verified profile, then resolve it to one of our
 * own `users` rows (creating/linking as needed and folding in any anonymous
 * data done on this device), set the `wid` identity cookie, and return the user
 * to where they started.
 */
export async function GET(req: NextRequest) {
  const fail = (msg: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, req.url));

  const rawReturn = req.nextUrl.searchParams.get("returnTo") ?? "/album";
  const returnTo = rawReturn.startsWith("/") ? rawReturn : "/album";
  const code = req.nextUrl.searchParams.get("code");
  if (req.nextUrl.searchParams.get("error")) return fail("Sign-in was cancelled.");
  if (!code) return fail("Missing sign-in details.");

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("exchangeCodeForSession failed", exchangeError);
      return fail("Sign-in expired. Please try again.");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Could not complete sign-in.");

    const authUserId = user.id;
    const email = user.email ?? null;
    const name =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null;

    // Which of our accounts does this identity already map to? (by auth id, then email)
    let [account] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.authUserId, authUserId))
      .limit(1);
    if (!account && email) {
      const [byEmail] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.claimedEmail, email))
        .limit(1);
      if (byEmail) {
        await db
          .update(schema.users)
          .set({ authUserId })
          .where(eq(schema.users.id, byEmail.id));
        account = byEmail;
      }
    }

    const currentId = await getUserIdFromCookie();

    if (account) {
      // Returning account: adopt it here, folding in this device's anon data.
      if (currentId && currentId !== account.id) await mergeUsers(currentId, account.id);
      await setUserIdCookie(account.id);
    } else {
      // First link: attach the account to the current identity (or a fresh one).
      const userId = await ensureUser();
      const [cur] = await db
        .select({
          authUserId: schema.users.authUserId,
          displayName: schema.users.displayName,
          email: schema.users.claimedEmail,
        })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (cur?.authUserId && cur.authUserId !== authUserId) {
        // Current identity belongs to a different account — start fresh.
        const [created] = await db
          .insert(schema.users)
          .values({ authUserId, claimedEmail: email, displayName: name })
          .returning({ id: schema.users.id });
        await setUserIdCookie(created.id);
      } else {
        await db
          .update(schema.users)
          .set({
            authUserId,
            claimedEmail: email ?? cur?.email ?? null,
            displayName: cur?.displayName ?? name ?? null,
          })
          .where(eq(schema.users.id, userId));
      }
    }

    return NextResponse.redirect(new URL(returnTo, req.url));
  } catch (err) {
    console.error("google callback failed", err);
    return fail("Could not complete sign-in.");
  }
}
