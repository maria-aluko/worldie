# Worldie — 2026 FIFA World Cup Prediction Game

A gamified, highly shareable web app for making 2026 FIFA World Cup predictions, sharing them
across social media + WhatsApp, comparing against the community, and competing with friends on
live leaderboards.

## Product

- **No signup** — anonymous play saved to a private shareable URL (optional account claim later).
- **3 prediction levels** chosen up front:
  - **Casual** — champion + two finalists.
  - **Standard** — full knockout bracket + champion + Golden Boot.
  - **Expert** — group-stage standings + full bracket + exact scorelines + awards.
- **Hybrid scoring** — base points for a correct match *winner* pick, **bonus** points for a
  correct *exact scoreline*. Deeper levels can earn more.
- **Live scoring** — real results ingested automatically; entries re-scored; live leaderboards.
- **Share** — beautiful per-entry card with dynamic OG image; WhatsApp / X / Facebook /
  Instagram / TikTok / native share.
- **Compare** — you vs. the crowd (pick distributions) and you vs. your friend group.
- **Visual direction** — bold & energetic: vibrant gradients, oversized type, neon accents,
  lively motion — clean, modern, sleek.

Tournament shape (2026): 48 teams, 12 groups of 4 → top 2 + 8 best 3rd-place → Round of 32 →
R16 → QF → SF → 3rd-place + Final. 104 matches.

## Tech Stack (all free tier)

- **Next.js (App Router) + TypeScript** on **Vercel** (UI + API + Cron in one deploy)
- **Supabase Postgres** (+ Realtime for live leaderboards)
- **Drizzle ORM**
- **Tailwind CSS** + **shadcn/ui** (customized) + **Framer Motion**
- **next/og** for dynamic share/OG images; **Web Share API** for native sharing
- Data: **football-data.org** (results) + **openfootball/worldcup.json** (seed fixtures/teams);
  BALLDONTLIE as fallback feed

## Data Model (Postgres / Drizzle)

- `teams` — id, name, code, flag, group_letter
- `matches` — id, stage, group_letter, home_team_id, away_team_id, kickoff_at, status,
  home_score, away_score, external_id
- `users` — id (uuid), display_name, avatar_seed, created_at, claimed_email?
- `entries` — id, user_id, level, slug, created_at, locked_at, total_points
- `entry_picks` — entry_id, ref (match id or slot e.g. `champion`, `golden_boot`),
  pick_team_id, pred_home_score?, pred_away_score?
- `groups` — id, name, invite_slug, created_by_user_id
- `group_members` — group_id, user_id

## Build Phases

0. **Scaffold & design system** — Next.js + Tailwind + deps; bold theme tokens, typography,
   motion primitives, base components; seed teams/matches from openfootball.
1. **Prediction flow** — landing + level chooser; stepped predictor per level; interactive
   bracket; anonymous UUID; save entry → `/p/[slug]`.
2. **Share** — result card + `next/og` image + share row + PNG download.
3. **Compare to the world** — pick-distribution aggregates (Postgres GROUP BY, cached).
4. **Friend groups** — create/join via invite link; side-by-side picks + leaderboard.
5. **Live scoring** — Vercel Cron polls results; re-scores via `lib/scoring.ts`; Realtime
   leaderboard updates.
6. **Polish** — states, mobile pass, micro-interactions, prediction lock at kickoff, rate limit.

## Verification

- Seed yields 48 teams / 12 groups / 104 matches.
- Each level persists an `entry` + `entry_picks`; `/p/[slug]` loads in a fresh session.
- `/api/og?slug=…` renders; link unfurls; Web Share works on mobile.
- Crowd distribution percentages correct against dummy entries.
- Group page shows multiple entries side-by-side; leaderboard reorders live.
- Scoring: winner-only vs. winner+exact-score cases compute correct points.

## Status

- [x] Phase 0 — Scaffold & design system
- [x] Phase 1 — Prediction flow
- [x] Phase 2 — Share
- [x] Phase 3 — Compare to the world
- [x] Phase 4 — Friend groups
- [x] Phase 5 — Live scoring
- [ ] Phase 6 — Polish (in progress: realtime, per-pick breakdowns, rate limiting)
