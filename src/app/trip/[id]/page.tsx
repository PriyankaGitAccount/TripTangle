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
    .select('name, destination, date_range_start, date_range_end')
    .eq('id', id)
    .single();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://triptangle.vercel.app';
  const url = `${baseUrl}/trip/${id}`;

  if (!trip) return { title: 'Trip Not Found — TripTangle' };

  const title = `${trip.name} — TripTangle`;
  const description = trip.destination
    ? `You're invited to plan a trip to ${trip.destination}! Pick your available dates and let TripTangle find the best time for everyone.`
    : `You're invited to plan a group trip! Pick your available dates and let TripTangle find the best time for everyone.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'TripTangle',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();

  const [tripResult, membersResult, availabilityResult, recResult, votesResult, inviteResult] =
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
      supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('trip_id', id),
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
      initialInviteCount={inviteResult.count ?? 0}
    />
  );
}
