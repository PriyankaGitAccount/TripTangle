import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { member_id, suggestion } = await req.json();

  if (!member_id || !suggestion?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('itinerary_suggestions')
    .insert({ trip_id: id, member_id, suggestion: suggestion.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to save suggestion' }, { status: 500 });
  }

  return NextResponse.json({ suggestion: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { suggestion_id, member_id } = await req.json();

  if (!suggestion_id || !member_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createServerClient();
  // Only the suggestion author can delete
  await supabase
    .from('itinerary_suggestions')
    .delete()
    .eq('id', suggestion_id)
    .eq('trip_id', id)
    .eq('member_id', member_id);

  return NextResponse.json({ ok: true });
}
