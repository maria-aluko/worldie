"use server";

import { revalidatePath } from "next/cache";
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
  // Purge the client Router Cache so the layout (and its SiteHeader navbar)
  // re-renders without the now-deleted `wid` cookie. Without this, the soft
  // navigation from redirect() reuses the cached, still-logged-in navbar.
  revalidatePath("/", "layout");
  redirect("/");
}
