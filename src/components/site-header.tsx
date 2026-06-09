import { Wordmark } from "./ui/wordmark";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ui/theme-toggle";
import { getAuthedUser } from "@/lib/identity";
import { logout } from "@/lib/actions/auth";

export async function SiteHeader() {
  const user = await getAuthedUser();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Wordmark />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button href="/compare" variant="ghost" size="sm" className="px-2">
            <span className="hidden sm:inline">The </span>Crowd
          </Button>
          <Button href="/groups" variant="ghost" size="sm" className="px-2">
            Groups
          </Button>
          <Button href="/album" variant="ghost" size="sm" className="px-2">
            Album
          </Button>
          <Button href="/me" variant="ghost" size="sm" className="px-2">
            <span className="sm:hidden">Me</span>
            <span className="hidden sm:inline">My stuff</span>
          </Button>
          <Button
            href="/how-it-works"
            variant="ghost"
            size="sm"
            className="hidden px-2 sm:inline-flex"
          >
            How it works
          </Button>
          <ThemeToggle />
          {user?.isLoggedIn ? (
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm" className="px-2">
                Log out
              </Button>
            </form>
          ) : (
            <Button href="/login" variant="ghost" size="sm" className="px-2">
              Log in
            </Button>
          )}
          <Button href="/predict" size="sm" className="hidden sm:inline-flex">
            Play
          </Button>
        </nav>
      </div>
    </header>
  );
}
