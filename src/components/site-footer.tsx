import { Wordmark } from "./ui/wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-faint sm:flex-row">
        <Wordmark className="text-lg" />
        <p className="text-center sm:text-right">
          Predict the 2026 World Cup. Not affiliated with FIFA.
          <br className="sm:hidden" /> Made for the love of the game.
        </p>
      </div>
    </footer>
  );
}
