import type { Team } from "../types";

/**
 * 48-team field for the 2026 World Cup, drawn into 12 groups (A–L).
 * Illustrative line-up for the prediction game; real fixtures/results are
 * synced from the live feed. Codes are FIFA 3-letter; flags are emoji.
 */
export const TEAMS: Team[] = [
  // Group A
  { id: "MEX", name: "Mexico", code: "MEX", flag: "🇲🇽", group: "A" },
  { id: "RSA", name: "South Africa", code: "RSA", flag: "🇿🇦", group: "A" },
  { id: "KOR", name: "South Korea", code: "KOR", flag: "🇰🇷", group: "A" },
  { id: "CZE", name: "Czechia", code: "CZE", flag: "🇨🇿", group: "A" },
  // Group B
  { id: "CAN", name: "Canada", code: "CAN", flag: "🇨🇦", group: "B" },
  { id: "BIH", name: "Bosnia-Herzegovina", code: "BIH", flag: "🇧🇦", group: "B" },
  { id: "QAT", name: "Qatar", code: "QAT", flag: "🇶🇦", group: "B" },
  { id: "SUI", name: "Switzerland", code: "SUI", flag: "🇨🇭", group: "B" },
  // Group C
  { id: "BRA", name: "Brazil", code: "BRA", flag: "🇧🇷", group: "C" },
  { id: "MAR", name: "Morocco", code: "MAR", flag: "🇲🇦", group: "C" },
  { id: "HAI", name: "Haiti", code: "HAI", flag: "🇭🇹", group: "C" },
  { id: "SCO", name: "Scotland", code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C" },
  // Group D
  { id: "USA", name: "United States", code: "USA", flag: "🇺🇸", group: "D" },
  { id: "PAR", name: "Paraguay", code: "PAR", flag: "🇵🇾", group: "D" },
  { id: "AUS", name: "Australia", code: "AUS", flag: "🇦🇺", group: "D" },
  { id: "TUR", name: "Türkiye", code: "TUR", flag: "🇹🇷", group: "D" },
  // Group E
  { id: "GER", name: "Germany", code: "GER", flag: "🇩🇪", group: "E" },
  { id: "CUW", name: "Curaçao", code: "CUW", flag: "🇨🇼", group: "E" },
  { id: "CIV", name: "Côte d'Ivoire", code: "CIV", flag: "🇨🇮", group: "E" },
  { id: "ECU", name: "Ecuador", code: "ECU", flag: "🇪🇨", group: "E" },
  // Group F
  { id: "NED", name: "Netherlands", code: "NED", flag: "🇳🇱", group: "F" },
  { id: "JPN", name: "Japan", code: "JPN", flag: "🇯🇵", group: "F" },
  { id: "SWE", name: "Sweden", code: "SWE", flag: "🇸🇪", group: "F" },
  { id: "TUN", name: "Tunisia", code: "TUN", flag: "🇹🇳", group: "F" },
  // Group G
  { id: "BEL", name: "Belgium", code: "BEL", flag: "🇧🇪", group: "G" },
  { id: "EGY", name: "Egypt", code: "EGY", flag: "🇪🇬", group: "G" },
  { id: "IRN", name: "Iran", code: "IRN", flag: "🇮🇷", group: "G" },
  { id: "NZL", name: "New Zealand", code: "NZL", flag: "🇳🇿", group: "G" },
  // Group H
  { id: "ESP", name: "Spain", code: "ESP", flag: "🇪🇸", group: "H" },
  { id: "CPV", name: "Cape Verde", code: "CPV", flag: "🇨🇻", group: "H" },
  { id: "KSA", name: "Saudi Arabia", code: "KSA", flag: "🇸🇦", group: "H" },
  { id: "URU", name: "Uruguay", code: "URU", flag: "🇺🇾", group: "H" },
  // Group I
  { id: "FRA", name: "France", code: "FRA", flag: "🇫🇷", group: "I" },
  { id: "SEN", name: "Senegal", code: "SEN", flag: "🇸🇳", group: "I" },
  { id: "IRQ", name: "Iraq", code: "IRQ", flag: "🇮🇶", group: "I" },
  { id: "NOR", name: "Norway", code: "NOR", flag: "🇳🇴", group: "I" },
  // Group J
  { id: "ARG", name: "Argentina", code: "ARG", flag: "🇦🇷", group: "J" },
  { id: "ALG", name: "Algeria", code: "ALG", flag: "🇩🇿", group: "J" },
  { id: "AUT", name: "Austria", code: "AUT", flag: "🇦🇹", group: "J" },
  { id: "JOR", name: "Jordan", code: "JOR", flag: "🇯🇴", group: "J" },
  // Group K
  { id: "POR", name: "Portugal", code: "POR", flag: "🇵🇹", group: "K" },
  { id: "COD", name: "Congo DR", code: "COD", flag: "🇨🇩", group: "K" },
  { id: "UZB", name: "Uzbekistan", code: "UZB", flag: "🇺🇿", group: "K" },
  { id: "COL", name: "Colombia", code: "COL", flag: "🇨🇴", group: "K" },
  // Group L
  { id: "ENG", name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L" },
  { id: "CRO", name: "Croatia", code: "CRO", flag: "🇭🇷", group: "L" },
  { id: "GHA", name: "Ghana", code: "GHA", flag: "🇬🇭", group: "L" },
  { id: "PAN", name: "Panama", code: "PAN", flag: "🇵🇦", group: "L" },
];

export const TEAMS_BY_ID = new Map(TEAMS.map((t) => [t.id, t]));
