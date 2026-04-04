# TripTangle — Data Flow Diagram

> Full system: UI → API → Database → AI, with edge cases annotated inline.

---

## 1. System Architecture Overview

```mermaid
graph TD
  subgraph Browser["🖥️ Client — Browser"]
    UI_CREATE["Create Trip\n/create"]
    UI_DASH["Trip Dashboard\n/trip/[id]"]
    UI_JOIN["Join Page\n/trip/[id]/join"]
    UI_PLAN["Plan Phase\n/trip/[id]/plan"]
    LS["localStorage\ntriptangle_member_{tripId}"]
    RT_HOOKS["Realtime Hooks\nuseMemberIdentity\nuseRealtimeMembers\nuseRealtimeAvailability\nuseRealtimeVotes\nuseRealtimePins\nuseRealtimePolls\nuseRealtimeExpenses\nuseRealtimePhotos"]
  end

  subgraph Vercel["⚡ Next.js Server — Vercel"]
    SSR["Server Components\nParallel Promise.all fetch\n9 queries on plan page"]
    API["Route Handlers\n/api/trips/*\n20+ endpoints"]
    CLAUDE_LIB["claude.ts\nDate pre-computation\nTypeScript owns all logic"]
  end

  subgraph Anthropic["🤖 Anthropic"]
    HAIKU["claude-haiku-4-5-20251001\nJustifications · Nudge\nItinerary · Fallback months"]
  end

  subgraph Supabase["🗄️ Supabase"]
    PG[("PostgreSQL\n12 tables")]
    REALTIME["Realtime\npostgres_changes\n8 subscribed tables"]
    STORAGE["Storage\ntrip-photos bucket\npublic · service role upload"]
  end

  subgraph Google["🗺️ Google"]
    MAPS["Maps JS API\nPlaces API\nGeocoding API"]
  end

  UI_CREATE -->|POST /api/trips| API
  UI_DASH -->|SSR fetch| SSR
  UI_JOIN -->|POST /api/trips/[id]/join| API
  UI_PLAN -->|SSR fetch 9 queries| SSR
  SSR -->|supabase server client| PG
  API -->|supabase server client| PG
  API -->|ANTHROPIC_API_KEY server-only| CLAUDE_LIB
  CLAUDE_LIB -->|messages.create| HAIKU
  RT_HOOKS -->|supabase browser client| REALTIME
  REALTIME -->|postgres_changes INSERT/UPDATE/DELETE| RT_HOOKS
  API -->|service role key| STORAGE
  UI_PLAN -->|NEXT_PUBLIC_GOOGLE_MAPS_API_KEY| MAPS
  UI_CREATE -->|Places autocomplete| MAPS
  UI_DASH -->|read/write| LS
```

---

## 2. Trip Creation Flow

```mermaid
flowchart TD
  A([User fills Create Form]) --> B{Validation}
  B -->|name/dest/displayName missing| ERR1["❌ Toast: fill all fields"]
  B -->|end date < start date| ERR2["❌ Toast + red inline error\nclient-side AND server-side check"]
  B -->|range > 60 days| ERR3["❌ Toast: exceeds MAX_DATE_RANGE_DAYS"]
  B -->|valid| C["POST /api/trips"]

  C --> D["Generate 12-char nanoid trip ID"]
  D --> E["INSERT trips row"]
  E --> F["INSERT creator as members row\nstatus='joined'"]
  F --> G["UPDATE trips.creator_member_id"]
  G --> H["INSERT demo member Sam\nstatus='joined'"]
  H --> I["INSERT demo member Zoe\nstatus='joined'"]
  I --> J["Seed Sam availability\ndays 0–6: available weekday / maybe weekend\ndays 7–13: maybe weekday / unavailable weekend\nday 14+: unavailable"]
  J --> K["Seed Zoe availability\ndays 0–2: unavailable\ndays 3–9: available weekday / maybe weekend\ndays 10–13: maybe weekday / unavailable weekend\nday 14+: unavailable"]
  K --> L["Return trip_id + member_id"]
  L --> M["Store in localStorage\ntriptangle_member_{tripId}"]
  M --> N(["Redirect → /trip/{id}"])

  style ERR1 fill:#fee2e2,stroke:#ef4444
  style ERR2 fill:#fee2e2,stroke:#ef4444
  style ERR3 fill:#fee2e2,stroke:#ef4444
```

---

## 3. Member Identity & Join Flow

```mermaid
flowchart TD
  A([User opens /trip/id]) --> B{"localStorage\ntriptangle_member_{tripId}\nexists?"}
  B -->|yes| C["Load memberId + displayName\nfrom localStorage"]
  B -->|no| D(["Redirect → /trip/id/join"])

  D --> E["User enters display name"]
  E --> F["POST /api/trips/[id]/join"]
  F --> G{"display_name already\ntaken in this trip?"}
  G -->|yes 23505 unique violation| ERR["❌ Toast: name taken, try another"]
  G -->|no| H["INSERT members row"]
  H --> I["Return member_id UUID"]
  I --> J["Store in localStorage"]
  J --> K(["Redirect → /trip/id"])
  C --> K

  style ERR fill:#fee2e2,stroke:#ef4444
```

---

## 4. Availability Marking Flow

```mermaid
flowchart TD
  A([User taps a date cell]) --> B["Cycle status\navailable → maybe → unavailable → null"]
  B --> C["Optimistic: setLocalStatus immediately\n⚡ UI responds in 0ms"]
  C --> D["Restart 3s pause timer\nonPauseRef.current read on fire\n— avoids stale closure race"]
  D --> E["Debounce 300ms per cell\nMap of NodeJS.Timeout refs"]
  E --> F["POST /api/trips/[id]/availability\n{member_id, date, status}"]

  F --> G{status null?}
  G -->|null = clear| H["DELETE from availability\nwhere member_id + trip_id + date"]
  G -->|available/maybe/unavailable| I["UPSERT availability\nUNIQUE(member_id, trip_id, date)"]

  H --> J["onRemove callback\npatch local availability state"]
  I --> K["onSave callback\npatch local availability state"]

  F -->|network error| ERR["❌ Toast error\nRevert local state\ndelete from localStatus map"]

  D --> L{"3s idle timer fires\nhasPendingChanges?"}
  L -->|yes, revision count < 3| M["handlePause → POST /recommend\nincrement localStorage revision counter"]
  L -->|revision count = 3| N["canEdit = false\nCalendar cells disabled\n'Max revisions reached' notice"]

  style ERR fill:#fee2e2,stroke:#ef4444
  style N fill:#fef3c7,stroke:#f59e0b
```

---

## 5. AI Recommendation Flow

```mermaid
flowchart TD
  A{"submittedCount\n=== members.length?"} -->|no| WAIT["Show RecommendationTrigger\nmanual trigger card"]
  A -->|yes + hasAutoTriggered=false| B["hasAutoTriggered.current = true\nPOST /api/trips/[id]/recommend"]

  B --> C["DELETE old ai_recommendations row\nno caching — always fresh"]
  C --> D["TypeScript pre-computes ALL windows\ngroupConsecutive · bestPartialWindow\nbestNearWindow · memberMaybeWindow"]

  D --> E{n members?}

  E -->|n = 2| F["2-member path:\nOption 1: exact both-available window\nOption 2: organiser's maybe window\nOption 3: other member's maybe window"]

  E -->|n ≥ 3| G["3+ member path:\nOption 1: all-available exact / best partial fallback\nOption 2: max-members available+maybe window\nOption 3: organiser's maybe window"]

  F --> H["Claude call:\n1-liner justification per option\n+ nudge string\nmax_tokens: 400"]
  G --> H

  H --> I{any windows found?}
  I -->|yes| J["INSERT ai_recommendations\nRecommendationData JSON"]
  I -->|no| K["Separate Claude call\nFallbackMonths: 3 travel month suggestions"]

  J --> L["AiVotePanel renders:\nPERFECT MATCH / BEST AVAILABLE\nORGANISER'S MAYBE / MEMBER'S MAYBE\nGROUP COMPROMISE\nDeduplication: filter unique start+end"]
  K --> M["AiVotePanel isFallbackMode:\nRenders month cards instead of vote options"]
```

---

## 6. Vote-to-Lock Flow

```mermaid
flowchart TD
  A([Member clicks Vote on an option]) --> B["POST /api/trips/[id]/vote\n{member_id, option_index}"]
  B --> C["UPSERT votes\nUNIQUE(member_id, trip_id)\n— member can change vote anytime"]
  C --> D["Realtime: useRealtimeVotes\npatch local vote state\nINSERT → add · UPDATE → replace"]

  D --> E["Vote counts recalculated\nvoteCounts = [n0, n1, n2]"]
  E --> F{isCreator\nAND votes exist?}
  F -->|no| WAIT["Show vote counts live\nleading option highlighted"]
  F -->|yes| G["Show 'Lock Winning Dates' button\nwinner = option with Math.max votes"]

  G --> H([Creator clicks Lock]) --> I["POST /api/trips/[id]/lock\n{member_id, option_index}"]
  I --> J{"member_id ===\ntrip.creator_member_id?\nServer-side check"}
  J -->|no| ERR["❌ 403 Unauthorized\nclient-side check is UI-only"]
  J -->|yes| K["UPDATE trips\nlocked_dates_start/end\nfrom winning option"]
  K --> L["useEffect detects isLocked\nrouter.push /trip/id/plan\n⚠️ NOT in render body"]

  style ERR fill:#fee2e2,stroke:#ef4444
```

---

## 7. Plan Phase Flow

```mermaid
flowchart TD
  A([User visits /trip/id/plan]) --> B["SSR: 9 parallel Supabase queries\ntrip · members · itinerary · suggestions\npins · polls · responses · expenses · photos"]
  B --> C["PlanDashboard hydrated\nwith all initial data"]

  C --> D{Active tab}

  D -->|Itinerary| E["ItineraryBuilder\nauto-generates on first load\nif no itinerary exists"]
  E --> F["POST /api/trips/[id]/itinerary"]
  F --> G["DELETE existing itinerary row\nBuild prompt with member suggestions\ngetItinerary() → Claude"]
  G --> H["Claude returns ItineraryData\ndays[] · tips[] · search_queries[]\ndestination_lat/lng"]
  H --> I["INSERT itineraries row\nitinerary state lifted to PlanDashboard\n— persists across tab switches"]

  D -->|Map| J["SharedMap\n🔒 Locked until itinerary exists\nAI itinerary places: green teardrop pins\nMember pins: coloured teardrop pins"]
  J --> K["POST /api/trips/[id]/pins\nOwner-only DELETE enforced server-side"]

  D -->|Polls| L["DailyPolls\n🔒 Locked until itinerary exists\nCreate poll: 2–6 options"]
  L --> M["POST /api/trips/[id]/polls\nPOST /api/trips/[id]/polls/[id]/vote\nUPSERT poll_responses UNIQUE(poll_id, member_id)"]

  D -->|Budget| N["BudgetTracker\nAdd expense · per-category totals\nBalance per member · greedy settlement"]
  N --> O["POST /api/trips/[id]/expenses\nDELETE /api/trips/[id]/expenses/[id]\nowner-only delete"]
  O --> P["calculateSettlement()\nGreedy debt simplification\ncreditors sorted desc · debtors sorted desc"]

  D -->|Photos| Q["PhotoGallery\nPer-member sub-tabs\nDrag-and-drop upload 10MB limit"]
  Q --> R["POST /api/trips/[id]/photos\nSupabase Storage upload\nservice role key server-side\nClean up storage if DB insert fails"]
```

---

## 8. Realtime Data Sync

```mermaid
flowchart LR
  subgraph Tables["Supabase Realtime — Subscribed Tables"]
    T1[members]
    T2[availability]
    T3[votes]
    T4[map_pins]
    T5[polls]
    T6[poll_responses]
    T7[expenses]
    T8[trip_photos]
  end

  subgraph Hooks["Client Realtime Hooks — Seed + Patch Pattern"]
    H1["useRealtimeMembers\ninitialMembers prop"]
    H2["useRealtimeAvailability\ninitialAvailability prop"]
    H3["useRealtimeVotes\ninitialVotes prop"]
    H4["useRealtimePins\ninitialPins prop"]
    H5["useRealtimePolls\ninitialPolls prop"]
    H6["useRealtimeExpenses\ninitialExpenses prop"]
    H7["useRealtimePhotos\ninitialPhotos prop"]
  end

  T1 -->|postgres_changes\nfilter: trip_id=eq.{id}| H1
  T2 -->|INSERT/UPDATE/DELETE| H2
  T3 -->|INSERT/UPDATE/DELETE| H3
  T4 -->|INSERT/DELETE| H4
  T5 & T6 -->|INSERT/UPDATE/DELETE| H5
  T7 -->|INSERT/DELETE| H7
  T8 -->|INSERT/DELETE| H7
```

---

## 9. Edge Cases Handled

| # | Edge Case | Where Handled | How |
|---|---|---|---|
| 1 | **End date < start date** | `create-form.tsx` (client) + `/api/trips` (server) | `min={dateStart}` on end input · inline red error · submit guard · server `dateEnd < dateStart` check |
| 2 | **Stale closure in pause timer** | `calendar-grid.tsx` | `onPauseRef` — `useRef` synced via `useEffect`; timer always reads `.current`, not captured prop value |
| 3 | **Double AI auto-trigger** | `trip-dashboard.tsx` | `hasAutoTriggered.current` ref — set to `true` before first call, never resets |
| 4 | **runner_up absent** | `recommendation-card.tsx` · `vote-poll.tsx` | `runner_up?: DateOption \| undefined` — conditional spread `...(runner_up ? [runner_up] : [])` |
| 5 | **Duplicate recommendation options** | `ai-vote-panel.tsx` | Filter `allOptions` by unique `start+end` before rendering |
| 6 | **Supabase policy already exists** | `supabase/schema.sql` | `DROP POLICY IF EXISTS` before every `CREATE POLICY` |
| 7 | **Supabase publication already exists** | `supabase/schema.sql` | `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables...) END $$` |
| 8 | **Member name conflict on join** | `/api/trips/[id]/join` | Catch Supabase error code `23505` (unique violation) → return 409 with "name taken" |
| 9 | **Post-lock redirect during render** | `trip-dashboard.tsx` | `router.push()` inside `useEffect` — never in render body |
| 10 | **Creator-only lock — client bypass** | `/api/trips/[id]/lock` | UI hides Lock button if `!isCreator`, but server re-checks `member_id === trip.creator_member_id` |
| 11 | **Photo storage orphan on DB fail** | `/api/trips/[id]/photos` | If DB insert fails after storage upload, server deletes the uploaded file from Storage |
| 12 | **Max revision guard** | `trip-dashboard.tsx` | `triptangle_revisions_{tripId}_{memberId}` in localStorage; `canEdit=false` after 3 revisions |
| 13 | **Timezone shift in datesInRange** | `claude.ts` | `new Date(str + 'T00:00:00')` (local time) then `.toISOString()` — consistent with seeding but can drift on UTC+ servers; known gotcha documented |
| 14 | **`Map` shadowed by Google Maps import** | `shared-map.tsx` | `import { Map as GoogleMap }` — avoids overwriting JS built-in `Map` |
| 15 | **React key collision on day letters** | `heatmap.tsx` · `calendar-grid.tsx` | Week days keyed by index, not letter (`'T'` would collide for Tue + Thu) |
| 16 | **Itinerary state lost on tab switch** | `plan-dashboard.tsx` | `itinerary` state lifted to `PlanDashboard`; `ItineraryBuilder` receives it as controlled prop |
| 17 | **Realtime event field name** | All realtime hooks | `payload.eventType` not `payload.event` — Supabase JS v2 API difference |
| 18 | **Vote can be changed** | `/api/trips/[id]/vote` + `useRealtimeVotes` | UPSERT on `UNIQUE(member_id, trip_id)` — no "vote once" lock; UPDATE event replaces in local state |
| 19 | **`HEATMAP_COLORS` constant unused** | `constants.ts` | `heatmap.tsx` uses its own `getHeatClasses()` with Tailwind classes — not the `bg-brand-*` tokens; documented to prevent accidental consolidation |
| 20 | **No availability overlap → fallback** | `claude.ts` | When zero windows found, separate Claude call returns `FallbackMonths`; `AiVotePanel` detects `isFallbackMode` and renders month suggestions |

---

## 10. Database Schema — Entity Relationships

```mermaid
erDiagram
  trips {
    TEXT id PK
    TEXT name
    TEXT description
    TEXT destination
    DATE date_range_start
    DATE date_range_end
    UUID creator_member_id FK
    DATE locked_dates_start
    DATE locked_dates_end
  }

  members {
    UUID id PK
    TEXT trip_id FK
    TEXT display_name
    TEXT status
  }

  availability {
    UUID id PK
    UUID member_id FK
    TEXT trip_id FK
    DATE date
    TEXT status
  }

  votes {
    UUID id PK
    UUID member_id FK
    TEXT trip_id FK
    INTEGER option_index
  }

  ai_recommendations {
    UUID id PK
    TEXT trip_id FK
    JSONB recommendation_json
  }

  itineraries {
    UUID id PK
    TEXT trip_id FK
    JSONB itinerary_json
  }

  itinerary_suggestions {
    UUID id PK
    TEXT trip_id FK
    UUID member_id FK
    TEXT suggestion
  }

  map_pins {
    UUID id PK
    TEXT trip_id FK
    UUID member_id FK
    FLOAT lat
    FLOAT lng
    TEXT title
    TEXT category
    TEXT note
  }

  polls {
    UUID id PK
    TEXT trip_id FK
    UUID created_by_member_id FK
    TEXT question
    JSONB options
    DATE poll_date
  }

  poll_responses {
    UUID id PK
    UUID poll_id FK
    UUID member_id FK
    INTEGER option_index
  }

  expenses {
    UUID id PK
    TEXT trip_id FK
    UUID paid_by_member_id FK
    NUMERIC amount
    TEXT description
    TEXT category
    JSONB split_among
  }

  trip_photos {
    UUID id PK
    TEXT trip_id FK
    UUID member_id FK
    TEXT file_name
    TEXT file_path
    INTEGER file_size
    TEXT content_type
  }

  trips ||--o{ members : "has"
  trips ||--o{ availability : "tracks"
  trips ||--o{ votes : "receives"
  trips ||--o{ ai_recommendations : "stores"
  trips ||--o{ itineraries : "has"
  trips ||--o{ itinerary_suggestions : "collects"
  trips ||--o{ map_pins : "contains"
  trips ||--o{ polls : "has"
  trips ||--o{ expenses : "tracks"
  trips ||--o{ trip_photos : "stores"
  members ||--o{ availability : "marks"
  members ||--o{ votes : "casts"
  members ||--o{ itinerary_suggestions : "submits"
  members ||--o{ map_pins : "adds"
  members ||--o{ poll_responses : "responds"
  members ||--o{ expenses : "pays"
  members ||--o{ trip_photos : "uploads"
  polls ||--o{ poll_responses : "receives"
```
