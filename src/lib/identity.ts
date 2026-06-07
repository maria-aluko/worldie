import "server-only";
import { cookies } from "next/headers";

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
