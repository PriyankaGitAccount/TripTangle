import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateTripId } from '@/lib/trip-utils';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, date_range_start, date_range_end, display_name } =
    body;

  if (!name?.trim() || !date_range_start || !date_range_end || !display_name?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  if (date_range_end < date_range_start) {
    return NextResponse.json(
      { error: 'End date must be after start date' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const tripId = generateTripId();

  // Create trip
  const { error: tripError } = await supabase.from('trips').insert({
    id: tripId,
    name: name.trim(),
    description: (description || '').trim(),
    date_range_start,
    date_range_end,
  });

  if (tripError) {
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    );
  }

  // Create creator as first member
  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({
      trip_id: tripId,
      display_name: display_name.trim(),
      status: 'joined',
    })
    .select('id')
    .single();

  if (memberError) {
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    );
  }

  // Update trip with creator member id
  await supabase
    .from('trips')
    .update({ creator_member_id: member.id })
    .eq('id', tripId);

  return NextResponse.json({
    trip_id: tripId,
    member_id: member.id,
  });
}
