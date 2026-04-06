import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// PATCH — lock the winning option for a poll
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
  const { pollId } = await params;
  const body = await req.json();
  const { member_id, winning_option_index } = body;

  if (!member_id || typeof winning_option_index !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Only poll creator can lock
  const { data: poll } = await supabase
    .from('polls')
    .select('created_by_member_id')
    .eq('id', pollId)
    .single();

  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  if (poll.created_by_member_id !== member_id) {
    return NextResponse.json({ error: 'Only the poll creator can lock the answer' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('polls')
    .update({ winning_option_index })
    .eq('id', pollId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to lock answer' }, { status: 500 });
  return NextResponse.json({ poll: data });
}
