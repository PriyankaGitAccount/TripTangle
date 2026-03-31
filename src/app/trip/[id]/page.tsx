import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { TripDashboard } from '@/components/trip/trip-dashboard';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('name')
    .eq('id', id)
    .single();

  return {
    title: trip ? `${trip.name} — TripTangle` : 'Trip Not Found',
  };
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();

  const [tripResult, membersResult, availabilityResult, recResult, votesResult] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase
        .from('members')
        .select('*')
        .eq('trip_id', id)
        .order('joined_at'),
      supabase.from('availability').select('*').eq('trip_id', id),
      supabase
        .from('ai_recommendations')
        .select('*')
        .eq('trip_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase.from('votes').select('*').eq('trip_id', id),
    ]);

  if (!tripResult.data) {
    notFound();
  }

  return (
    <TripDashboard
      trip={tripResult.data}
      initialMembers={membersResult.data || []}
      initialAvailability={availabilityResult.data || []}
      initialRecommendation={recResult.data?.[0] || null}
      initialVotes={votesResult.data || []}
    />
  );
}
