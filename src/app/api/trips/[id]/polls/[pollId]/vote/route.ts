import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
  const { pollId } = await params;
  const body = await req.json();
  const { member_id, option_index, is_multiselect } = body;

  if (!member_id || typeof option_index !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createServerClient();

  if (is_multiselect) {
    // Toggle: if this (poll, member, option) exists — delete it; otherwise insert it
    const { data: existing } = await supabase
      .from('poll_responses')
      .select('id')
      .eq('poll_id', pollId)
      .eq('member_id', member_id)
      .eq('option_index', option_index)
      .maybeSingle();

    if (existing) {
      await supabase.from('poll_responses').delete().eq('id', existing.id);
      return NextResponse.json({ action: 'removed' });
    } else {
      const { data, error } = await supabase
        .from('poll_responses')
        .insert({ poll_id: pollId, member_id, option_index })
        .select()
        .single();
      if (error) return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
      return NextResponse.json({ response: data, action: 'added' });
    }
  } else {
    // Single-select: delete all existing responses for this member, then insert new
    await supabase
      .from('poll_responses')
      .delete()
      .eq('poll_id', pollId)
      .eq('member_id', member_id);

    const { data, error } = await supabase
      .from('poll_responses')
      .insert({ poll_id: pollId, member_id, option_index })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
    return NextResponse.json({ response: data, action: 'added' });
  }
}
