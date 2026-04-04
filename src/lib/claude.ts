import Anthropic from '@anthropic-ai/sdk';
import type { Availability, Member, RecommendationData, ItineraryData } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface MemberAvailability {
  name: string;
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

/** Groups an array of consecutive ISO dates into [start, end] windows, sorted longest-first */
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

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000) + 1;
}

export async function getDateRecommendation(
  tripName: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  members: Member[],
  availability: Availability[]
): Promise<RecommendationData> {
  const submittedMembers = members.filter((m) =>
    availability.some((a) => a.member_id === m.id)
  );

  const memberAvailability: MemberAvailability[] = submittedMembers.map((m) => ({
    name: m.display_name,
    dates: Object.fromEntries(
      availability.filter((a) => a.member_id === m.id).map((a) => [a.date, a.status])
    ),
  }));

  const membersWhoHaventSubmitted = members.filter(
    (m) => !availability.some((a) => a.member_id === m.id)
  );

  // Pre-compute exact-match dates: every submitted member marked "available"
  const allDates = datesInRange(dateRangeStart, dateRangeEnd);
  const exactMatchDates = allDates.filter((date) =>
    memberAvailability.every((ma) => ma.dates[date] === 'available')
  );
  const exactWindows = groupConsecutive(exactMatchDates);

  // Near-match dates: every submitted member is "available" or "maybe"
  const nearMatchDates = allDates.filter((date) =>
    memberAvailability.every(
      (ma) => ma.dates[date] === 'available' || ma.dates[date] === 'maybe'
    )
  );
  const nearWindows = groupConsecutive(nearMatchDates);

  const exactSummary =
    exactWindows.length > 0
      ? `EXACT MATCHES (all members fully available): ${exactWindows
          .slice(0, 3)
          .map((w) => `${w.start} to ${w.end} (${w.length} days)`)
          .join(' | ')}`
      : 'No dates exist where every submitted member is fully available.';

  const nearSummary =
    nearWindows.length > 0
      ? `NEAR MATCHES (all members available or maybe): ${nearWindows
          .slice(0, 3)
          .map((w) => `${w.start} to ${w.end} (${w.length} days)`)
          .join(' | ')}`
      : 'No near-match windows found.';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are the date-matching engine for TripTangle, a group travel app.
Your job is to recommend the best trip windows based on group availability.

PRIORITY ORDER for selecting the "best" window:
1. Longest consecutive run where EVERY submitted member is "available" (exact match)
2. If no exact match ≥ 2 days, use the longest run where everyone is "available" or "maybe"
3. Only as a last resort, use partial overlap with highest weighted score

Return ONLY valid JSON, no markdown. Exact shape:
{
  "best": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "available_count": N, "maybe_count": N, "total_members": N, "confidence": 0-100, "summary": "One sentence — mention it's a full group match if it is." },
  "runner_up": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "available_count": N, "maybe_count": N, "total_members": N, "confidence": 0-100, "summary": "...", "trade_off": "Plain-language trade-off, e.g. 'Shifting to 21 Jun includes everyone but shortens the trip by 2 days.'" },
  "alternatives": [
    { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "available_count": N, "maybe_count": N, "total_members": N, "confidence": 0-100, "summary": "...", "trade_off": "..." }
  ],
  "nudge": "Friendly 1-2 sentence message prompting everyone to vote now"
}

confidence = 100 if all members fully available for the whole window, lower if maybes or partial.
Rank strictly by quality descending. Never put a worse window above a better one.`,
    messages: [
      {
        role: 'user',
        content: `Trip: "${tripName}"
Date range: ${dateRangeStart} to ${dateRangeEnd}
Total members: ${members.length} | Submitted: ${submittedMembers.length}
${membersWhoHaventSubmitted.length > 0 ? `Not yet submitted: ${membersWhoHaventSubmitted.map((m) => m.display_name).join(', ')}` : 'All members have submitted.'}

${exactSummary}
${nearSummary}

Full availability data per member:
${JSON.stringify(memberAvailability, null, 2)}

Use the pre-computed exact and near match windows above as the primary basis.
The "best" option MUST use an exact match window if one exists with ≥ 2 days.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude returned no JSON object');
  return JSON.parse(match[0]) as RecommendationData;
}

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
    max_tokens: 2500,
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
  if (!match) throw new Error('Claude returned no JSON object');
  return JSON.parse(match[0]) as ItineraryData;
}
