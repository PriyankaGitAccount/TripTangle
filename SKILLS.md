# TripTangle — Skills & Technology Index

> A full-stack AI-powered group travel coordination app built end-to-end.
> This document maps every major skill demonstrated in the codebase.

---

## 1. Frontend Engineering

### Framework & Runtime
| Skill | Detail |
|---|---|
| **Next.js 16 App Router** | File-based routing, Server Components as data-fetching shells, Client Components for interactivity |
| **React 19** | Hooks (`useState`, `useEffect`, `useCallback`, `useRef`), concurrent features |
| **TypeScript 5** | Strict typing across all components, API routes, and database models |
| **Server Components** | `app/trip/[id]/page.tsx` fetches all data server-side via parallel `Promise.all`, passes as props |
| **Client Components** | All interactive UI under `src/components/` uses `'use client'` and local state |

### Styling
| Skill | Detail |
|---|---|
| **Tailwind CSS v4** | Utility-first styling, custom brand colour tokens via `@theme inline` CSS custom properties |
| **Responsive design** | Mobile-first grid (`grid-cols-1 md:grid-cols-[360px_1fr]`), sticky panels, collapsing layouts |
| **CSS animations** | Keyframe `float` and `shimmer` animations on landing page via `<style>` injection |
| **shadcn/ui (v4, Base UI)** | Headless accessible components — Dialog, Badge, Button, Card, Input, Sonner toasts |
| **Design system** | Custom brand palette (`--color-brand-deep`, `--color-brand-bright`, `--color-brand-green`, etc.) applied via Tailwind class aliases |

### UX Patterns
| Skill | Detail |
|---|---|
| **Optimistic UI** | `CalendarGrid` updates local state immediately on tap, then debounces the API call 300ms — reverts on error |
| **Debouncing** | `useRef<Map<string, NodeJS.Timeout>>` per date cell prevents API floods during rapid tapping |
| **Intersection of concerns** | Personal calendar (input) and group heatmap (output) shown side-by-side so users see the effect of their choices instantly |
| **Progressive disclosure** | AI recommendation panel auto-shows only after ≥2 members submit; vote panel appears only after recommendation exists |
| **Toast notifications** | `sonner` toasts for success/error on all async operations |
| **Loading states** | Spinners, inline loading text, and skeleton-style states for every async action |

---

## 2. Backend Engineering

### API Design
| Skill | Detail |
|---|---|
| **Next.js Route Handlers** | 20+ REST endpoints under `src/app/api/trips/` — all typed with `NextRequest` / `NextResponse` |
| **Input validation** | Required-field checks, date ordering (client + server), constraint error handling (Supabase `23505` unique violations) |
| **Parallel data fetching** | `Promise.all([...])` across 9 Supabase queries in plan page — zero serial waterfalls |
| **Authorization** | Lock-dates endpoint verifies `member_id === trip.creator_member_id` server-side; photo delete verifies ownership |
| **Idempotent schema** | `DROP POLICY IF EXISTS` before every `CREATE POLICY`; `ALTER PUBLICATION` wrapped in `DO $$ BEGIN IF NOT EXISTS` guards |

### Database
| Skill | Detail |
|---|---|
| **PostgreSQL** | 12-table schema: `trips`, `members`, `availability`, `ai_recommendations`, `votes`, `itineraries`, `itinerary_suggestions`, `map_pins`, `polls`, `poll_responses`, `expenses`, `trip_photos` |
| **Supabase** | Managed Postgres + Realtime + Storage with JS client (`@supabase/supabase-js`) |
| **Schema design** | Unique constraints enforce one-vote, one-availability-per-date, one-response-per-poll at DB level |
| **Upsert pattern** | Availability, votes, poll responses all use upsert — same API call handles create and update |
| **Row Level Security** | RLS enabled on all tables; permissive anon policies; security relies on unguessable 12-char trip IDs |
| **Cascading deletes** | `ON DELETE CASCADE` on all foreign keys |
| **Supabase Storage** | `trip-photos` public bucket; uploads use service role key server-side; reads use public URL pattern |
| **JSONB columns** | `recommendation_json`, `itinerary_json`, `options` (polls), `split_among` (expenses) — flexible nested data |

---

## 3. Real-time Engineering

| Skill | Detail |
|---|---|
| **Supabase Realtime** | `postgres_changes` subscriptions on `members`, `availability`, `votes`, `map_pins`, `polls`, `poll_responses`, `expenses`, `trip_photos` |
| **Seed + patch pattern** | Every realtime hook accepts server-fetched `initial*` data and patches local state on INSERT/UPDATE/DELETE — no full refetch |
| **Custom React hooks** | `useRealtimeMembers`, `useRealtimeAvailability`, `useRealtimeVotes`, `useRealtimePins`, `useRealtimePolls`, `useRealtimeExpenses`, `useRealtimePhotos` |
| **Event handling** | `payload.eventType` (not `payload.event`) — consistent across all hooks |
| **Channel scoping** | Each subscription filtered by `trip_id` — only receives events for the current trip |
| **Deduplication** | Vote upserts use `member_id` to find and overwrite existing entry in local state |

---

## 4. AI Engineering

### Claude Integration
| Skill | Detail |
|---|---|
| **Anthropic SDK** | `@anthropic-ai/sdk` — `messages.create` with `claude-haiku-4-5-20251001` for justifications/itinerary; deterministic TypeScript owns all date logic |
| **Prompt engineering** | Structured system + user prompt with strict JSON output schema; Claude writes only 1-liner justifications — never picks dates |
| **Pre-computation** | All date windows computed in TypeScript (`groupConsecutive`, `bestPartialWindow`, `bestNearWindow`, `memberMaybeWindow`) before calling Claude; model receives structured context |
| **2-member vs 3+ member paths** | Separate recommendation logic: 2-member uses exact + organiser maybe + member maybe; 3+ uses exact/partial + group maybe + organiser maybe |
| **Structured output** | `RecommendationData`: `best`, `runner_up?`, `alternatives[]`, `nudge`, `fallback?` (FallbackMonths when zero overlap found) |
| **Option type labels** | `exact` → PERFECT MATCH, `partial` → BEST AVAILABLE, `maybe_organiser` → ORGANISER'S MAYBE, `maybe_member` → MEMBER'S MAYBE, `maybe_group` → GROUP COMPROMISE |
| **Confidence scoring** | Deterministic scale: exact=95, partial=72, maybe_group=55, maybe_organiser=42, maybe_member=38 |
| **Fallback months** | Separate Claude call returns `FallbackMonths` (3 recommended travel months) when zero availability overlap found |
| **Pause-triggered re-suggestions** | 3s inactivity timer in `CalendarGrid` fires `onPause`; `TripDashboard` re-calls recommend endpoint; max 3 revisions tracked in localStorage; `onPauseRef` pattern avoids stale closure |
| **Auto-triggering** | `hasAutoTriggered.current` ref fires recommend API when `submittedCount === members.length` — prevents double-call |
| **AI itinerary** | `getItinerary()` in `claude.ts` — day-by-day plan with morning/afternoon/evening activities, tips, search queries, destination lat/lng for map centering |
| **No caching** | Every recommend + itinerary trigger deletes the old DB row and regenerates fresh |
| **Server-side only** | `ANTHROPIC_API_KEY` never exposed to client; all Claude calls inside Route Handlers |

---

## 5. Authentication & Identity

| Skill | Detail |
|---|---|
| **Google OAuth (Supabase)** | `signInWithOAuth({ provider: 'google' })` — no passwords, no SMTP. Supabase manages the OAuth flow |
| **OAuth callback handler** | `/auth/callback` route exchanges PKCE code for session, creates `user_profiles` row from Google metadata (`full_name`, `name`, email fallback) |
| **Cookie-based sessions** | `@supabase/ssr` + `createSSRClient` manages cookies server-side; `createBrowserClient` on client |
| **Middleware route protection** | `src/middleware.ts` guards `/dashboard`, `/create`, `/trip/*`; unauthenticated → `/login?redirect=<path>`; authenticated on `/login` → `/dashboard` |
| **Server-side identity resolution** | Server components call `auth.getUser()` → query `members WHERE user_id = auth.uid` — no localStorage or client-side identity |
| **Auto-join flow** | Invited member clicks link → redirected to `/login?redirect=/trip/[id]` → Google OAuth → `/trip/[id]` server component auto-inserts member row using `display_name` from `user_profiles` |
| **Role-based access** | `members.role` = `'organizer'|'member'`; creator-only actions (lock dates) enforced server-side |
| **`user_profiles` table** | One row per auth user; `display_name` seeded from Google name; used as display_name when auto-joining trips |
| **Invite tracking** | `invitations` table records per-channel sends (WhatsApp/Gmail/SMS); AI triggers at ≥60% of expected members |

---

## 6. Product & UX Engineering

| Skill | Detail |
|---|---|
| **Full-page layout** | Two-column sticky layout: personal input (left) vs group output (right) — switches to single column on mobile |
| **Full calendar months** | Group heatmap renders complete calendar months (not just date-range slice), with out-of-range days faded |
| **Availability cycling** | Tap a date to cycle `available → maybe → unavailable → clear`; colour-coded green / amber / red |
| **Per-member heatmap pips** | Each heatmap cell shows coloured dots per member (green=available, amber=maybe, red=unavailable, grey=no response) + colour key legend |
| **Creator availability seeding** | When creator makes a trip, all dates in the trip range are auto-marked `available` in their calendar — realistic heatmap gradient from day one |
| **Destination photo** | Lock banner fetches destination photo from Unsplash source URL; graceful gradient fallback |
| **Vote-to-lock flow** | Inline vote buttons per option → realtime vote counts → "Lock Winning Dates" (creator only) → post-lock redirect to Plan |
| **Post-lock redirect** | `router.push()` in `useEffect` — never in render body (avoids "Cannot update while rendering" error) |
| **Post-lock layout** | Right column replaces heatmap+vote with `WhatsNextCards` (4 planning feature cards linking to Plan phase) |
| **Plan phase tabs** | 5 tabs: Itinerary, Shared Map, Polls, Budget, Photos — Map+Polls locked until itinerary generated |
| **Budget tracker** | Expense logging by category, per-member balances, greedy debt simplification settlement algorithm (Splitwise-style) |
| **Photo gallery** | Per-member sub-tabs, drag-and-drop upload (10MB), lightbox + download, Supabase Storage with service role key server-side |
| **Brand icons** | YouTube + TripAdvisor use official SVG icons (not emoji) in itinerary activity chips, booking strip, and Watch & Read sidebar |
| **Date validation** | Trip creation: start = today (pre-filled), end = blank; end `min` = start; inline red error if end < start |
| **Invite gate** | Share / Invite Friends button hidden once dates are locked |

---

## 7. DevOps & Tooling

| Skill | Detail |
|---|---|
| **TypeScript strict mode** | Zero `any` in production code; all API payloads fully typed via `src/types/index.ts` |
| **Environment variables** | Server-only secrets (`ANTHROPIC_API_KEY`) vs public vars (`NEXT_PUBLIC_SUPABASE_URL`) clearly separated |
| **Vercel deployment** | `vercel` CLI deploy; environment variables set in Vercel dashboard |
| **Supabase SQL migrations** | Schema managed as a single `supabase/schema.sql` file; run in Supabase SQL Editor |

---

## 8. Stack Summary

```
Frontend    Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui (Base UI)
Backend     Next.js Route Handlers · Supabase (PostgreSQL + Realtime + Storage)
Maps        @vis.gl/react-google-maps · Google Maps JS API · Places API · Geocoding API
AI          Anthropic Claude (claude-haiku-4-5-20251001) via @anthropic-ai/sdk
Auth        Supabase Google OAuth · cookie sessions (@supabase/ssr) · server-side identity
Deploy      Vercel · Supabase Cloud
```

---

*TripTangle — Built by Priyanka Dutta · Rethink Systems Cohort 7*
