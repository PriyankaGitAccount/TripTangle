import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { member_id, date, status } = body;

  if (!member_id || !date) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // If status is null, delete the availability entry
  if (!status) {
    await supabase
      .from('availability')
      .delete()
      .eq('member_id', member_id)
      .eq('trip_id', id)
      .eq('date', date);

    return NextResponse.json({ ok: true });
  }

  // Upsert availability — return the saved record so the client can update state immediately
  const { data, error } = await supabase
    .from('availability')
    .upsert(
      {
        member_id,
        trip_id: id,
        date,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id,trip_id,date' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save availability' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, record: data });
}
