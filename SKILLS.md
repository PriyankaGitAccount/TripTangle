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
| **Next.js Route Handlers** | 7 REST endpoints under `src/app/api/trips/` — all typed with `NextRequest` / `NextResponse` |
| **Input validation** | Required-field checks, date ordering checks, constraint error handling (Supabase `23505` unique violations) |
| **Parallel data fetching** | `Promise.all([...])` across 5 Supabase queries in the GET route — zero serial waterfalls |
| **Response caching** | AI recommendation cached in DB; freshness checked by comparing `created_at` vs `max(availability.updated_at)` before re-calling Claude |
| **Authorization** | Lock-dates endpoint verifies `member_id === trip.creator_member_id` server-side |

### Database
| Skill | Detail |
|---|---|
| **PostgreSQL** | 5-table relational schema: `trips`, `members`, `availability`, `ai_recommendations`, `votes` |
| **Supabase** | Managed Postgres with JS client (`@supabase/supabase-js`) |
| **Schema design** | Unique constraints `(member_id, trip_id, date)` on availability; `(member_id, trip_id)` on votes enforce one-vote-per-member at the DB level |
| **Upsert pattern** | Availability and votes use upsert — the same API call handles both create and update |
| **Row Level Security** | RLS enabled on all tables; permissive anon policies with security-through-obscurity (12-char trip IDs) |
| **Cascading deletes** | `ON DELETE CASCADE` on all foreign keys — deleting a trip cleans up all child rows automatically |
| **Indexes** | Compound index `(member_id, trip_id)` on availability; single-column indexes on all `trip_id` FKs for fast filtering |
| **DB constraints** | `CHECK` constraints on `status` enums, `option_index` range, name length, date range validity |

---

## 3. Real-time Engineering

| Skill | Detail |
|---|---|
| **Supabase Realtime** | `postgres_changes` subscriptions on `members`, `availability`, `votes` tables |
| **Custom React hooks** | `useRealtimeMembers`, `useRealtimeAvailability`, `useRealtimeVotes` — each seeds from server-fetched initial data and patches live events |
| **Event handling** | INSERT/UPDATE/DELETE events mapped to local state mutations without full refetch |
| **Channel scoping** | Each subscription filtered by `trip_id` — only receives events for the current trip |
| **Deduplication** | Vote upserts use `member_id` to find and overwrite the existing entry in local state |

---

## 4. AI Engineering

### Claude Integration
| Skill | Detail |
|---|---|
| **Anthropic SDK** | `@anthropic-ai/sdk` — direct `messages.create` call with `claude-sonnet-4-20250514` |
| **Prompt engineering** | Structured system + user prompt with strict JSON output schema; explicit priority rules for the model to follow |
| **Pre-computation** | Exact-overlap windows (all members `available`) and near-match windows (all `available` or `maybe`) are computed in TypeScript before the prompt — fed to Claude as structured context so it doesn't have to infer them |
| **Structured output** | Claude returns a typed `RecommendationData` JSON object: `best`, `runner_up`, `alternatives[]`, `nudge`; parsed with `JSON.parse` |
| **Confidence scoring** | Claude returns a 0–100 confidence score per date window; rendered as a colour-coded progress bar |
| **Trade-off explanations** | Plain-language `trade_off` field per runner-up / alternative option; surfaced in the UI as an amber callout |
| **Caching** | Recommendation stored in `ai_recommendations` table; only regenerated if availability data is newer than the last recommendation |
| **Auto-triggering** | `useEffect` in `TripDashboard` watches `submittedCount === members.length` and fires the recommendation API automatically — no manual button needed once all members submit |
| **Server-side only** | `ANTHROPIC_API_KEY` never exposed to the client; all Claude calls happen inside Route Handlers |

---

## 5. Identity & Auth (No-Auth Pattern)

| Skill | Detail |
|---|---|
| **localStorage identity** | `useMemberIdentity` hook stores `{ tripId, memberId }` in `localStorage` key `triptangle_member_{tripId}` |
| **Identity-from-URL** | Member joins via `/trip/[id]/join`, picks a display name, gets a `member_id` UUID back from the API — stored locally |
| **Creator detection** | `isCreator = trip.creator_member_id === memberId` checked client-side; enforced server-side on lock endpoint |
| **Redirect guard** | Dashboard redirects to `/join` if no identity found in localStorage for that trip |
| **Security model** | Unguessable 12-char alphanumeric trip IDs (`nanoid`) as the primary security boundary |

---

## 6. Product & UX Engineering

| Skill | Detail |
|---|---|
| **Full-page layout** | Two-column sticky layout: personal input (left) vs group output (right) — switches to single column on mobile |
| **Full calendar months** | Group heatmap renders complete calendar months (not just date-range slice), with out-of-range days faded |
| **Availability cycling** | Tap a date to cycle `available → maybe → unavailable → clear`; colour-coded green / amber / red |
| **Demo member seeding** | Auto-creates a `Sam` demo member with realistic pre-filled availability on trip creation — gives new users a live heatmap and enables AI recommendation immediately |
| **Destination photo** | Lock banner fetches a destination photo from Unsplash using keywords extracted from the trip name; graceful gradient fallback on error |
| **Vote-to-lock flow** | Voting → leading badge → "Lock Winning Dates" button → locked state → left-column lock card + right-column feature planning cards |
| **Post-lock layout shift** | After locking, the right column replaces the heatmap+vote panel with four "What's Next" feature cards (Destination, Accommodation, Budget, Itinerary) |
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
Frontend    Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui
Backend     Next.js Route Handlers · Supabase (PostgreSQL) · Supabase Realtime
AI          Anthropic Claude (claude-sonnet-4-20250514) via @anthropic-ai/sdk
Auth        No-auth · localStorage identity · unguessable trip IDs (nanoid)
Deploy      Vercel · Supabase Cloud
```

---

*TripTangle — Built by Priyanka Dutta · Rethink Systems Cohort 7*
