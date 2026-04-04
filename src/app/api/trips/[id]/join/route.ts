import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { display_name } = body;

  if (!display_name?.trim()) {
    return NextResponse.json(
      { error: 'Display name is required' },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  // Check trip exists
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', id)
    .single();

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  // Try to insert member (unique constraint will catch duplicate names)
  const { data: member, error } = await supabase
    .from('members')
    .insert({
      trip_id: id,
      display_name: display_name.trim(),
      status: 'joined',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'That name is already taken for this trip' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to join trip' },
      { status: 500 }
    );
  }

  return NextResponse.json({ member_id: member.id });
}
