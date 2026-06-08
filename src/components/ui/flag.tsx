import { cn } from "@/lib/utils";

/**
 * Renders a team flag as an image.
 *
 * Flags are stored as emoji, but many platforms (notably Windows, whose emoji
 * font has no country-flag glyphs) render flag emoji as bare two-letter codes,
 * and the England/Scotland tag-sequence emoji as a black flag 🏴. To get a
 * consistent flag everywhere we map the emoji to its Twemoji image — the same
 * asset set the OG share image uses (`emoji: "twemoji"`).
 *
 * A value that is already a URL/path (the `Team.flag` field is documented as
 * "emoji or url") is rendered directly.
 */
const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";

/** Emoji string → hyphenated codepoint hex, e.g. "🇧🇷" → "1f1e7-1f1f7" (Twemoji filename). */
function toCodePoint(emoji: string): string {
  const points: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    // Drop the variation selector, matching Twemoji's filename convention.
    if (cp && cp !== 0xfe0f) points.push(cp.toString(16));
  }
  return points.join("-");
}

function imageSrc(flag: string): string {
  if (flag.startsWith("/") || flag.startsWith("http")) return flag;
  return `${TWEMOJI_BASE}${toCodePoint(flag)}.svg`;
}

export function Flag({ flag, className }: { flag: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- inline 1em glyph sized by font-size; next/image adds no value
    <img
      src={imageSrc(flag)}
      alt=""
      aria-hidden
      className={cn("inline-block h-[1em] w-auto align-[-0.125em]", className)}
    />
  );
}
