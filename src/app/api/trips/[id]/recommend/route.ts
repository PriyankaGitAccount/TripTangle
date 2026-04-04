import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getDateRecommendation } from '@/lib/claude';
import { MIN_MEMBERS_FOR_AI } from '@/lib/constants';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Fetch trip, members, and availability
  const [tripResult, membersResult, availabilityResult] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('members').select('*').eq('trip_id', id),
      supabase.from('availability').select('*').eq('trip_id', id),
    ]);

  if (!tripResult.data) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const trip = tripResult.data;
  const members = membersResult.data || [];
  const availability = availabilityResult.data || [];

  // Check minimum members who submitted
  const submittedMemberIds = new Set(availability.map((a) => a.member_id));
  if (submittedMemberIds.size < MIN_MEMBERS_FOR_AI) {
    return NextResponse.json(
      {
        error: `Need at least ${MIN_MEMBERS_FOR_AI} members to submit availability`,
      },
      { status: 400 }
    );
  }

  try {
    const recommendation = await getDateRecommendation(
      trip.name,
      trip.destination ?? '',
      trip.date_range_start,
      trip.date_range_end,
      trip.creator_member_id,
      members,
      availability
    );

    // Replace any existing recommendation for this trip
    await supabase.from('ai_recommendations').delete().eq('trip_id', id);
    const { data: saved, error } = await supabase
      .from('ai_recommendations')
      .insert({
        trip_id: id,
        recommendation_json: recommendation,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save recommendation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ recommendation: saved });
  } catch (err) {
    return NextResponse.json(
      { error: 'AI recommendation failed. Please try again.' },
      { status: 500 }
    );
  }
}
