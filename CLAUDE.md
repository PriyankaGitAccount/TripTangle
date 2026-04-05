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

AI-powered group travel date coordination app. Users sign in with Google, create a trip, share a link, group members mark their availability on a calendar, Claude AI finds the best dates (prioritising exact full-group overlap), and the group votes to lock dates. Auth via Supabase Google OAuth — identity is the authenticated user's `user_id`.

**Target surface**: Web-based mobile application (responsive; desktop shows a two-column layout).

**Core loop**:
1. Creator signs in with Google → creates a trip → shares the link
2. Members click invite link → sign in with Google → auto-join the trip
3. Members tap dates (available / maybe / busy); live heatmap shows group overlap in real-time
4. AI triggers when ≥60% of expected members (based on invite count) have submitted
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

Copy `.env.example` to `.env.local`. All are required:

| Variable | Used in | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `src/lib/claude.ts` (server only) | Claude API calls |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/` | Supabase project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/app/api/trips/[id]/photos/` | Server-side storage uploads (never expose to client) |
| `NEXT_PUBLIC_BASE_URL` | `src/lib/trip-utils.ts` | Shareable link base (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `create-form.tsx`, `shared-map.tsx` | Places autocomplete + Maps JS API |

`ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must never appear in client bundles — only call from Route Handlers.

**Google Maps API key** must have these APIs enabled: Maps JavaScript API, Places API, Geocoding API.

---

## Database

Schema: `supabase/schema.sql` — run in Supabase SQL Editor to initialise.

### Tables

| Table | Key columns | Notes |
|---|---|---|
| `user_profiles` | `id UUID` (= auth.uid), `email`, `display_name` | Created on first Google OAuth login via `/auth/callback` |
| `trips` | `id TEXT`, `creator_member_id UUID`, `locked_dates_start/end DATE` | `id` is 12-char alphanumeric (nanoid) |
| `members` | `id UUID`, `trip_id`, `user_id UUID`, `display_name`, `role`, `status` | `user_id` = auth.uid; `role` = `'organizer'|'member'`; unique `(trip_id, display_name)` |
| `invitations` | `trip_id`, `channel TEXT` | Tracks WhatsApp/Gmail/SMS invite sends; used for 60% threshold |
| `availability` | `member_id`, `trip_id`, `date`, `status` | Unique `(member_id, trip_id, date)`; upsert pattern |
| `ai_recommendations` | `trip_id`, `recommendation_json JSONB` | One row per trip; always replaced on re-trigger (no staleness caching) |
| `votes` | `member_id`, `trip_id`, `option_index` | Unique `(member_id, trip_id)`; upsert — one vote per member |
| `itineraries` | `trip_id`, `itinerary_json JSONB` | One active row per trip; POST replaces existing |
| `itinerary_suggestions` | `trip_id`, `member_id`, `suggestion TEXT` | Member freetext inputs fed into AI prompt |
| `map_pins` | `trip_id`, `member_id`, `lat`, `lng`, `title`, `category`, `note` | Category: `accommodation\|restaurant\|activity\|other`; pin owner can delete |
| `polls` | `trip_id`, `created_by_member_id`, `question`, `options TEXT[]`, `poll_date DATE` | 2–6 options |
| `poll_responses` | `poll_id`, `member_id`, `option_index` | Unique `(poll_id, member_id)`; upsert |
| `expenses` | `trip_id`, `paid_by_member_id`, `amount`, `description`, `category`, `split_among JSONB` | Categories: flights/hotel/food/local_travel/activity/shopping |
| `trip_photos` | `trip_id`, `member_id`, `file_name`, `file_path`, `file_size`, `content_type` | Storage path: `{tripId}/{memberId}/{timestamp}-{filename}` |

### RLS
Enabled on all tables. Policies are `TO authenticated` (not `TO anon`) — all endpoints require a valid Supabase session. `user_profiles` has an additional policy so users can only read/write their own row.

### Realtime
`members`, `availability`, `votes`, `map_pins`, `polls`, `poll_responses`, `expenses`, `trip_photos` have Supabase Realtime enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE`.

### Storage
`trip-photos` bucket in Supabase Storage (public bucket). Uploads use the service role key server-side; reads use the public URL pattern `{SUPABASE_URL}/storage/v1/object/public/trip-photos/{filePath}`.

---

## Architecture

**Next.js 16 App Router** · React 19 · TypeScript 5 · Tailwind CSS v4 · `@base-ui/react` (shadcn v4 peer) · `sonner` for toasts

> **`@base-ui/react` gotcha**: No `asChild` prop. Use `render` prop or apply `className` directly on the trigger element.

### Page routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Static | Landing page |
| `/login` | Client | Google OAuth sign-in (single button → Supabase OAuth) |
| `/auth/callback` | Route Handler | Exchanges OAuth code for session; creates `user_profiles` row; redirects to `?next=` |
| `/dashboard` | SSR | All trips the user belongs to — trip cards with status (active / locked) |
| `/create` | SSR | Trip creation form (auth-gated) |
| `/trip/[id]` | Dynamic (SSR) | Trip dashboard — auto-joins non-member; blocks locked trips |
| `/trip/[id]/plan` | Dynamic (SSR) | Plan phase — itinerary, map, polls (tab driven by `?tab=` param) |

### Key patterns

**Server Components as data shells**
`src/app/trip/[id]/page.tsx` runs 5 parallel Supabase queries (`Promise.all`) and passes the result to `TripDashboard` as props. No client-side initial fetch.

**Realtime hooks (seed + patch)**
`useRealtimeMembers`, `useRealtimeAvailability`, `useRealtimeVotes` each accept server-fetched data as `initial*` and subscribe to `postgres_changes`. They patch local state on INSERT/UPDATE/DELETE without refetching.

**Auth — Google OAuth via Supabase**
`src/middleware.ts` protects `/dashboard`, `/create`, `/trip/*`. Unauthenticated users are redirected to `/login?redirect=<path>`. After Google OAuth, `/auth/callback` exchanges the code, creates a `user_profiles` row (display_name from Google), and redirects to `next`. `member_id` is resolved server-side: `auth.getUser()` → `members WHERE user_id = auth.uid AND trip_id = id`. The `memberId` and `currentUserRole` are passed as props from the server component — never derived client-side from localStorage. `isCreator = currentUserRole === 'organizer'` (enforced server-side on lock endpoint too). `useMemberIdentity` hook has been removed.

**Optimistic availability with debounce**
`CalendarGrid` applies local state immediately on tap (cycles `available → maybe → unavailable → clear`), then debounces 300ms before the API call. Reverts on error. Uses a `Map<string, NodeJS.Timeout>` ref keyed by date to track per-cell timers.

**AI recommendation — deterministic TypeScript + auto-trigger + pause re-suggestions**
`src/lib/claude.ts` computes ALL date windows in TypeScript. Claude only writes 1-liner justifications and a nudge — it never chooses dates.

Signature: `getDateRecommendation(tripName, destination, dateRangeStart, dateRangeEnd, creatorMemberId, members, availability)`

**2-member path** (when `n === 2`):
1. Option 1 (`exact`) — both members fully available
2. Option 2 (`maybe_organiser`) — creator's longest maybe window, distinct from Option 1
3. Option 3 (`maybe_member`) — other member's longest maybe window, distinct from Options 1–2

**3+ member path**:
1. Option 1 (`exact` or `partial`) — all available; falls back to best partial if no exact window
2. Option 2 (`maybe_group`) — max members available or maybe, distinct from Option 1
3. Option 3 (`maybe_organiser`) — creator's maybe window, distinct from Options 1–2

**Fallback**: If zero windows found, a separate Claude call returns `FallbackMonths` (3 recommended travel months with reasons). `AiVotePanel` detects `isFallbackMode` and shows month suggestions instead of vote options.

**Option type labels** in `AiVotePanel`: `exact` → PERFECT MATCH, `partial` → BEST AVAILABLE, `maybe_organiser` → ORGANISER'S MAYBE, `maybe_member` → MEMBER'S MAYBE, `maybe_group` → GROUP COMPROMISE.

Each option shows a `justification` (1-liner italic) from Claude below the date range.

**Deduplication**: `AiVotePanel` filters `allOptions` by unique `start+end` before rendering.
**No caching**: `/api/trips/[id]/recommend` always deletes the old row and regenerates fresh.

**Auto-trigger (60% threshold)**: `TripDashboard` computes `expectedTotal = Math.max(members.length, inviteCount + 1)` and `threshold = Math.max(2, Math.ceil(expectedTotal * 0.6))`. When `submittedCount >= threshold`, AI triggers automatically. `hasAutoTriggered.current` ref prevents double-calling.

**Invite tracking**: `invitations` table stores per-channel sends (WhatsApp/Gmail/SMS). `POST /api/trips/[id]/invite` inserts a row; `TripHeader` reads `initialInviteCount` (from server) and shows "X joined · Y pending" pills. The invite count feeds the 60% threshold calculation.

**Pause-triggered re-suggestions**: `CalendarGrid` accepts `onPause` and `canEdit` props. A 3-second inactivity timer (restarts on every tap) fires `onPause()` when the member stops editing. `TripDashboard.handlePause()` increments a revision counter in a `useRef` (not localStorage, since auth replaced localStorage identity) and re-calls the recommend endpoint. After 3 revisions, `canEdit` becomes `false` — calendar cells are disabled and show a "Max revisions reached" notice.

**Vote-to-lock flow**
`AiVotePanel` shows all ranked options (best + runner-up + alternatives). Each option has an inline Vote / ✓ Voted button. Vote counts update via realtime. The "Lock Winning Dates" button (creator only) locks the option with the highest vote count. Winner is determined by `Math.max(...voteCounts)`.

**Destination autocomplete** in `create-form.tsx`: wraps the form in `<APIProvider>` and uses `useMapsLibrary('places')` to power a `DestinationInput` component. Debounces 300ms, calls `AutocompleteService.getPlacePredictions` with `types: ['(cities)']`, shows a dropdown. Destination stored in React state (not a form input) and submitted manually. Requires Places API enabled on the Google key.

**Post-lock redirect**: When `isLocked` is detected, `TripDashboard` runs `router.push(/trip/${id}/plan)` inside a `useEffect` (NOT render body) to avoid the "Cannot update a component while rendering" error.

**Post-lock layout**
After locking, the dashboard reorganises:
- Left column: MemberList → LockBanner (destination photo + locked dates)
- Right column: WhatsNextCards (4 planning feature cards)
The heatmap and AI/vote panels are hidden. Invite Friends button is removed from the header.

**Plan phase — post-lock feature**
`/trip/[id]/plan` is a tabbed SSR page. It runs 9 parallel Supabase queries and hydrates `PlanDashboard`. Five tabs:
- **Itinerary**: `ItineraryBuilder` — members submit freetext suggestions; "Generate with AI" POSTs to `/api/trips/[id]/itinerary`. Uses `claude-haiku-4-5-20251001` for ~10s generation. Itinerary state is lifted to `PlanDashboard` so it persists across tab switches. Map and Polls tabs are locked until itinerary is loaded.
- **Shared Map**: `SharedMap` — green teardrop pins for AI itinerary places (geocoded via `useMapsLibrary('places')`), coloured teardrop pins for member-added pins. Uses `@vis.gl/react-google-maps`. Import as `Map as GoogleMap` to avoid shadowing JS built-in `Map`.
- **Polls**: `DailyPolls` — any member creates a poll (2–6 options); responses upserted via `/api/trips/[id]/polls/[pollId]`.
- **Budget**: `BudgetTracker` — Splitwise-style expense tracking. `calculateSettlement()` uses greedy debt simplification. During trip = "Estimated Settlements" (amber); after `locked_dates_end` = "Settle Up" (green).
- **Photos**: `PhotoGallery` — per-member sub-tabs, drag-and-drop upload (10MB limit), lightbox with download. Uploads via `POST /api/trips/[id]/photos` using admin Supabase client. Realtime via `use-realtime-photos`.

`use-realtime-pins`, `use-realtime-polls`, `use-realtime-expenses`, `use-realtime-photos` all follow the seed+patch pattern. Import `supabase` singleton from `@/lib/supabase/client` (not `createBrowserClient`). Use `payload.eventType` (not `payload.event`) in realtime callbacks.

**Trip creation**
`POST /api/trips` creates the trip, inserts the creator as the first member, and updates `creator_member_id`. No demo members are seeded — all members are real users joining via the share link.

---

## Component Map

```
src/
├── app/
│   ├── page.tsx                        Landing page (fun travel theme, floating destination cards)
│   ├── login/page.tsx                  Google OAuth sign-in page
│   ├── auth/callback/route.ts          OAuth code exchange → session + user_profiles upsert
│   ├── dashboard/page.tsx              SSR — all trips the user belongs to, as cards
│   ├── create/page.tsx                 Trip creation form (auth-gated)
│   ├── trip/[id]/
│   │   ├── page.tsx                    Server shell — auth check, auto-join, parallel data fetch
│   │   ├── join/page.tsx               (Legacy — kept; auto-join now server-side)
│   │   └── plan/page.tsx               Plan phase — auth+member check, 9 parallel queries
│   └── api/
│       ├── auth/logout/route.ts        POST — signOut + redirect to /login
│       └── trips/
│           ├── route.ts                POST /api/trips (create trip + first member, seeds availability)
│           └── [id]/
│               ├── route.ts            GET /api/trips/[id]
│               ├── invite/route.ts     POST — record invite channel; GET — invite count
│               ├── availability/route.ts POST — upsert/delete availability
│               ├── recommend/route.ts  POST — trigger Claude, cache result
│               ├── vote/route.ts       POST — upsert vote
│               ├── lock/route.ts       POST — creator-only date lock
│               ├── itinerary/
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
│       ├── plan-dashboard.tsx          Tab shell (itinerary/map/polls/budget/photos) — owns itinerary state
│       ├── itinerary-builder.tsx       Suggestions + AI generate + day-by-day view (controlled by parent)
│       ├── shared-map.tsx              Google Maps with AI itinerary pins (green) + member pins (coloured)
│       ├── daily-polls.tsx             Poll creation + voting UI
│       ├── budget-tracker.tsx          Splitwise-style expenses + greedy settlement algorithm
│       └── photo-gallery.tsx           Per-member sub-tabs, upload/download, lightbox
│
├── hooks/
│   ├── use-realtime-members.ts         Live member list
│   ├── use-realtime-availability.ts    Live availability updates
│   ├── use-realtime-votes.ts           Live vote updates
│   ├── use-realtime-pins.ts            Live map pins (seed + patch)
│   ├── use-realtime-polls.ts           Live polls + responses (seed + patch)
│   ├── use-realtime-expenses.ts        Live expenses (seed + patch)
│   └── use-realtime-photos.ts          Live photo list (seed + patch)
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
Landing (/) → Login (/login) → Google OAuth → /auth/callback → Dashboard (/dashboard)
                                                                       ↓
                                                              Create (/create) → Trip Dashboard (/trip/[id])
                                                                       ↑
                                            Share link → Login → auto-join → Trip Dashboard (/trip/[id])
                                                                                    ↓ (after lock)
                                                                             Plan (/trip/[id]/plan)
                                                                                    ↓
                                                                             Dashboard (/dashboard) ← "My Trips"

Trip Dashboard state machine:

  [≥60% of expected members submit]
        ↓ auto-trigger
  [AI recommendation]
        ↓ members vote
  [Highest votes → Lock]
        ↓
  [Post-lock view] → Plan link → /trip/[id]/plan
```

**Dashboard section order (active trip)**:
Header → MemberList → CalendarGrid (personal) → [right column: Heatmap | AI+Vote]

**Dashboard section order (locked trip)**:
Header → MemberList → LockBanner → [right column: WhatsNextCards (includes Plan link)]

---

## AI Recommendation — Detail

File: `src/lib/claude.ts`
Models: `claude-haiku-4-5-20251001` for justifications/nudge and fallback months

**TypeScript owns all dates — Claude only writes 1-liner justifications + nudge.**

**Pre-computation helpers**:
- `datesInRange(start, end)` — all ISO dates in range (**uses local-time constructor + `toISOString()` — see gotcha #17**)
- `groupConsecutive(dates)` — groups consecutive dates into `{ start, end, length }` windows, sorted longest-first
- `bestPartialWindow(allDates, memberAvailability, exclude[])` — highest partial overlap (available only), distinct from excluded
- `bestNearWindow(allDates, memberAvailability, exclude[])` — best available-or-maybe window, distinct from excluded
- `memberMaybeWindow(allDates, member, exclude[])` — single member's longest maybe window, distinct from excluded
- `isSameWindow(a, b)` — equality check used by exclude logic

**Response shape** (`RecommendationData`):
```ts
{
  best:          DateOption          // always present
  runner_up?:    DateOption          // optional — omitted if no distinct window
  alternatives?: DateOption[]        // only for 3+ member trips
  nudge:         string
  fallback?:     FallbackMonths      // only when zero windows found
}
```

`DateOption` key fields: `start`, `end`, `available_count`, `maybe_count`, `total_members`, `summary` (= justification), `justification`, `confidence` (0–100), `option_type` (`'exact'|'partial'|'maybe_organiser'|'maybe_member'|'maybe_group'`).

**Confidence scale**: exact=95, partial=72, maybe_group=55, maybe_organiser=42, maybe_member=38.

**No caching**: every trigger deletes old `ai_recommendations` row and inserts fresh.

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
Status-based (not score-based). Logic in `getHeatClasses(stats, totalMembers, hasData)`:

| State | Classes |
|---|---|
| No responses | `bg-white/50` (uncoloured) |
| All members available | `bg-emerald-200` (bright green) |
| Some available, none unavailable | `bg-emerald-100` (light green) |
| Some available + conflicts | `bg-amber-100` (amber) |
| All maybe, none unavailable | `bg-yellow-100` (yellow) |
| Maybe + unavailable mix | `bg-orange-100` (orange) |
| All unavailable | `bg-red-100` (red) |

Dates with no member responses must remain uncoloured. Both `CalendarGrid` (personal) and `Heatmap` (group) render **month-by-month** with proper month headers, week padding per month, and out-of-range days faded.

### Typography
Inter via `next/font/google`. No other font families.

---

## Known Gotchas

1. **shadcn Dialog on mobile**: The `DialogContent` needs `mx-auto max-w-sm` to not full-screen on iOS.

2. **Unsplash source URL**: `LockBanner` uses `https://source.unsplash.com/800x400/?{keyword}` (a redirect-based URL, not Next.js Image). Add `images.unsplash.com` to `next.config.ts` remotePatterns if switching to `<Image>`.

3. **Week day keys in React**: Never use single-letter day abbreviations (`'S','M','T'…`) as React `key` props — Tuesday and Thursday both map to `'T'`. Always use index or full names.

4. **Heatmap full-month grid**: `heatmap.tsx` renders complete calendar months (not just the date range). Out-of-range days render as faded numbers with no box. This requires `toISO(year, month, day)` for all cells — use `dateStats.get(date) ?? fallback` (never `!` assertion) because not all month days exist in the stats map.

5. **MIN_MEMBERS_FOR_AI = 2**: Minimum group size for AI recommendation to trigger. Requires at least 2 real members to have submitted availability.

7. **Auto-trigger guard**: `hasAutoTriggered.current` (a `useRef`) prevents double-calling the recommend API. If you add manual re-trigger logic, reset this ref appropriately.

8. **Vote upsert**: A member can change their vote at any time before dates are locked. The API and realtime hook both handle this — don't add a "vote once" guard.

9. **Creator check is client-side for UI gating only**: The Lock Dates button visibility is controlled client-side by `isCreator`. The actual enforcement is server-side in `POST /api/trips/[id]/lock` which verifies `member_id === trip.creator_member_id`.

10. **`HEATMAP_COLORS` in `constants.ts` is unused**: `heatmap.tsx` uses its own `getHeatClasses()` function with Tailwind classes — not the `bg-brand-*` tokens in constants. Don't consolidate them without updating the heatmap component.

11. **`MAX_DATE_RANGE_DAYS = 60`**: Trip date ranges are capped at 60 days in `constants.ts`. Enforce this client-side in the creation form if adding validation.

12. **Google Maps**: `@vis.gl/react-google-maps` used in both `shared-map.tsx` and `create-form.tsx`. Import `Map as GoogleMap` to avoid shadowing the JS built-in `Map` constructor. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` required — enable Maps JavaScript API, Places API, and Geocoding API on the same key.

13. **Recommendation deduplication**: `AiVotePanel` filters `allOptions` by unique `start+end` before rendering. This handles the case where `runner_up` equals `best` (no distinct runner up found). Never remove this filter.

14. **Photo upload uses admin client**: `POST /api/trips/[id]/photos` uses `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` for storage upload. The DB insert uses the regular server client. If DB insert fails, the storage file is cleaned up. The `trip-photos` bucket must be created manually in Supabase Storage as a public bucket.

15. **Itinerary state is lifted**: `itinerary` and `itineraryLoading` state live in `PlanDashboard`, not `ItineraryBuilder`. This prevents the itinerary from re-fetching when switching tabs. `ItineraryBuilder` receives `itinerary`, `onItineraryChange`, and `onLoadingChange` as controlled props.

16. **Post-lock redirect must be in useEffect**: Calling `router.push()` during render causes "Cannot update a component while rendering" error. Always wrap navigation side-effects in `useEffect`.

17. **`datesInRange` timezone gotcha**: The helper uses `new Date(str + 'T00:00:00')` (local time) then `.toISOString()` (UTC). On servers/machines in UTC+ timezones, dates shift back by one day. Since the availability records in Supabase are stored as plain date strings (e.g. `'2026-04-07'`), there can be a mismatch between `datesInRange` output and stored dates on non-UTC machines. The same helper is used in seeding (`generateDatesInRange`), so the shift is consistent for Sam's seeded data — but PD's manually-tapped dates are stored as-is. If recommendations show wrong date ranges, this timezone offset is the first thing to investigate. Fix: use `\`${y}-${m}-${d}\`` string construction instead of `toISOString()`.

18. **Revision tracking is client-only**: `triptangle_revisions_{tripId}_{memberId}` in localStorage. Clearing localStorage resets the counter. The `canEdit` flag is computed fresh from localStorage each render — it is not stored in React state.

19. **`runner_up` is now optional**: `RecommendationData.runner_up` is `DateOption | undefined`. Any component consuming `recommendation.runner_up` must guard against undefined. Legacy `vote-poll.tsx` (kept for reference) was updated to spread conditionally.

---

## Deployment

```bash
vercel
```

1. Set all 6 environment variables in the Vercel dashboard (see Environment Variables table)
2. Run `supabase/schema.sql` in Supabase SQL Editor (one-time) — includes `expenses` and `trip_photos` tables
3. Create `trip-photos` storage bucket in Supabase Storage → enable **Public bucket**
4. Verify Realtime enabled for: `members`, `availability`, `votes`, `map_pins`, `polls`, `poll_responses`, `expenses`, `trip_photos`
5. Rotate `ANTHROPIC_API_KEY` if it was ever committed to git history
6. Commit session notes to `C:\Users\priya\OneDrive\Documents\Obsidian Vault\TripTangle\Sessions` before exiting