import { TEAMS } from "./teams";
import type { Tier } from "../types";

/**
 * Checklist for the Panini World Cup 2026 sticker collection.
 *
 * CODES are real and follow the official scheme (sourced from public checklists):
 *   - "00"            Panini logo
 *   - "FWC1".."FWC19" tournament foils (emblem/mascots/slogan/ball, host-country
 *                     foils CAN/MEX/USA, FIFA Museum past-winner foils)
 *   - "<CODE>1".."<CODE>20" for each of the 48 teams (per-team country code from
 *     teams.ts; 1–2 = badge foils, 13 = team photo, the rest are players)
 *   - Extra Stickers: 20 ultra-rare players keyed by country code
 *
 * LABELS are partly placeholders — the individual player NAMES aren't encoded
 * here yet (drop them in when you have the verbatim list). Keep it text-only: NO
 * copyrighted images, logos, or photos — just the official code + a plain label.
 *
 * Same role as `teams.ts`: a single source of truth that `scripts/seed.ts` syncs
 * into the `sticker_sets` / `stickers` tables (idempotent, self-healing).
 */

export const PANINI_WC2026_SET_ID = "wc-2026";

export interface StickerSeed {
  /** Official card code printed on the sticker, e.g. "FWC9" or "BRA13". */
  code: string;
  label: string;
  section: string;
  teamId: string | null;
  /** Finish for Extra Stickers ("bronze"|"silver"|"gold"); null for regular. */
  tier: Tier | null;
}

export interface StickerSetSeed {
  id: string;
  name: string;
  season: string;
  stickers: StickerSeed[];
}

/** 20 stickers per team. Slots 1–2 are badge foils, 13 is the team photo. */
const TEAM_STICKERS = 20;
const TEAM_BADGE_SLOTS = 2;
const TEAM_PHOTO_SLOT = 13;

/** Best-known labels for the tournament foils; the rest are museum winners. */
const FWC_LABELS: Record<number, string> = {
  1: "Official Emblem",
  2: "Official Mascots",
  3: "Official Slogan",
  4: "Official Ball",
  5: "Trophy",
  6: "Host Country — Canada",
  7: "Host Country — Mexico",
  8: "Host Country — USA",
};

/** Each Extra player exists in these three finishes, tracked separately. */
const EXTRA_TIERS: Tier[] = ["bronze", "silver", "gold"];

const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

/**
 * The 20 Extra Stickers. No number is printed on the back, so we key each by the
 * player's country code. Each exists in bronze / silver / gold finishes, seeded
 * as three separate rows sharing the country code but differing by `tier`.
 */
const EXTRA_PLAYERS: { code: string; name: string }[] = [
  { code: "ARG", name: "Lionel Messi" },
  { code: "BEL", name: "Jérémy Doku" },
  { code: "BRA", name: "Vinícius Júnior" },
  { code: "CAN", name: "Alphonso Davies" },
  { code: "COL", name: "Luis Díaz" },
  { code: "CRO", name: "Luka Modrić" },
  { code: "ECU", name: "Moisés Caicedo" },
  { code: "EGY", name: "Mohamed Salah" },
  { code: "ENG", name: "Jude Bellingham" },
  { code: "FRA", name: "Kylian Mbappé" },
  { code: "GER", name: "Florian Wirtz" },
  { code: "KOR", name: "Heung-min Son" },
  { code: "MEX", name: "Raúl Jiménez" },
  { code: "MAR", name: "Achraf Hakimi" },
  { code: "NED", name: "Cody Gakpo" },
  { code: "NOR", name: "Erling Haaland" },
  { code: "POR", name: "Cristiano Ronaldo" },
  { code: "ESP", name: "Lamine Yamal" },
  { code: "URU", name: "Federico Valverde" },
  { code: "USA", name: "Christian Pulisic" },
];

export function buildPaniniWc2026(): StickerSetSeed {
  const stickers: StickerSeed[] = [];
  const push = (
    code: string,
    label: string,
    section: string,
    teamId: string | null = null,
    tier: Tier | null = null,
  ) => stickers.push({ code, label, section, teamId, tier });

  // Tournament / intro: "00" + "FWC1".."FWC19".
  push("00", "Panini Logo", "Tournament");
  for (let i = 1; i <= 19; i++) {
    push(`FWC${i}`, FWC_LABELS[i] ?? "FIFA Museum — Past Winner", "Tournament");
  }

  // One section per team: "<CODE>1".."<CODE>20".
  for (const team of TEAMS) {
    for (let i = 1; i <= TEAM_STICKERS; i++) {
      const label =
        i <= TEAM_BADGE_SLOTS
          ? "Team Badge (foil)"
          : i === TEAM_PHOTO_SLOT
            ? "Team Photo"
            : "Player";
      push(`${team.code}${i}`, label, team.name, team.id);
    }
  }

  // Extra Stickers: ultra-rare players (no team link), one row per finish.
  for (const p of EXTRA_PLAYERS) {
    for (const tier of EXTRA_TIERS) {
      push(p.code, `${p.name} (Extra · ${TIER_LABEL[tier]})`, "Extra Stickers", null, tier);
    }
  }

  return {
    id: PANINI_WC2026_SET_ID,
    name: "Panini World Cup 2026",
    season: "2026",
    stickers,
  };
}
