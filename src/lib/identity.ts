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
