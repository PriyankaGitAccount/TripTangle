import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { TripDashboard } from '@/components/trip/trip-dashboard';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('name, destination')
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
    openGraph: { title, description, url, siteName: 'TripTangle', type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/trip/${id}`);

  const { data: trip } = await supabase.from('trips').select('*').eq('id', id).single();
  if (!trip) notFound();

  // Check membership
  let { data: member } = await supabase
    .from('members')
    .select('id, role, display_name')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single();

  if (!member) {
    // Not a member yet
    if (trip.locked_dates_start) {
      // Locked — block new members
      return (
        <div className="min-h-screen flex items-center justify-center px-4"
          style={{ background: 'linear-gradient(135deg, #EBF5FB 0%, #FEF9EE 100%)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-lg overflow-hidden text-center">
            <div className="bg-gradient-to-r from-brand-deep to-brand-bright px-6 py-6">
              <div className="text-4xl mb-2">🔒</div>
              <h1 className="text-xl font-bold text-white">{trip.name}</h1>
              {trip.destination && <p className="text-sm text-white/80 mt-1">📍 {trip.destination}</p>}
            </div>
            <div className="p-6 space-y-3">
              <p className="text-base font-semibold text-brand-deep">Trip is no longer accepting new members</p>
              <p className="text-sm text-muted-foreground">The group has already locked their travel dates.</p>
              <a href="/dashboard"
                className="mt-2 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #EA580C, #D97706)' }}>
                Go to My Trips
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Auto-join — get display name from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const displayName = profile?.display_name ?? 'Traveller';

    // Insert member — handle two failure modes:
    // 1. UNIQUE(trip_id, user_id) violation: user already joined (race condition / double-click)
    //    → re-query to find their existing row
    // 2. UNIQUE(trip_id, display_name) violation: another member has the same name
    //    → retry with a timestamp suffix
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({ trip_id: id, user_id: user.id, display_name: displayName, role: 'member', status: 'joined' })
      .select('id, role, display_name')
      .single();

    if (memberError) {
      // Check if user is already a member (race condition / duplicate user_id insert)
      const { data: existing } = await supabase
        .from('members')
        .select('id, role, display_name')
        .eq('trip_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        member = existing;
      } else {
        // Display name conflict — retry with unique suffix
        const { data: retried } = await supabase
          .from('members')
          .insert({ trip_id: id, user_id: user.id, display_name: `${displayName}_${Date.now().toString().slice(-4)}`, role: 'member', status: 'joined' })
          .select('id, role, display_name')
          .single();
        if (retried) member = retried;
      }
    } else {
      member = newMember;
    }
  }

  if (!member) notFound();

  // Locked trip → send identified members to plan page
  if (trip.locked_dates_start) {
    redirect(`/trip/${id}/plan`);
  }

  const [membersResult, availabilityResult, recResult, votesResult, inviteResult] =
    await Promise.all([
      supabase.from('members').select('*').eq('trip_id', id).order('joined_at'),
      supabase.from('availability').select('*').eq('trip_id', id),
      supabase.from('ai_recommendations').select('*').eq('trip_id', id)
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('votes').select('*').eq('trip_id', id),
      supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('trip_id', id),
    ]);

  return (
    <TripDashboard
      trip={trip}
      currentMemberId={member.id}
      currentUserRole={member.role as 'organizer' | 'member'}
      initialMembers={membersResult.data || []}
      initialAvailability={availabilityResult.data || []}
      initialRecommendation={recResult.data?.[0] || null}
      initialVotes={votesResult.data || []}
      initialInviteCount={inviteResult.count ?? 0}
    />
  );
}
