import type { Team } from "../types";

/**
 * 48-team field for the 2026 World Cup, drawn into 12 groups (A–L).
 * Illustrative line-up for the prediction game; real fixtures/results are
 * synced from the live feed. Codes are FIFA 3-letter; flags are emoji.
 */
export const TEAMS: Team[] = [
  // Group A
  { id: "MEX", name: "Mexico", code: "MEX", flag: "🇲🇽", group: "A" },
  { id: "CRO", name: "Croatia", code: "CRO", flag: "🇭🇷", group: "A" },
  { id: "NGA", name: "Nigeria", code: "NGA", flag: "🇳🇬", group: "A" },
  { id: "KSA", name: "Saudi Arabia", code: "KSA", flag: "🇸🇦", group: "A" },
  // Group B
  { id: "CAN", name: "Canada", code: "CAN", flag: "🇨🇦", group: "B" },
  { id: "BEL", name: "Belgium", code: "BEL", flag: "🇧🇪", group: "B" },
  { id: "ECU", name: "Ecuador", code: "ECU", flag: "🇪🇨", group: "B" },
  { id: "QAT", name: "Qatar", code: "QAT", flag: "🇶🇦", group: "B" },
  // Group C
  { id: "USA", name: "United States", code: "USA", flag: "🇺🇸", group: "C" },
  { id: "NED", name: "Netherlands", code: "NED", flag: "🇳🇱", group: "C" },
  { id: "EGY", name: "Egypt", code: "EGY", flag: "🇪🇬", group: "C" },
  { id: "AUS", name: "Australia", code: "AUS", flag: "🇦🇺", group: "C" },
  // Group D
  { id: "ARG", name: "Argentina", code: "ARG", flag: "🇦🇷", group: "D" },
  { id: "DEN", name: "Denmark", code: "DEN", flag: "🇩🇰", group: "D" },
  { id: "GHA", name: "Ghana", code: "GHA", flag: "🇬🇭", group: "D" },
  { id: "PAN", name: "Panama", code: "PAN", flag: "🇵🇦", group: "D" },
  // Group E
  { id: "FRA", name: "France", code: "FRA", flag: "🇫🇷", group: "E" },
  { id: "SEN", name: "Senegal", code: "SEN", flag: "🇸🇳", group: "E" },
  { id: "JPN", name: "Japan", code: "JPN", flag: "🇯🇵", group: "E" },
  { id: "NOR", name: "Norway", code: "NOR", flag: "🇳🇴", group: "E" },
  // Group F
  { id: "BRA", name: "Brazil", code: "BRA", flag: "🇧🇷", group: "F" },
  { id: "SUI", name: "Switzerland", code: "SUI", flag: "🇨🇭", group: "F" },
  { id: "KOR", name: "South Korea", code: "KOR", flag: "🇰🇷", group: "F" },
  { id: "CRC", name: "Costa Rica", code: "CRC", flag: "🇨🇷", group: "F" },
  // Group G
  { id: "ESP", name: "Spain", code: "ESP", flag: "🇪🇸", group: "G" },
  { id: "URU", name: "Uruguay", code: "URU", flag: "🇺🇾", group: "G" },
  { id: "IRN", name: "Iran", code: "IRN", flag: "🇮🇷", group: "G" },
  { id: "NZL", name: "New Zealand", code: "NZL", flag: "🇳🇿", group: "G" },
  // Group H
  { id: "ENG", name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "H" },
  { id: "SRB", name: "Serbia", code: "SRB", flag: "🇷🇸", group: "H" },
  { id: "CIV", name: "Côte d'Ivoire", code: "CIV", flag: "🇨🇮", group: "H" },
  { id: "JAM", name: "Jamaica", code: "JAM", flag: "🇯🇲", group: "H" },
  // Group I
  { id: "POR", name: "Portugal", code: "POR", flag: "🇵🇹", group: "I" },
  { id: "COL", name: "Colombia", code: "COL", flag: "🇨🇴", group: "I" },
  { id: "MAR", name: "Morocco", code: "MAR", flag: "🇲🇦", group: "I" },
  { id: "TUN", name: "Tunisia", code: "TUN", flag: "🇹🇳", group: "I" },
  // Group J
  { id: "GER", name: "Germany", code: "GER", flag: "🇩🇪", group: "J" },
  { id: "PER", name: "Peru", code: "PER", flag: "🇵🇪", group: "J" },
  { id: "CMR", name: "Cameroon", code: "CMR", flag: "🇨🇲", group: "J" },
  { id: "WAL", name: "Wales", code: "WAL", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", group: "J" },
  // Group K
  { id: "ITA", name: "Italy", code: "ITA", flag: "🇮🇹", group: "K" },
  { id: "POL", name: "Poland", code: "POL", flag: "🇵🇱", group: "K" },
  { id: "ALG", name: "Algeria", code: "ALG", flag: "🇩🇿", group: "K" },
  { id: "CHI", name: "Chile", code: "CHI", flag: "🇨🇱", group: "K" },
  // Group L
  { id: "SWE", name: "Sweden", code: "SWE", flag: "🇸🇪", group: "L" },
  { id: "TUR", name: "Türkiye", code: "TUR", flag: "🇹🇷", group: "L" },
  { id: "PAR", name: "Paraguay", code: "PAR", flag: "🇵🇾", group: "L" },
  { id: "UKR", name: "Ukraine", code: "UKR", flag: "🇺🇦", group: "L" },
];

export const TEAMS_BY_ID = new Map(TEAMS.map((t) => [t.id, t]));
