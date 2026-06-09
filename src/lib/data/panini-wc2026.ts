import { TEAMS } from "./teams";

/**
 * Checklist for the Panini World Cup 2026 sticker collection.
 *
 * ⚠️ SCAFFOLD DATA — codes and labels below are PLACEHOLDERS that mirror the
 * real album's shape (an intro section + one section per team). Replace
 * `buildPaniniWc2026()`'s output with the official checklist when it's supplied.
 * Keep it text-only: NO copyrighted images, logos, or player photos — just the
 * official card code and a plain label, which is all the tracker needs.
 *
 * Same role as `teams.ts`: a single source of truth that `scripts/seed.ts`
 * syncs into the `sticker_sets` / `stickers` tables (idempotent, self-healing).
 */

export const PANINI_WC2026_SET_ID = "wc-2026";

export interface StickerSeed {
  /** Official card code printed on the sticker, e.g. "1" or "BRA 3". */
  code: string;
  label: string;
  section: string;
  teamId: string | null;
}

export interface StickerSetSeed {
  id: string;
  name: string;
  season: string;
  stickers: StickerSeed[];
}

// Scaffold knobs — tune to match the real album once known.
const INTRO_STICKERS = [
  "Official Emblem",
  "Official Mascots",
  "The Trophy",
  "Host Cities",
  "Opening Match",
  "Tournament Poster",
];
const PLAYERS_PER_TEAM = 18;

export function buildPaniniWc2026(): StickerSetSeed {
  const stickers: StickerSeed[] = [];
  let n = 0;
  const next = () => String(++n); // sequential card codes, like the real album

  // Intro / tournament section.
  for (const label of INTRO_STICKERS) {
    stickers.push({ code: next(), label, section: "Tournament", teamId: null });
  }

  // One section per team: a team header sticker + squad slots.
  for (const team of TEAMS) {
    stickers.push({
      code: next(),
      label: `${team.name} — Team Badge`,
      section: team.name,
      teamId: team.id,
    });
    for (let i = 1; i <= PLAYERS_PER_TEAM; i++) {
      stickers.push({
        code: next(),
        label: `${team.name} — Squad ${i}`,
        section: team.name,
        teamId: team.id,
      });
    }
  }

  return {
    id: PANINI_WC2026_SET_ID,
    name: "Panini World Cup 2026",
    season: "2026",
    stickers,
  };
}
