import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const [tripResult, membersResult, availabilityResult, recommendationResult, votesResult] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('members').select('*').eq('trip_id', id).order('joined_at'),
      supabase.from('availability').select('*').eq('trip_id', id),
      supabase
        .from('ai_recommendations')
        .select('*')
        .eq('trip_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase.from('votes').select('*').eq('trip_id', id),
    ]);

  if (tripResult.error || !tripResult.data) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  return NextResponse.json({
    trip: tripResult.data,
    members: membersResult.data || [],
    availability: availabilityResult.data || [],
    recommendation:
      recommendationResult.data && recommendationResult.data.length > 0
        ? recommendationResult.data[0]
        : null,
    votes: votesResult.data || [],
  });
}
