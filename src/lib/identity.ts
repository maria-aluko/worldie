import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const COOKIE = "wid";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Read the anonymous player id from the cookie, if present. Does not create one
 * (cookies can only be written in Server Actions / Route Handlers).
 */
export async function getUserIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/** Persist the anonymous player id to the cookie. Call from a Server Action. */
export async function setUserIdCookie(id: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
    path: "/",
  });
}

/** Drop the identity cookie (logout). The user becomes anonymous again; a fresh
 * identity is created on their next action. Any linked account row is untouched,
 * so logging back in restores it. */
export async function clearUserIdCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Resolve the current player, creating one (and the cookie) if needed. The
 * single source of truth for anonymous identity — call from Server Actions.
 */
export async function ensureUser(): Promise<string> {
  let userId = await getUserIdFromCookie();
  if (userId) {
    const [u] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!u) userId = null;
  }
  if (!userId) {
    const [u] = await db.insert(schema.users).values({}).returning({ id: schema.users.id });
    userId = u.id;
    await setUserIdCookie(userId);
  }
  return userId;
}

export interface AuthedUser {
  id: string;
  email: string | null;
  displayName: string | null;
  /** True once the player has linked a real account (Supabase Auth / Google). */
  isLoggedIn: boolean;
}

/**
 * The current player as an account-aware view. Returns null if there's no
 * identity cookie yet. `isLoggedIn` is true when the identity has a linked
 * account — the `wid` cookie remains the credential for app data, matching the
 * existing trust model. Read-only: safe to call from Server Components.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const userId = await getUserIdFromCookie();
  if (!userId) return null;
  const [u] = await db
    .select({
      id: schema.users.id,
      email: schema.users.claimedEmail,
      displayName: schema.users.displayName,
      authUserId: schema.users.authUserId,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    isLoggedIn: u.authUserId != null,
  };
}

/** The current player if they're logged in, else null. Use to gate the album. */
export async function requireLoggedInUser(): Promise<AuthedUser | null> {
  const user = await getAuthedUser();
  return user?.isLoggedIn ? user : null;
}
