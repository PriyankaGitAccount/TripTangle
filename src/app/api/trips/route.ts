import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateTripId } from '@/lib/trip-utils';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, destination, date_range_start, date_range_end, display_name } =
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
    destination: (destination || '').trim(),
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

  // Create demo member "Sam" — available early, maybe mid, unavailable late
  const { data: demoSam } = await supabase
    .from('members')
    .insert({ trip_id: tripId, display_name: 'Sam', status: 'joined' })
    .select('id')
    .single();

  // Create demo member "Zoe" — offset pattern: busy early, free mid, maybe late
  const { data: demoZoe } = await supabase
    .from('members')
    .insert({ trip_id: tripId, display_name: 'Zoe', status: 'joined' })
    .select('id')
    .single();

  const allDates = generateDatesInRange(date_range_start, date_range_end);

  if (demoSam) {
    const samRows = allDates.map((date, index) => {
      const dow = new Date(date + 'T00:00:00').getDay(); // 0=Sun, 6=Sat
      let status: string;
      if (index < 7) {
        status = dow === 0 || dow === 6 ? 'maybe' : 'available';
      } else if (index < 14) {
        status = dow === 0 || dow === 6 ? 'unavailable' : 'maybe';
      } else {
        status = 'unavailable';
      }
      return { trip_id: tripId, member_id: demoSam.id, date, status };
    });
    await supabase.from('availability').insert(samRows);
  }

  if (demoZoe) {
    const zoeRows = allDates.map((date, index) => {
      const dow = new Date(date + 'T00:00:00').getDay();
      let status: string;
      // Zoe is busy the first 3 days, then free days 3-9, maybe days 10-13, unavailable after
      if (index < 3) {
        status = 'unavailable';
      } else if (index < 10) {
        status = dow === 0 || dow === 6 ? 'maybe' : 'available';
      } else if (index < 14) {
        status = dow === 0 || dow === 6 ? 'unavailable' : 'maybe';
      } else {
        status = 'unavailable';
      }
      return { trip_id: tripId, member_id: demoZoe.id, date, status };
    });
    await supabase.from('availability').insert(zoeRows);
  }

  return NextResponse.json({
    trip_id: tripId,
    member_id: member.id,
  });
}

function generateDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
