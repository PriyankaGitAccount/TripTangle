import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatDateRange } from '@/lib/trip-utils';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Trips — TripTangle' };

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  // Fetch all trips the user is a member of
  const { data: memberships } = await supabase
    .from('members')
    .select('trip_id, role, display_name')
    .eq('user_id', user.id);

  const tripIds = memberships?.map((m) => m.trip_id) ?? [];

  const trips = tripIds.length > 0
    ? (await supabase
        .from('trips')
        .select('id, name, destination, date_range_start, date_range_end, locked_dates_start, locked_dates_end, created_at')
        .in('id', tripIds)
        .order('created_at', { ascending: false })
      ).data ?? []
    : [];

  const membershipMap = new Map(memberships?.map((m) => [m.trip_id, m]) ?? []);

  // Member counts per trip
  const memberCounts = tripIds.length > 0
    ? (await supabase
        .from('members')
        .select('trip_id')
        .in('trip_id', tripIds)
      ).data ?? []
    : [];

  const countMap = new Map<string, number>();
  memberCounts.forEach((r) => {
    countMap.set(r.trip_id, (countMap.get(r.trip_id) ?? 0) + 1);
  });

  const displayName = profile?.display_name ?? 'Traveller';

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #EBF5FB 0%, #FEF9EE 100%)' }}>
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🌴</span>
            <span className="font-black text-brand-deep tracking-tight">TripTangle</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">Hey, {displayName} 👋</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-brand-deep">My Trips</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {trips.length === 0 ? 'No trips yet — create your first one!' : `${trips.length} trip${trips.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #EA580C 0%, #D97706 100%)' }}
          >
            <span className="text-base">+</span> New Trip
          </Link>
        </div>

        {trips.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip) => {
              const membership = membershipMap.get(trip.id);
              const isLocked = !!trip.locked_dates_start;
              const isOrganizer = membership?.role === 'organizer';
              const memberCount = countMap.get(trip.id) ?? 1;
              const href = isLocked ? `/trip/${trip.id}/plan` : `/trip/${trip.id}`;

              return (
                <Link key={trip.id} href={href}>
                  <div className="group rounded-2xl bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden border border-border/30 cursor-pointer">
                    {/* Colour band */}
                    <div
                      className="h-2"
                      style={{
                        background: isLocked
                          ? 'linear-gradient(90deg, #27AE60, #2980B9)'
                          : 'linear-gradient(90deg, #EA580C, #D97706)',
                      }}
                    />
                    <div className="p-4 space-y-3">
                      {/* Title + badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-brand-deep truncate group-hover:text-brand-bright transition-colors">
                            {trip.name}
                          </h3>
                          {trip.destination && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              📍 {trip.destination}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isOrganizer && (
                            <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand-deep uppercase tracking-wide">
                              Organizer
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isLocked
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {isLocked ? '✅ Locked' : '⏳ Planning'}
                          </span>
                        </div>
                      </div>

                      {/* Date range */}
                      <p className="text-xs text-muted-foreground">
                        📅 {formatDateRange(
                          isLocked ? trip.locked_dates_start! : trip.date_range_start,
                          isLocked ? trip.locked_dates_end! : trip.date_range_end
                        )}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">
                          👥 {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs font-semibold text-brand-bright group-hover:underline">
                          {isLocked ? 'View Plan →' : 'Open Trip →'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="text-6xl">🗺️</div>
      <h2 className="text-xl font-bold text-brand-deep">No trips yet</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Create your first trip and invite your group — AI will find the perfect dates in minutes.
      </p>
      <Link
        href="/create"
        className="mt-2 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md"
        style={{ background: 'linear-gradient(135deg, #EA580C 0%, #D97706 100%)' }}
      >
        Create your first trip 🌴
      </Link>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="text-xs text-muted-foreground hover:text-brand-deep transition-colors px-2 py-1 rounded-lg hover:bg-muted/40"
      >
        Log out
      </button>
    </form>
  );
}
