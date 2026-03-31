import Anthropic from '@anthropic-ai/sdk';
import type { Availability, Member, RecommendationData } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface MemberAvailability {
  name: string;
  dates: Record<string, string>;
}

export async function getDateRecommendation(
  tripName: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  members: Member[],
  availability: Availability[]
): Promise<RecommendationData> {
  const memberMap = new Map(members.map((m) => [m.id, m.display_name]));

  const memberAvailability: MemberAvailability[] = members
    .filter((m) => availability.some((a) => a.member_id === m.id))
    .map((m) => ({
      name: m.display_name,
      dates: Object.fromEntries(
        availability
          .filter((a) => a.member_id === m.id)
          .map((a) => [a.date, a.status])
      ),
    }));

  const membersWhoHaventSubmitted = members.filter(
    (m) => !availability.some((a) => a.member_id === m.id)
  );

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are the AI engine for TripTangle, a group travel coordination app.
Given the availability data for a group trip, analyse the overlap and return:
1. The best date window (consecutive days with maximum group attendance)
2. A runner-up option with a clear trade-off explanation
3. A plain-language summary that's friendly and actionable

IMPORTANT: Return ONLY valid JSON, no markdown, no code fences. Use this exact shape:
{
  "best": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "available_count": N, "maybe_count": N, "total_members": N, "summary": "..." },
  "runner_up": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "available_count": N, "maybe_count": N, "total_members": N, "summary": "...", "trade_off": "..." },
  "nudge": "A friendly 1-2 sentence message to the group encouraging them to vote"
}`,
    messages: [
      {
        role: 'user',
        content: `Trip: "${tripName}"
Date range: ${dateRangeStart} to ${dateRangeEnd}
Total members: ${members.length}
Members who submitted availability: ${memberAvailability.length}
${membersWhoHaventSubmitted.length > 0 ? `Members who haven't submitted: ${membersWhoHaventSubmitted.map((m) => m.display_name).join(', ')}` : ''}

Availability data:
${JSON.stringify(memberAvailability, null, 2)}

Find the best consecutive date windows (ideally 3-7 days) where the most people can attend. Prefer windows where more people are "available" (not just "maybe"). Consider "maybe" as half-weight.`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(text);
  return parsed as RecommendationData;
}
