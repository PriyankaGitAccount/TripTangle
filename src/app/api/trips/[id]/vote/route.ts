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
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { error } = await supabase.from('votes').upsert(
    {
      member_id,
      trip_id: id,
      option_index,
    },
    { onConflict: 'member_id,trip_id' }
  );

  if (error) {
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
