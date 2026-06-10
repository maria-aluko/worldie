"use client";
import { logout } from "@/lib/actions/auth";
import { navMenuItemClass } from "./ui/nav-menu";

/**
 * Log out control for the Account dropdown. The form lives inside `NavMenu`,
 * whose container closes the menu on any click (`onClick={() => setOpen(false)}`).
 * That would unmount this form before the submit fires — a discrete click flushes
 * the unmount synchronously — so we stop the click from bubbling to the menu.
 * The redirect in `logout` dismisses the menu anyway once it navigates.
 */
export function LogoutButton() {
  return (
    <form action={logout} onClick={(e) => e.stopPropagation()}>
      <button type="submit" className={navMenuItemClass}>
        Log out
      </button>
    </form>
  );
}
