# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is TripTangle

AI-powered group travel date coordination app. Users create a trip, share a link via WhatsApp, group members mark availability on a calendar, Claude AI finds the best dates, and the group votes to lock dates. No authentication — identity via display name + localStorage.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (validates TypeScript)
npm run start        # Start production server
```

No test framework is configured yet.

## Environment Variables

Copy `.env.example` to `.env.local`. Required:
- `ANTHROPIC_API_KEY` — Claude API key (server-side only, used in `src/lib/claude.ts`)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `NEXT_PUBLIC_BASE_URL` — App URL for shareable links (e.g., `http://localhost:3000`)

## Database

Schema lives in `supabase/schema.sql`. Run it in the Supabase SQL Editor to initialize. Tables: `trips`, `members`, `availability`, `ai_recommendations`, `votes`. Supabase Realtime is enabled on `members`, `availability`, and `votes`.

RLS is enabled with permissive anon policies — security relies on trip IDs being unguessable (12-char alphanumeric).

## Architecture

**Next.js 15 App Router** with TypeScript, Tailwind CSS v4, shadcn/ui (v4, base-ui — no `asChild` prop, use `render` or className on trigger directly).

### Key patterns

- **Server Components as shells**: `src/app/trip/[id]/page.tsx` fetches initial data server-side, passes to `TripDashboard` client component.
- **Client Components for interactivity**: Everything under `src/components/` that uses hooks/state is `'use client'`.
- **Realtime**: Three hooks (`use-realtime-members`, `use-realtime-availability`, `use-realtime-votes`) subscribe to Supabase `postgres_changes`. Each takes server-fetched initial data as seed, then patches with live events.
- **Identity without auth**: `use-member-identity` hook reads/writes `triptangle_member_{tripId}` in localStorage. `member_id` is sent in API request bodies, not cookies/headers.
- **Availability cycling**: Tap a date cell to cycle: available → maybe → unavailable → clear. Debounced 300ms before API call. Optimistic local state in `CalendarGrid`.
- **AI recommendations**: `src/lib/claude.ts` calls `claude-sonnet-4-20250514`. Cached in DB — only re-runs if availability has been updated since last recommendation. Gated behind 3+ members submitting availability.

### Data flow

```
Landing (/) → Create (/create) → Trip Dashboard (/trip/[id])
                                       ↕ Join (/trip/[id]/join)
```

Trip dashboard sections (in order): Header → Lock Banner (if locked) → Members → Calendar (if not locked) → Heatmap → AI Recommendation / Vote Poll → What's Next (if locked).

### API routes

All under `src/app/api/trips/`:
- `POST /api/trips` — create trip + creator member
- `GET /api/trips/[id]` — full trip data (trip + members + availability + recommendation + votes)
- `POST /api/trips/[id]/join` — join with display name
- `POST /api/trips/[id]/availability` — upsert availability (or delete if status is null)
- `POST /api/trips/[id]/recommend` — trigger Claude AI recommendation
- `POST /api/trips/[id]/vote` — upsert vote
- `POST /api/trips/[id]/lock` — lock dates (creator only)

## Brand

- Primary: `#1A5276` (deep teal), Secondary: `#2980B9` (bright blue), Accent: `#27AE60` (green)
- CSS custom properties: `--color-brand-deep`, `--color-brand-bright`, `--color-brand-green`, `--color-brand-amber`, `--color-brand-red`, `--color-brand-light`
- Tailwind classes: `bg-brand-deep`, `text-brand-bright`, `bg-brand-green`, etc.
- Font: Inter (loaded via `next/font/google`)

## Deployment

```bash
vercel
```

Set environment variables in Vercel dashboard. Run `supabase/schema.sql` in Supabase SQL Editor before first use.
