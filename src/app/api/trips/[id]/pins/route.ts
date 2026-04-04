import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { member_id, lat, lng, title, category = 'activity', note = '' } = body;

  if (!member_id || typeof lat !== 'number' || typeof lng !== 'number' || !title?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['accommodation', 'restaurant', 'activity', 'other'].includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('map_pins')
    .insert({ trip_id: id, member_id, lat, lng, title: title.trim(), category, note: note.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to add pin' }, { status: 500 });
  }

  return NextResponse.json({ pin: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { pin_id, member_id } = body;

  if (!pin_id || !member_id) {
    return NextResponse.json({ error: 'Missing pin_id or member_id' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Only the pin owner can delete
  const { error } = await supabase
    .from('map_pins')
    .delete()
    .eq('id', pin_id)
    .eq('trip_id', id)
    .eq('member_id', member_id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
