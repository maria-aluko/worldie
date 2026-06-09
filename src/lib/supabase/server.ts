import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Whether Supabase Auth is configured. (Google must also be enabled in the
 * Supabase dashboard.) */
export function authConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * A request-scoped Supabase client that reads/writes the auth session cookies.
 * Used only during the sign-in flow (start + callback Route Handlers and
 * logout); our `wid` cookie remains the source of truth for app data.
 *
 * The `setAll` try/catch is the standard @supabase/ssr guard: cookie writes are
 * a no-op when called from a Server Component (only Route Handlers / Server
 * Actions may set cookies), which is fine here since we only sign in/out from
 * Route Handlers and a Server Action.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — ignore.
        }
      },
    },
  });
}
