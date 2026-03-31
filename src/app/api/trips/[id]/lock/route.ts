import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { member_id, start, end } = body;

  if (!member_id || !start || !end) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Verify caller is trip creator
  const { data: trip } = await supabase
    .from('trips')
    .select('creator_member_id')
    .eq('id', id)
    .single();

  if (!trip || trip.creator_member_id !== member_id) {
    return NextResponse.json(
      { error: 'Only the trip creator can lock dates' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('trips')
    .update({
      locked_dates_start: start,
      locked_dates_end: end,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to lock dates' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
