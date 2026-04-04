# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Before writing any code**: Ask clarifying questions until the requirement is unambiguous, then write a short plan (what changes, which files, why) and wait for approval before executing. Never assume — one clarifying question saves hours of rework.

## Must Follow
- Do not use names that are already present in Google — be innovative with naming.
- Think before answering — do not hallucinate.
- Always ask questions until completely clear. Do not jump into solution space or coding until explicitly asked.
- Always capture the current session into CLAUDE.md and Obsidian vaalt before exit.

---

## What is TripTangle

AI-powered group travel date coordination app. Users create a trip, share a link, group members mark their availability on a calendar, Claude AI finds the best dates (prioritising exact full-group overlap), and the group votes to lock dates. No authentication — identity via display name + localStorage.

**Target surface**: Web-based mobile application (responsive; desktop shows a two-column layout).

**Core loop**:
1. Creator makes a trip → a demo member "Sam" is auto-seeded with availability
2. Members join via shareable link and tap dates (available / maybe / busy)
3. Live heatmap shows group overlap in real-time
4. Once all members submit, AI auto-triggers and returns ranked date suggestions
5. Members vote; highest votes wins; creator locks dates
6. Post-lock: destination photo + planning feature cards appear
7. Plan phase (`/trip/[id]/plan`): AI-generated itinerary, shared map with pins, group polls

---

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (validates TypeScript — run this before committing)
npm run start        # Start production server
```

No test framework is configured yet.

---

## Environment Variables

Copy `.env.example` to `.env.local`. All four are required:

| Variable | Used in | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `src/lib/claude.ts` (server only) | Claude API calls |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/` | Supabase project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/` | Supabase anon key |
| `NEXT_PUBLIC_BASE_URL` | `src/lib/trip-utils.ts` | Shareable link base (e.g. `http://localhost:3000`) |

`ANTHROPIC_API_KEY` must never appear in client bundles — only call Claude inside Route Handlers.

---

## Database

Schema: `supabase/schema.sql` — run in Supabase SQL Editor to initialise.

### Tables

| Table | Key columns | Notes |
|---|---|---|
| `trips` | `id TEXT`, `creator_member_id UUID`, `locked_dates_start/end DATE` | `id` is 12-char alphanumeric (nanoid) |
| `members` | `id UUID`, `trip_id`, `display_name`, `status` | Unique `(trip_id, display_name)` |
| `availability` | `member_id`, `trip_id`, `date`, `status` | Unique `(member_id, trip_id, date)`; upsert pattern |
| `ai_recommendations` | `trip_id`, `recommendation_json JSONB` | One row per generation; latest is used |
| `votes` | `member_id`, `trip_id`, `option_index` | Unique `(member_id, trip_id)`; upsert — one vote per member |
| `itineraries` | `trip_id`, `itinerary_json JSONB` | One active row per trip; POST replaces existing |
| `itinerary_suggestions` | `trip_id`, `member_id`, `suggestion TEXT` | Member freetext inputs fed into AI prompt |
| `map_pins` | `trip_id`, `member_id`, `lat`, `lng`, `title`, `category`, `note` | Category: `accommodation\|restaurant\|activity\|other`; pin owner can delete |
| `polls` | `trip_id`, `created_by_member_id`, `question`, `options TEXT[]`, `poll_date DATE` | 2–6 options |
| `poll_responses` | `poll_id`, `member_id`, `option_index` | Unique `(poll_id, member_id)`; upsert |

### RLS
Enabled on all tables with permissive anon policies. Security relies entirely on trip IDs being unguessable. Do not add per-user auth without reviewing all policies.

### Realtime
`members`, `availability`, `votes`, `map_pins`, `polls`, `poll_responses` have Supabase Realtime enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE`.

---

## Architecture

**Next.js 16 App Router** · React 19 · TypeScript 5 · Tailwind CSS v4 · `@base-ui/react` (shadcn v4 peer) · `sonner` for toasts

> **`@base-ui/react` gotcha**: No `asChild` prop. Use `render` prop or apply `className` directly on the trigger element.

### Page routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Static | Landing page |
| `/create` | Static | Trip creation form |
| `/trip/[id]` | Dynamic (SSR) | Trip dashboard — fetches all data server-side |
| `/trip/[id]/join` | Dynamic | Name entry for new members |
| `/trip/[id]/plan` | Dynamic (SSR) | Plan phase — itinerary, map, polls (tab driven by `?tab=` param) |

### Key patterns

**Server Components as data shells**
`src/app/trip/[id]/page.tsx` runs 5 parallel Supabase queries (`Promise.all`) and passes the result to `TripDashboard` as props. No client-side initial fetch.

**Realtime hooks (seed + patch)**
`useRealtimeMembers`, `useRealtimeAvailability`, `useRealtimeVotes` each accept server-fetched data as `initial*` and subscribe to `postgres_changes`. They patch local state on INSERT/UPDATE/DELETE without refetching.

**Identity without auth**
`useMemberIdentity(tripId)` reads/writes `triptangle_member_{tripId}` in localStorage. `member_id` travels in API request bodies — never in cookies or headers. On load, if no identity exists for the current trip, dashboard redirects to `/join`.

**Optimistic availability with debounce**
`CalendarGrid` applies local state immediately on tap (cycles `available → maybe → unavailable → clear`), then debounces 300ms before the API call. Reverts on error. Uses a `Map<string, NodeJS.Timeout>` ref keyed by date to track per-cell timers.

**AI recommendation — pre-computation + auto-trigger**
Before calling Claude, `src/lib/claude.ts` computes:
- **Exact-match windows**: consecutive dates where every submitted member is `available`
- **Near-match windows**: consecutive dates where every member is `available` or `maybe`

These are serialised into the prompt so Claude doesn't have to infer them. The `best` option must use an exact-match window if one ≥ 2 days exists.

Auto-trigger: `TripDashboard` watches `submittedCount === members.length` in a `useEffect`. When all members have submitted, it calls `/recommend` automatically. A manual trigger button remains visible when only some members have submitted (≥ `MIN_MEMBERS_FOR_AI`).

**Vote-to-lock flow**
`AiVotePanel` shows all ranked options (best + runner-up + alternatives). Each option has an inline Vote / ✓ Voted button. Vote counts update via realtime. The "Lock Winning Dates" button (creator only) locks the option with the highest vote count. Winner is determined by `Math.max(...voteCounts)`.

**Post-lock layout**
After locking, the dashboard reorganises:
- Left column: MemberList → LockBanner (destination photo + locked dates)
- Right column: WhatsNextCards (4 planning feature cards)
The heatmap and AI/vote panels are hidden. Invite Friends button is removed from the header.

**Plan phase — post-lock feature**
`/trip/[id]/plan` is a tabbed SSR page. It runs 7 parallel Supabase queries (trip, members, latest itinerary, itinerary suggestions, map pins, polls, poll responses) and hydrates `PlanDashboard`. Three tabs:
- **Itinerary**: `ItineraryBuilder` — members submit freetext suggestions; "Generate with AI" POSTs to `/api/trips/[id]/itinerary` which calls `getItinerary()` in `claude.ts` (prefer locked dates over date range). Replaces any existing row.
- **Shared Map**: `SharedMap` — members drop pins via `@vis.gl/react-google-maps`; POST/DELETE to `/api/trips/[id]/pins`. Pin owner can delete their own pin (enforced server-side by `member_id` match).
- **Polls**: `DailyPolls` — any member creates a poll (2–6 options); responses upserted via `/api/trips/[id]/polls/[pollId]`.

`use-realtime-pins` and `use-realtime-polls` follow the same seed+patch pattern as other realtime hooks.

**Demo member seeding**
`POST /api/trips` auto-creates a member named `Sam` immediately after the creator, then seeds Sam's availability: first 7 days = available (weekdays) / maybe (weekends), days 8–14 = maybe (weekdays) / unavailable (weekends), day 15+ = unavailable. This gives new creators a live heatmap and enables AI recommendation with just one real member.

---

## Component Map

```
src/
├── app/
│   ├── page.tsx                        Landing page (fun travel theme, floating destination cards)
│   ├── create/page.tsx                 Trip creation form
│   ├── trip/[id]/
│   │   ├── page.tsx                    Server shell — parallel data fetch
│   │   ├── join/page.tsx               Display name entry
│   │   └── plan/page.tsx               Plan phase — 7 parallel queries, tab routing
│   └── api/trips/
│       ├── route.ts                    POST /api/trips (create + seed Sam)
│       └── [id]/
│           ├── route.ts                GET /api/trips/[id]
│           ├── join/route.ts           POST — join trip
│           ├── availability/route.ts   POST — upsert/delete availability
│           ├── recommend/route.ts      POST — trigger Claude, cache result
│           ├── vote/route.ts           POST — upsert vote
│           ├── lock/route.ts           POST — creator-only date lock
│           ├── itinerary/
│           │   ├── route.ts            GET/POST — fetch or (re)generate AI itinerary
│           │   └── suggestions/route.ts POST — add member itinerary suggestion
│           ├── pins/route.ts           POST/DELETE — map pins (owner-only delete)
│           └── polls/
│               ├── route.ts            POST — create poll
│               └── [pollId]/route.ts   POST — upsert poll response
│
├── components/
│   ├── trip/
│   │   ├── trip-dashboard.tsx          Main orchestrator — layout, state, auto-trigger
│   │   ├── trip-header.tsx             Trip name, date range, ShareDialog (hidden when locked)
│   │   ├── member-list.tsx             Members with submission progress bar
│   │   ├── create-form.tsx             Trip creation form
│   │   ├── share-dialog.tsx            WhatsApp + copy-link invite dialog
│   │   └── whats-next-cards.tsx        Post-lock planning feature cards
│   ├── availability/
│   │   ├── calendar-grid.tsx           Personal availability calendar (tap to cycle)
│   │   ├── date-cell.tsx               Single date cell with colour state
│   │   └── heatmap.tsx                 Group heatmap — full calendar months, heat colours
│   ├── ai/
│   │   ├── recommendation-card.tsx     Ranked option cards with confidence bar + pips
│   │   └── recommendation-trigger.tsx  Manual trigger card (shown when not all submitted)
│   ├── vote/
│   │   ├── ai-vote-panel.tsx           Combined options + inline vote buttons + lock
│   │   ├── vote-poll.tsx               (Legacy — kept for reference)
│   │   └── lock-banner.tsx             Post-lock card with Unsplash destination photo
│   └── plan/
│       ├── plan-dashboard.tsx          Tab shell (itinerary / map / polls)
│       ├── itinerary-builder.tsx       Suggestions input + AI generate + day-by-day view
│       ├── shared-map.tsx              Google Maps with collaborative pins
│       └── daily-polls.tsx             Poll creation + voting UI
│
├── hooks/
│   ├── use-member-identity.ts          localStorage identity read/write
│   ├── use-realtime-members.ts         Live member list
│   ├── use-realtime-availability.ts    Live availability updates
│   ├── use-realtime-votes.ts           Live vote updates
│   ├── use-realtime-pins.ts            Live map pins (seed + patch)
│   └── use-realtime-polls.ts           Live polls + responses (seed + patch)
│
├── lib/
│   ├── claude.ts                       Claude API — pre-computes overlap, builds prompt
│   ├── supabase/
│   │   ├── client.ts                   Browser Supabase client
│   │   └── server.ts                   Server-side Supabase client
│   ├── trip-utils.ts                   Date helpers, share URL builder
│   └── constants.ts                    Brand colours, MIN_MEMBERS_FOR_AI (= 2), etc.
│
└── types/
    └── index.ts                        All shared TypeScript types
```

---

## Data Flow

```
Landing (/) → Create (/create) → Trip Dashboard (/trip/[id])
                                       ↕
                                 Join (/trip/[id]/join)
                                       ↓ (after lock)
                               Plan (/trip/[id]/plan)

Trip Dashboard state machine:

  [All members submit]
        ↓ auto-trigger
  [AI recommendation]
        ↓ members vote
  [Highest votes → Lock]
        ↓
  [Post-lock view] → Plan link
```

**Dashboard section order (active trip)**:
Header → MemberList → CalendarGrid (personal) → [right column: Heatmap | AI+Vote]

**Dashboard section order (locked trip)**:
Header → MemberList → LockBanner → [right column: WhatsNextCards (includes Plan link)]

---

## AI Recommendation — Detail

File: `src/lib/claude.ts`
Model: `claude-sonnet-4-20250514` · Max tokens: 1024

**Pre-computation** (TypeScript, before Claude call):
1. `datesInRange(start, end)` — all ISO dates in range
2. `exactMatchDates` — dates where every submitted member = `'available'`
3. `nearMatchDates` — dates where every member = `'available'` or `'maybe'`
4. `groupConsecutive(dates)` — groups into `{ start, end, length }` windows, sorted longest-first

**Prompt priority rules** (enforced in system prompt):
1. `best` = longest exact-match window if ≥ 2 days exists
2. Else `best` = longest near-match window
3. Else `best` = partial overlap with highest weighted score (available=1, maybe=0.5)

**Response shape**:
```ts
{
  best:       DateOption   // confidence 0-100, summary
  runner_up:  DateOption   // + trade_off string
  alternatives: DateOption[] // up to 2 more
  nudge:      string       // friendly vote-prompt message
}
```

**Caching**: Recommendation stored in `ai_recommendations`. Reused if `created_at > max(availability.updated_at)`. Invalidated automatically when any member updates availability.

---

## AI Itinerary — Detail

Function: `getItinerary()` in `src/lib/claude.ts`

Input: `destination`, `dateStart`, `dateEnd`, `memberCount`, `tripName`, `suggestions[]` (member freetext)

**Prompt strategy**: Member suggestions are injected verbatim so Claude can incorporate specific preferences. The date window prefers `locked_dates_start/end` over `date_range_start/end` — enforced in the route handler before calling Claude.

**Response shape** (`ItineraryData`):
```ts
{
  destination: string
  destination_lat: number      // used to centre SharedMap by default
  destination_lng: number
  season: string
  weather_context: string
  summary: string
  days: ItineraryDay[]         // one per day in range; activities: Morning/Afternoon/Evening
  tips: string[]
  search_queries: string[]
}
```

**Storage**: `POST /api/trips/[id]/itinerary` deletes any existing row then inserts fresh. There is no caching/invalidation — each POST is a full regeneration.

---

## Design System

### Brand colours (active trip UI)
| Token | Hex | Tailwind class |
|---|---|---|
| Deep teal | `#1A5276` | `bg-brand-deep`, `text-brand-deep` |
| Bright blue | `#2980B9` | `bg-brand-bright`, `text-brand-bright` |
| Green | `#27AE60` | `bg-brand-green`, `text-brand-green` |
| Amber | `#F39C12` | `bg-brand-amber` |
| Red | `#E74C3C` | `bg-brand-red` |
| Light bg | `#EBF5FB` | `bg-brand-light` |

### Landing page colours (separate palette)
Dark navy `#0d1b2a` base with coral `#FF6B6B`, golden `#FECA57`, sky `#48DBFB`, pink `#FF9FF3` accents. Do not mix landing palette into the app UI.

### Heatmap colours
| Score | Classes |
|---|---|
| No data | `bg-muted/30 ring-border/30` (uncoloured) |
| 0% available | `bg-red-100 ring-red-200` |
| ≤ 25% | `bg-orange-100 ring-orange-200` |
| ≤ 50% | `bg-amber-100 ring-amber-200` |
| ≤ 75% | `bg-emerald-100 ring-emerald-200` |
| 100% | `bg-emerald-200 ring-emerald-300` |

Dates with no member responses must remain uncoloured — never show red for an untouched date.

### Typography
Inter via `next/font/google`. No other font families.

---

## Known Gotchas

1. **shadcn Dialog on mobile**: The `DialogContent` needs `mx-auto max-w-sm` to not full-screen on iOS.

2. **Unsplash source URL**: `LockBanner` uses `https://source.unsplash.com/800x400/?{keyword}` (a redirect-based URL, not Next.js Image). Add `images.unsplash.com` to `next.config.ts` remotePatterns if switching to `<Image>`.

3. **Week day keys in React**: Never use single-letter day abbreviations (`'S','M','T'…`) as React `key` props — Tuesday and Thursday both map to `'T'`. Always use index or full names.

4. **Heatmap full-month grid**: `heatmap.tsx` renders complete calendar months (not just the date range). Out-of-range days render as faded numbers with no box. This requires `toISO(year, month, day)` for all cells — use `dateStats.get(date) ?? fallback` (never `!` assertion) because not all month days exist in the stats map.

5. **Demo member name**: The auto-seeded member is named `Sam`. If you rename it, update the seeding logic in `POST /api/trips/route.ts` and verify the display in `MemberList`.

6. **MIN_MEMBERS_FOR_AI = 2**: Lowered from 3 so the demo works with one real user + Sam. Do not raise without testing the demo flow.

7. **Auto-trigger guard**: `hasAutoTriggered.current` (a `useRef`) prevents double-calling the recommend API. If you add manual re-trigger logic, reset this ref appropriately.

8. **Vote upsert**: A member can change their vote at any time before dates are locked. The API and realtime hook both handle this — don't add a "vote once" guard.

9. **Creator check is client-side for UI gating only**: The Lock Dates button visibility is controlled client-side by `isCreator`. The actual enforcement is server-side in `POST /api/trips/[id]/lock` which verifies `member_id === trip.creator_member_id`.

10. **`HEATMAP_COLORS` in `constants.ts` is unused**: `heatmap.tsx` uses its own `getHeatColor` / `getHeatBorder` functions with Tailwind `bg-red-100/bg-orange-100/bg-amber-100/bg-emerald-100/bg-emerald-200` classes — not the `bg-brand-*` tokens in constants. Don't consolidate them without updating the heatmap component.

11. **`MAX_DATE_RANGE_DAYS = 60`**: Trip date ranges are capped at 60 days in `constants.ts`. Enforce this client-side in the creation form if adding validation.

12. **Google Maps in `SharedMap`**: `@vis.gl/react-google-maps` is used in `shared-map.tsx`. A `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var is required; add it to `.env.local` and the Vercel dashboard. The map defaults to the destination lat/lng from the generated itinerary when available.

---

## Deployment

```bash
vercel
```

1. Set all four environment variables in the Vercel dashboard
2. Run `supabase/schema.sql` in Supabase SQL Editor (one-time)
3. Verify Realtime is enabled in Supabase → Database → Replication for `members`, `availability`, `votes`
4. Away commit to C:\Users\priya\OneDrive\Documents\Obsidian Vault\TripTangle\Sessions before ending session or closing the CLI