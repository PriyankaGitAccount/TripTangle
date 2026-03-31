import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getDateRecommendation } from '@/lib/claude';
import { MIN_MEMBERS_FOR_AI } from '@/lib/constants';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch trip, members, and availability
  const [tripResult, membersResult, availabilityResult, existingRecResult] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('members').select('*').eq('trip_id', id),
      supabase.from('availability').select('*').eq('trip_id', id),
      supabase
        .from('ai_recommendations')
        .select('*')
        .eq('trip_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
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

  // Check if cached recommendation is still fresh
  const existing = existingRecResult.data?.[0];
  if (existing) {
    const maxAvailabilityUpdate = Math.max(
      ...availability.map((a) => new Date(a.updated_at).getTime())
    );
    const recTime = new Date(existing.created_at).getTime();
    if (recTime > maxAvailabilityUpdate) {
      return NextResponse.json({ recommendation: existing });
    }
  }

  try {
    const recommendation = await getDateRecommendation(
      trip.name,
      trip.date_range_start,
      trip.date_range_end,
      members,
      availability
    );

    // Store recommendation
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
