import Link from "next/link";
import { Wordmark } from "./ui/wordmark";

const LINKS = [
  { href: "/predict", label: "Play" },
  { href: "/compare", label: "The Crowd" },
  { href: "/album", label: "Stickers" },
  { href: "/groups", label: "Groups" },
  { href: "/how-it-works", label: "How it works" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-faint">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Wordmark className="text-lg" />
            <p className="max-w-xs text-center sm:text-left">
              Predict the 2026 World Cup. Not affiliated with FIFA. Made for the
              love of the game.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-faint transition-colors hover:text-paper"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 text-center text-faint/60 sm:text-left">
          &copy; {new Date().getFullYear()} Maria Aluko. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
