import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getItinerary } from '@/lib/claude';

export const maxDuration = 30;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: trip }, { data: members }, { data: suggestions }] = await Promise.all([
    supabase
      .from('trips')
      .select('name, destination, date_range_start, date_range_end, locked_dates_start, locked_dates_end')
      .eq('id', id)
      .single(),
    supabase.from('members').select('id').eq('trip_id', id),
    supabase
      .from('itinerary_suggestions')
      .select('suggestion')
      .eq('trip_id', id)
      .order('created_at'),
  ]);

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  if (!trip.destination?.trim()) {
    return NextResponse.json({ error: 'Trip has no destination set' }, { status: 400 });
  }

  // Prefer locked dates for the itinerary — they're the confirmed travel window
  const dateStart = trip.locked_dates_start ?? trip.date_range_start;
  const dateEnd   = trip.locked_dates_end   ?? trip.date_range_end;

  const itinerary = await getItinerary(
    trip.destination,
    dateStart,
    dateEnd,
    members?.length ?? 1,
    trip.name,
    suggestions?.map((s) => s.suggestion) ?? []
  );

  // Replace any existing itinerary
  await supabase.from('itineraries').delete().eq('trip_id', id);
  const { data: saved, error } = await supabase
    .from('itineraries')
    .insert({ trip_id: id, itinerary_json: itinerary })
    .select()
    .single();

  if (error) {
    console.error('[itinerary] Supabase insert error:', error);
    return NextResponse.json({ error: `Failed to save itinerary: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ itinerary: saved });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data } = await supabase
    .from('itineraries')
    .select('*')
    .eq('trip_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ itinerary: data ?? null });
}
