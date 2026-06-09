"use server";

import { redirect } from "next/navigation";
import { clearUserIdCookie } from "@/lib/identity";
import { authConfigured, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Log out: clear the Supabase session and drop our identity cookie, then return
 * to the home page. The account row (and its account link) is kept, so
 * "Continue with Google" restores it.
 */
export async function logout(): Promise<void> {
  if (authConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("supabase signOut failed", err);
    }
  }
  await clearUserIdCookie();
  redirect("/");
}
