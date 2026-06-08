# Worldie ⚽ Prediction Game

Live link <a href="https://worldie-lac.vercel.app/" target="_blank">https://worldie-lac.vercel.app/</a>

A gamified web app to predict the 2026 FIFA World Cup, share your picks
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

## Scripts

| Script                    | Purpose                         |
| ------------------------- | ------------------------------- |
| `npm run dev`             | Dev server                      |
| `npm run build` / `start` | Production build / serve        |
| `npm run lint`            | ESLint                          |
| `npm run db:push`         | Push Drizzle schema to Postgres |
| `npm run db:seed`         | Seed teams + group fixtures     |
| `npm run db:studio`       | Drizzle Studio (browse data)    |

## Live scoring

`vercel.json` registers a cron hitting `/api/cron/results` once a day (should be updated for more frequent hit later e.g. every 10 minutes. Currently limited by free tier allowance on vercel).
To locally trigger it:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/results
```

Scoring rules live in `src/lib/scoring.ts` and are tunable in one place.

## Notes / next steps

- Multi-language support
- Supabase Realtime for instant leaderboard updates, per-pick
  score breakdowns on the result page, rate limiting, account "claim" via magic
  link.
- Add other major tournaments
- Add reward-pool for groups
