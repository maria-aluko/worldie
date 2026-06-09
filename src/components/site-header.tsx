import { Wordmark } from "./ui/wordmark";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ui/theme-toggle";
import {
  NavMenu,
  NavMenuItem,
  NavMenuLabel,
  NavMenuDivider,
  navMenuItemClass,
} from "./ui/nav-menu";
import { getAuthedUser } from "@/lib/identity";
import { logout } from "@/lib/actions/auth";

export async function SiteHeader() {
  const user = await getAuthedUser();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Wordmark />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            href="/album"
            variant="ghost"
            size="sm"
            className="hidden px-3 sm:inline-flex"
          >
            Stickers
          </Button>
          <Button
            href="/compare"
            variant="ghost"
            size="sm"
            className="hidden px-3 sm:inline-flex"
          >
            The Crowd
          </Button>

          {/* Secondary links. Stickers + The Crowd fold in here on mobile. */}
          <NavMenu label="More">
            <NavMenuItem href="/album" className="sm:hidden">
              Stickers
            </NavMenuItem>
            <NavMenuItem href="/compare" className="sm:hidden">
              The Crowd
            </NavMenuItem>
            <NavMenuItem href="/groups">Groups</NavMenuItem>
            <NavMenuItem href="/how-it-works">How it works</NavMenuItem>
          </NavMenu>

          <ThemeToggle />

          <Button href="/predict" size="sm">
            Play
          </Button>

          <NavMenu label="Account">
            {user?.displayName || user?.email ? (
              <>
                <NavMenuLabel>{user.displayName ?? user.email}</NavMenuLabel>
                <NavMenuDivider />
              </>
            ) : null}
            <NavMenuItem href="/me">My stuff</NavMenuItem>
            <NavMenuDivider />
            {user?.isLoggedIn ? (
              <form action={logout}>
                <button type="submit" className={navMenuItemClass}>
                  Log out
                </button>
              </form>
            ) : (
              <NavMenuItem href="/login">Log in</NavMenuItem>
            )}
          </NavMenu>
        </nav>
      </div>
    </header>
  );
}
