import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { member_id, option_index } = body;

  if (!member_id || option_index === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Save / update vote
  const { error: voteError } = await supabase
    .from('votes')
    .upsert({ member_id, trip_id: id, option_index }, { onConflict: 'member_id,trip_id' });

  if (voteError) {
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
  }

  // ── Consensus check ──────────────────────────────────────────────
  const [{ data: allVotes }, { data: members }, { data: tripRow }] = await Promise.all([
    supabase.from('votes').select('option_index').eq('trip_id', id),
    supabase.from('members').select('id').eq('trip_id', id),
    supabase.from('trips').select('locked_dates_start').eq('id', id).single(),
  ]);

  // Already locked — nothing to do
  if (tripRow?.locked_dates_start) {
    return NextResponse.json({ ok: true, auto_locked: false });
  }

  const memberCount = members?.length ?? 0;
  if (memberCount < 2) {
    return NextResponse.json({ ok: true, auto_locked: false });
  }

  // Tally votes per option
  const tally: Record<number, number> = {};
  for (const v of allVotes ?? []) {
    tally[v.option_index] = (tally[v.option_index] ?? 0) + 1;
  }

  // Strict majority: more than half of ALL members (not just voters)
  const majority = Math.floor(memberCount / 2) + 1;
  const winnerEntry = Object.entries(tally).find(([, count]) => count >= majority);

  if (!winnerEntry) {
    return NextResponse.json({ ok: true, auto_locked: false });
  }

  // Fetch recommendation to get winning option dates
  const { data: rec } = await supabase
    .from('ai_recommendations')
    .select('recommendation_json')
    .eq('trip_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!rec) {
    return NextResponse.json({ ok: true, auto_locked: false });
  }

  const { best, runner_up, alternatives = [] } = rec.recommendation_json as {
    best: { start: string; end: string };
    runner_up: { start: string; end: string };
    alternatives?: { start: string; end: string }[];
  };
  const allOptions = [best, runner_up, ...alternatives];
  const winner = allOptions[parseInt(winnerEntry[0])];

  if (!winner) {
    return NextResponse.json({ ok: true, auto_locked: false });
  }

  await supabase
    .from('trips')
    .update({ locked_dates_start: winner.start, locked_dates_end: winner.end })
    .eq('id', id);

  return NextResponse.json({
    ok: true,
    auto_locked: true,
    locked_start: winner.start,
    locked_end: winner.end,
  });
}
