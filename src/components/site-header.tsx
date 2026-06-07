import { Wordmark } from "./ui/wordmark";
import { Button } from "./ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Wordmark />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button href="/compare" variant="ghost" size="sm">
            The Crowd
          </Button>
          <Button href="/groups" variant="ghost" size="sm">
            Groups
          </Button>
          <Button href="/predict" size="sm" className="hidden sm:inline-flex">
            Play
          </Button>
        </nav>
      </div>
    </header>
  );
}
