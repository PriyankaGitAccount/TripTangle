import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
  const { pollId } = await params;
  const body = await req.json();
  const { member_id, option_index } = body;

  if (!member_id || typeof option_index !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('poll_responses')
    .upsert(
      { poll_id: pollId, member_id, option_index },
      { onConflict: 'poll_id,member_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }

  return NextResponse.json({ response: data });
}
