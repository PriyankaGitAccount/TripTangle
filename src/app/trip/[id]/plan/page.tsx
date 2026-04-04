import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PlanDashboard } from '@/components/plan/plan-dashboard';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: trip } = await supabase.from('trips').select('name').eq('id', id).single();
  return { title: trip ? `Plan — ${trip.name} — TripTangle` : 'Trip Plan' };
}

export default async function PlanPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = createServerClient();

  // Fetch poll IDs first so we can query responses in parallel
  const pollIdsResult = await supabase.from('polls').select('id').eq('trip_id', id);
  const pollIds = pollIdsResult.data?.map((p) => p.id) ?? [];

  const [
    tripResult,
    membersResult,
    itineraryResult,
    suggestionsResult,
    pinsResult,
    pollsResult,
    responsesResult,
    expensesResult,
    photosResult,
  ] = await Promise.all([
    supabase.from('trips').select('*').eq('id', id).single(),
    supabase.from('members').select('*').eq('trip_id', id).order('joined_at'),
    supabase
      .from('itineraries')
      .select('*')
      .eq('trip_id', id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('itinerary_suggestions')
      .select('*')
      .eq('trip_id', id)
      .order('created_at'),
    supabase.from('map_pins').select('*').eq('trip_id', id).order('created_at'),
    supabase.from('polls').select('*').eq('trip_id', id).order('created_at', { ascending: false }),
    pollIds.length > 0
      ? supabase.from('poll_responses').select('*').in('poll_id', pollIds)
      : Promise.resolve({ data: [] }),
    supabase.from('expenses').select('*').eq('trip_id', id).order('created_at'),
    supabase.from('trip_photos').select('*').eq('trip_id', id).order('created_at', { ascending: false }),
  ]);

  if (!tripResult.data) notFound();

  const validTabs = ['itinerary', 'map', 'polls', 'budget', 'photos'] as const;
  const initialTab = validTabs.includes(tab as (typeof validTabs)[number])
    ? (tab as (typeof validTabs)[number])
    : 'itinerary';

  return (
    <PlanDashboard
      trip={tripResult.data}
      members={membersResult.data ?? []}
      initialItinerary={itineraryResult.data?.[0] ?? null}
      initialSuggestions={suggestionsResult.data ?? []}
      initialPins={pinsResult.data ?? []}
      initialPolls={pollsResult.data ?? []}
      initialResponses={responsesResult.data ?? []}
      initialExpenses={expensesResult.data ?? []}
      initialPhotos={photosResult.data ?? []}
      initialTab={initialTab}
    />
  );
}
