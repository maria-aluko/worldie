const QUERY = "Panini World Cup 2026 stickers";

// Generic, non-affiliate search links — a gentle nudge to go fill the gaps.
const SHOPS: { name: string; href: string }[] = [
  { name: "eBay", href: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(QUERY)}` },
  { name: "Amazon", href: `https://www.amazon.com/s?k=${encodeURIComponent(QUERY)}` },
];

/** Where to buy more stickers / packets. */
export function BuyLinks() {
  return (
    <div className="rounded-3xl border border-white/10 bg-ink-600/40 p-5">
      <p className="font-display text-sm font-bold">Need more stickers?</p>
      <p className="mt-1 text-sm text-muted">
        Grab packets or chase singles to finish your album.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {SHOPS.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/20 px-4 text-xs font-display font-bold uppercase tracking-wide text-paper transition-colors hover:border-lime hover:text-lime"
          >
            Search {s.name} ↗
          </a>
        ))}
      </div>
    </div>
  );
}
