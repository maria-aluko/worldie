# Worldie ⚽ — 2026 World Cup Prediction Game

A bold, gamified web app to predict the 2026 FIFA World Cup, share your picks
everywhere, compare against the crowd, and battle friends on a live leaderboard.

See [`PLAN.md`](./PLAN.md) for the full product/architecture overview.

## Stack

- **Next.js 16 (App Router) + TypeScript** · **Tailwind v4** · **Framer Motion**
- **Supabase Postgres** + **Drizzle ORM**
- **next/og** dynamic share cards · Web Share API
- **football-data.org** (free) live results · seeded 48-team field
- Deploys on **Vercel** (UI + API + Cron) — all free tier

## What works

- `/` landing, `/predict` level chooser, `/predict/[level]` the predictor
  (Casual / Standard / Expert), with an advancement-based bracket + Expert
  scorelines and auto-derived group tables.
- Anonymous play (cookie identity) → entry saved to a private `/p/[slug]` page
  with a shareable card + dynamic OG image (`/p/[slug]/opengraph-image`).
- `/compare` — crowd pick distributions (champion / finalists / Golden Boot).
- `/groups` + `/g/[slug]` — create/join private groups, side-by-side picks and
  a leaderboard that fills in as results arrive.
- `/api/cron/results` — polls results and re-scores every entry (winner base
  points + exact-scoreline bonus + advancement + champion + Golden Boot).

## Getting started

1. **Install**
   ```bash
   npm install
   ```

2. **Create a Supabase project** (free) and copy the Postgres connection string.

3. **Configure env**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `DATABASE_URL` (Supabase pooled URI, port 6543). Optionally add
   `FOOTBALL_DATA_TOKEN` (free at football-data.org) for live results, and a
   `CRON_SECRET`.

4. **Create tables & seed the field**
   ```bash
   npm run db:push      # apply schema to your database
   npm run db:seed      # 48 teams, 12 groups, 72 group matches
   ```

5. **Run**
   ```bash
   npm run dev          # http://localhost:3000
   ```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:push` | Push Drizzle schema to Postgres |
| `npm run db:seed` | Seed teams + group fixtures |
| `npm run db:studio` | Drizzle Studio (browse data) |

## Live scoring

`vercel.json` registers a cron hitting `/api/cron/results` every 10 minutes.
On Vercel, set `CRON_SECRET` and `FOOTBALL_DATA_TOKEN` as env vars. Locally you
can trigger it manually:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/results
```

Scoring rules live in `src/lib/scoring.ts` and are tunable in one place.

## Notes / next steps

- Team field is illustrative; the results feed maps real teams by FIFA 3-letter
  code. Swap `src/lib/data/teams.ts` for the official draw when finalized.
- Future polish: Supabase Realtime for instant leaderboard updates, per-pick
  score breakdowns on the result page, rate limiting, account "claim" via magic
  link.
