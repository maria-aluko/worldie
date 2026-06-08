import { Wordmark } from "./ui/wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-faint sm:flex-row">
        <Wordmark className="text-lg" />
        <div className="flex flex-col items-center gap-1 sm:items-end">
          <p className="text-center sm:text-right">
            Predict the 2026 World Cup. Not affiliated with FIFA.
            <br className="sm:hidden" /> Made for the love of the game.
          </p>
          <p className="text-faint/60">&copy; {new Date().getFullYear()} Maria Aluko. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
