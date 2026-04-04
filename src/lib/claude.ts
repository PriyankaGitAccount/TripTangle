import Anthropic from '@anthropic-ai/sdk';
import type { Availability, Member, RecommendationData, DateOption, ItineraryData, FallbackMonths } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface MemberAvailability {
  name: string;
  memberId: string;
  dates: Record<string, string>;
}

/** Returns all ISO date strings in [start, end] inclusive */
function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

interface Window { start: string; end: string; length: number }

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000) + 1;
}

/** Groups consecutive ISO dates into windows, sorted longest-first */
function groupConsecutive(dates: string[]): Window[] {
  if (dates.length === 0) return [];
  const windows: Window[] = [];
  let wStart = dates[0];
  let prev = dates[0];
  for (let i = 1; i < dates.length; i++) {
    const gap = (new Date(dates[i] + 'T00:00:00').getTime() - new Date(prev + 'T00:00:00').getTime()) / 86_400_000;
    if (gap === 1) { prev = dates[i]; }
    else {
      windows.push({ start: wStart, end: prev, length: daysBetween(wStart, prev) });
      wStart = dates[i]; prev = dates[i];
    }
  }
  windows.push({ start: wStart, end: prev, length: daysBetween(wStart, prev) });
  return windows.sort((a, b) => b.length - a.length);
}

function isSameWindow(a: Window, b: Window): boolean {
  return a.start === b.start && a.end === b.end;
}

interface ScoredWindow { window: Window; memberCount: number; totalMembers: number }

/** Longest window where at least threshold members are 'available', distinct from excluded */
function bestPartialWindow(
  allDates: string[],
  memberAvailability: MemberAvailability[],
  exclude: Window[]
): ScoredWindow | null {
  const n = memberAvailability.length;
  for (let threshold = n - 1; threshold >= 1; threshold--) {
    const dates = allDates.filter((d) =>
      memberAvailability.filter((ma) => ma.dates[d] === 'available').length >= threshold
    );
    const windows = groupConsecutive(dates);
    const distinct = windows.find((w) => !exclude.some((ex) => isSameWindow(w, ex)));
    if (distinct) return { window: distinct, memberCount: threshold, totalMembers: n };
  }
  return null;
}

/** Longest window where at least threshold members are 'available' OR 'maybe', distinct from excluded */
function bestNearWindow(
  allDates: string[],
  memberAvailability: MemberAvailability[],
  exclude: Window[]
): ScoredWindow | null {
  const n = memberAvailability.length;
  for (let threshold = n; threshold >= 1; threshold--) {
    const dates = allDates.filter((d) =>
      memberAvailability.filter(
        (ma) => ma.dates[d] === 'available' || ma.dates[d] === 'maybe'
      ).length >= threshold
    );
    const windows = groupConsecutive(dates);
    const distinct = windows.find((w) => !exclude.some((ex) => isSameWindow(w, ex)));
    if (distinct) return { window: distinct, memberCount: threshold, totalMembers: n };
  }
  return null;
}

/** Longest window where a single member has 'maybe' status, distinct from excluded */
function memberMaybeWindow(
  allDates: string[],
  member: MemberAvailability,
  exclude: Window[]
): Window | null {
  const dates = allDates.filter((d) => member.dates[d] === 'maybe');
  const windows = groupConsecutive(dates);
  return windows.find((w) => !exclude.some((ex) => isSameWindow(w, ex))) ?? null;
}

function countForWindow(win: Window, memberAvailability: MemberAvailability[], status: 'available' | 'maybe'): number {
  const dates = datesInRange(win.start, win.end);
  if (dates.length === 0) return 0;
  return Math.min(
    ...dates.map((d) => memberAvailability.filter((ma) => ma.dates[d] === status).length)
  );
}

async function getBestMonths(destination: string, tripName: string): Promise<FallbackMonths> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `You are a travel advisor. Return ONLY valid JSON, no markdown.`,
    messages: [{
      role: 'user',
      content: `The group couldn't find overlapping availability for their trip "${tripName}"${destination ? ` to ${destination}` : ''}.

Suggest the 3 best months to visit. Return:
{
  "message": "short friendly message explaining no overlap was found and suggesting when to plan",
  "months": [
    { "name": "Month Year e.g. July 2026", "reason": "one sentence why it's a great time to visit" },
    { "name": "...", "reason": "..." },
    { "name": "...", "reason": "..." }
  ]
}`,
    }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { message: "No availability overlap found. Here are some great times to visit:", months: [] };
  return JSON.parse(match[0]) as FallbackMonths;
}

interface ClaudeTexts {
  option1_justification: string;
  option2_justification?: string;
  option3_justification?: string;
  nudge: string;
}

export async function getDateRecommendation(
  tripName: string,
  destination: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  creatorMemberId: string,
  members: Member[],
  availability: Availability[]
): Promise<RecommendationData> {
  const submittedMembers = members.filter((m) =>
    availability.some((a) => a.member_id === m.id)
  );

  const memberAvailability: MemberAvailability[] = submittedMembers.map((m) => ({
    name: m.display_name,
    memberId: m.id,
    dates: Object.fromEntries(
      availability.filter((a) => a.member_id === m.id).map((a) => [a.date, a.status])
    ),
  }));

  const allDates = datesInRange(dateRangeStart, dateRangeEnd);
  const n = memberAvailability.length;
  const isTwoMember = n === 2;

  const creatorMa = memberAvailability.find((ma) => ma.memberId === creatorMemberId);
  const otherMas = memberAvailability.filter((ma) => ma.memberId !== creatorMemberId);

  // ── Build options ────────────────────────────────────────────────────────────
  type BuiltOption = {
    window: Window;
    option_type: DateOption['option_type'];
    available_count: number;
    maybe_count: number;
  };
  const builtOptions: BuiltOption[] = [];
  const usedWindows: Window[] = [];

  if (isTwoMember) {
    // ── 2-member path ─────────────────────────────────────────────────────────
    // Option 1: Exact overlap (both available)
    const exactDates = allDates.filter((d) =>
      memberAvailability.every((ma) => ma.dates[d] === 'available')
    );
    const exactWindows = groupConsecutive(exactDates);
    if (exactWindows[0]) {
      builtOptions.push({ window: exactWindows[0], option_type: 'exact', available_count: 2, maybe_count: 0 });
      usedWindows.push(exactWindows[0]);
    }

    // Option 2: Organiser's maybe dates
    if (creatorMa) {
      const creatorMaybeWin = memberMaybeWindow(allDates, creatorMa, usedWindows);
      if (creatorMaybeWin) {
        const availCount = countForWindow(creatorMaybeWin, memberAvailability, 'available');
        const maybeCount = countForWindow(creatorMaybeWin, memberAvailability, 'maybe');
        builtOptions.push({ window: creatorMaybeWin, option_type: 'maybe_organiser', available_count: availCount, maybe_count: maybeCount });
        usedWindows.push(creatorMaybeWin);
      }
    }

    // Option 3: Other member's maybe dates
    const otherMa = otherMas[0];
    if (otherMa) {
      const otherMaybeWin = memberMaybeWindow(allDates, otherMa, usedWindows);
      if (otherMaybeWin) {
        const availCount = countForWindow(otherMaybeWin, memberAvailability, 'available');
        const maybeCount = countForWindow(otherMaybeWin, memberAvailability, 'maybe');
        builtOptions.push({ window: otherMaybeWin, option_type: 'maybe_member', available_count: availCount, maybe_count: maybeCount });
        usedWindows.push(otherMaybeWin);
      }
    }
  } else {
    // ── 3+ member path ────────────────────────────────────────────────────────
    // Option 1: All members fully available; fall back to best partial
    const exactDates = allDates.filter((d) =>
      memberAvailability.every((ma) => ma.dates[d] === 'available')
    );
    const exactWindows = groupConsecutive(exactDates);
    if (exactWindows[0]) {
      builtOptions.push({ window: exactWindows[0], option_type: 'exact', available_count: n, maybe_count: 0 });
      usedWindows.push(exactWindows[0]);
    } else {
      const partialScored = bestPartialWindow(allDates, memberAvailability, usedWindows);
      if (partialScored) {
        const maybeCount = countForWindow(partialScored.window, memberAvailability, 'maybe');
        builtOptions.push({ window: partialScored.window, option_type: 'partial', available_count: partialScored.memberCount, maybe_count: maybeCount });
        usedWindows.push(partialScored.window);
      }
    }

    // Option 2: Max members available or maybe (group compromise)
    const nearScored = bestNearWindow(allDates, memberAvailability, usedWindows);
    if (nearScored) {
      const availCount = countForWindow(nearScored.window, memberAvailability, 'available');
      builtOptions.push({ window: nearScored.window, option_type: 'maybe_group', available_count: availCount, maybe_count: nearScored.memberCount });
      usedWindows.push(nearScored.window);
    }

    // Option 3: Creator's maybe dates
    if (creatorMa) {
      const creatorMaybeWin = memberMaybeWindow(allDates, creatorMa, usedWindows);
      if (creatorMaybeWin) {
        const availCount = countForWindow(creatorMaybeWin, memberAvailability, 'available');
        const maybeCount = countForWindow(creatorMaybeWin, memberAvailability, 'maybe');
        builtOptions.push({ window: creatorMaybeWin, option_type: 'maybe_organiser', available_count: availCount, maybe_count: maybeCount });
        usedWindows.push(creatorMaybeWin);
      }
    }
  }

  // ── Fallback: no windows found ─────────────────────────────────────────────
  if (builtOptions.length === 0) {
    const fallback = await getBestMonths(destination, tripName);
    return {
      best: {
        start: dateRangeStart,
        end: dateRangeEnd,
        available_count: 0,
        maybe_count: 0,
        total_members: n,
        summary: fallback.message,
        option_type: 'exact',
      },
      nudge: "No overlapping dates found. Try adjusting your availability, or check the travel suggestions below.",
      fallback,
    };
  }

  // ── Claude: write 1-liner justifications + nudge ───────────────────────────
  const TYPE_LABELS: Record<string, string> = {
    exact: 'Everyone fully available',
    partial: 'Most members fully available',
    maybe_organiser: "Organiser's maybe window",
    maybe_member: "Other member's maybe window",
    maybe_group: 'Group available or maybe',
  };

  const optionDescriptions = builtOptions.map((opt, i) => {
    const label = TYPE_LABELS[opt.option_type ?? 'partial'];
    return `Option ${i + 1}: ${opt.window.start} to ${opt.window.end} (${opt.window.length} days) — ${label}: ${opt.available_count} available, ${opt.maybe_count} maybe`;
  });

  const schemaShape: Record<string, string> = {
    option1_justification: "punchy 1-liner e.g. 'Everyone's free — perfect overlap'",
    nudge: "friendly 1-2 sentence group vote prompt",
  };
  if (builtOptions.length >= 2) schemaShape.option2_justification = "punchy 1-liner";
  if (builtOptions.length >= 3) schemaShape.option3_justification = "punchy 1-liner";

  const claudeResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `You are the copy-writer for TripTangle, a group travel app. Write only punchy 1-liner justifications for pre-selected date options. Return ONLY valid JSON, no markdown.`,
    messages: [{
      role: 'user',
      content: `Trip: "${tripName}"${destination ? ` to ${destination}` : ''}
Members: ${n} submitted

Pre-selected options:
${optionDescriptions.join('\n')}

Return this exact JSON:
${JSON.stringify(schemaShape, null, 2)}`,
    }],
  });

  const rawText = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const t: ClaudeTexts = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as ClaudeTexts)
    : { option1_justification: '', nudge: 'Vote for your preferred dates below.' };

  // ── Assemble final result — TypeScript owns all dates/counts ──────────────
  const CONFIDENCE: Record<string, number> = {
    exact: 95,
    partial: 72,
    maybe_group: 55,
    maybe_organiser: 42,
    maybe_member: 38,
  };

  const toDateOption = (opt: BuiltOption, justification: string): DateOption => ({
    start: opt.window.start,
    end: opt.window.end,
    available_count: opt.available_count,
    maybe_count: opt.maybe_count,
    total_members: n,
    summary: justification,
    justification,
    option_type: opt.option_type,
    confidence: CONFIDENCE[opt.option_type ?? 'partial'] ?? 50,
  });

  const best = toDateOption(builtOptions[0], t.option1_justification);
  const runner_up = builtOptions[1]
    ? toDateOption(builtOptions[1], t.option2_justification ?? '')
    : undefined;
  const third = builtOptions[2]
    ? toDateOption(builtOptions[2], t.option3_justification ?? '')
    : undefined;

  const result: RecommendationData = { best, nudge: t.nudge };
  if (runner_up) result.runner_up = runner_up;
  if (third) result.alternatives = [third];

  return result;
}

// ─── Itinerary ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getSeasonContext(dateStr: string): string {
  const month = new Date(dateStr + 'T00:00:00').getMonth();
  const name = MONTH_NAMES[month];
  if (month >= 2 && month <= 4) return `Spring — ${name}`;
  if (month >= 5 && month <= 7) return `Summer — ${name}`;
  if (month >= 8 && month <= 10) return `Autumn — ${name}`;
  return `Winter — ${name}`;
}

export async function getItinerary(
  destination: string,
  dateStart: string,
  dateEnd: string,
  memberCount: number,
  tripName: string,
  suggestions: string[] = []
): Promise<ItineraryData> {
  const days = Math.round(
    (new Date(dateEnd + 'T00:00:00').getTime() - new Date(dateStart + 'T00:00:00').getTime()) /
      86_400_000
  ) + 1;

  const season = getSeasonContext(dateStart);
  const suggestionsBlock = suggestions.length > 0
    ? `\nGroup preferences & suggestions to incorporate:\n${suggestions.map(s => `- ${s}`).join('\n')}`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: `You are an expert travel planner. Generate a detailed day-by-day group trip itinerary.
Return ONLY valid JSON — no markdown, no extra keys. Exact shape:
{
  "destination": "City, Country",
  "destination_lat": number,
  "destination_lng": number,
  "season": "Season name and month e.g. Summer — July",
  "weather_context": "1-2 sentences: typical temp range, humidity, what to pack, any weather cautions",
  "summary": "2-3 sentence trip overview that mentions the season and what makes this timing special or challenging",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Arrival & neighbourhood name",
      "activities": [
        {
          "time": "Morning",
          "title": "Specific activity name",
          "place_name": "Exact venue/place name as it appears on Google Maps e.g. Sacré-Cœur Basilica",
          "description": "2-3 sentences. Name real streets, menu items, entry prices, opening hours if known. Be hyper-specific.",
          "category": "accommodation" | "restaurant" | "activity" | "transport"
        }
      ]
    }
  ],
  "tips": [
    "7-10 hyper-local practical tips. Include: tipping customs, transport cards, booking ahead requirements, local scams to avoid, best grocery stores, SIM card advice, cultural etiquette."
  ],
  "search_queries": [
    "8-12 specific YouTube/blog search queries. Mix: neighbourhood guides, food tours, day trips, budget tips, hidden gems, seasonal events."
  ]
}

Critical rules:
- destination_lat/lng = accurate city centre coordinates
- Exactly 3 activities per day (Morning, Afternoon, Evening)
- place_name must be the real name as it appears on Google Maps — this powers place search
- Tailor activities to the season: summer → outdoor/beach/festivals; winter → museums/cosy cafes/markets; etc.
- Account for weather in activity choice and descriptions
- search_queries must be specific enough to return useful YouTube vlogs and travel blogs`,
    messages: [
      {
        role: 'user',
        content: `Trip: "${tripName}"
Destination: ${destination}
Travel dates: ${dateStart} to ${dateEnd} (${days} days)
Season: ${season}
Group size: ${memberCount} people${suggestionsBlock}

Generate a complete ${days}-day itinerary. Day 1 is arrival day, last day is departure.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude returned no JSON for itinerary');
  try {
    return JSON.parse(match[0]) as ItineraryData;
  } catch {
    throw new Error('Claude returned malformed JSON — likely truncated. Try a shorter date range or fewer days.');
  }
}
