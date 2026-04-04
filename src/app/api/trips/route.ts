import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateTripId, getDatesBetween } from '@/lib/trip-utils';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const body = await request.json();
  const { name, description, destination, date_range_start, date_range_end } = body;

  if (!name?.trim() || !date_range_start || !date_range_end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (date_range_end < date_range_start) {
    return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
  }

  const tripId = generateTripId();
  const displayName = profile?.display_name ?? 'Organizer';

  const { error: tripError } = await supabase.from('trips').insert({
    id: tripId,
    name: name.trim(),
    description: (description || '').trim(),
    destination: (destination || '').trim(),
    date_range_start,
    date_range_end,
  });
  if (tripError) return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });

  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({ trip_id: tripId, user_id: user.id, display_name: displayName, role: 'organizer', status: 'joined' })
    .select('id')
    .single();
  if (memberError) return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });

  await supabase.from('trips').update({ creator_member_id: member.id }).eq('id', tripId);

  // Seed organizer availability — all dates marked available
  const allDates = getDatesBetween(date_range_start, date_range_end);
  await supabase.from('availability').insert(
    allDates.map((date) => ({ member_id: member.id, trip_id: tripId, date, status: 'available' }))
  );

  return NextResponse.json({ trip_id: tripId, member_id: member.id });
}
