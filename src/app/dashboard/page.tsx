import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatDateRange } from '@/lib/trip-utils';
import { TripTangleLogo } from '@/components/ui/logo';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Trips — TripTangle' };

// ── Brand icons ───────────────────────────────────────────────────
function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" fill="#FF0000"/>
      <path d="M9.75 15.02l5.75-3.02-5.75-3.02v6.04z" fill="#fff"/>
    </svg>
  );
}
function TripAdvisorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#34E0A1"/>
      <circle cx="8.5" cy="11" r="2.5" fill="white"/>
      <circle cx="15.5" cy="11" r="2.5" fill="white"/>
      <circle cx="8.5" cy="11" r="1" fill="#00AA6C"/>
      <circle cx="15.5" cy="11" r="1" fill="#00AA6C"/>
      <path d="M9.5 15c.5 1 4.5 1 5 0" stroke="#00AA6C" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Compass watermark ─────────────────────────────────────────────
function CompassRose({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="97" stroke="currentColor" strokeWidth="0.7" opacity="0.5"/>
      <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
      <circle cx="100" cy="100" r="58" stroke="currentColor" strokeWidth="0.5" opacity="0.25"/>
      <circle cx="100" cy="100" r="38" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
      {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((angle) => {
        const isCardinal = angle % 90 === 0;
        const isOrdinal = angle % 45 === 0;
        return (
          <line key={angle} x1="100" y1={isCardinal ? "3" : isOrdinal ? "12" : "22"}
            x2="100" y2="97" stroke="currentColor"
            strokeWidth={isCardinal ? "1.2" : isOrdinal ? "0.7" : "0.4"}
            opacity={isCardinal ? 0.45 : isOrdinal ? 0.3 : 0.15}
            transform={`rotate(${angle} 100 100)`}/>
        );
      })}
      <path d="M100 22 L105 95 L178 100 L105 105 L100 178 L95 105 L22 100 L95 95Z" fill="currentColor" opacity="0.12"/>
      <text x="100" y="11" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.55" fontWeight="bold" fontFamily="Georgia, serif">N</text>
      <text x="100" y="196" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">S</text>
      <text x="192" y="104" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">E</text>
      <text x="8" y="104" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">W</text>
      <circle cx="100" cy="100" r="3.5" fill="currentColor" opacity="0.35"/>
    </svg>
  );
}

// ── URL helpers ───────────────────────────────────────────────────
function youtubeUrl(d: string) { return `https://www.youtube.com/results?search_query=${encodeURIComponent(d + ' travel vlog guide')}`; }
function tripadvisorUrl(d: string) { return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(d)}`; }
function googleUrl(d: string) { return `https://www.google.com/search?q=${encodeURIComponent(d + ' things to do travel tips')}`; }

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('display_name').eq('id', user.id).single();

  const { data: memberships } = await supabase
    .from('members').select('trip_id, role, display_name').eq('user_id', user.id);

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

  const memberCounts = tripIds.length > 0
    ? (await supabase.from('members').select('trip_id').in('trip_id', tripIds)).data ?? []
    : [];
  const countMap = new Map<string, number>();
  memberCounts.forEach((r) => { countMap.set(r.trip_id, (countMap.get(r.trip_id) ?? 0) + 1); });

  const displayName = profile?.display_name ?? 'Traveller';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="min-h-screen relative overflow-x-hidden">

      {/* ── Background: blurred travel photo + warm overlay + compasses ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://source.unsplash.com/1920x1080/?europe,canal,city,travel,street"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'blur(2px) brightness(0.75) saturate(0.85)' }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(242, 232, 215, 0.68)' }}/>
      </div>
      {/* Compass watermarks */}
      <div className="fixed top-16 right-8 text-[#7a6045] pointer-events-none select-none opacity-40">
        <CompassRose size={220}/>
      </div>
      <div className="fixed bottom-8 left-4 text-[#7a6045] pointer-events-none select-none opacity-35">
        <CompassRose size={170}/>
      </div>

      {/* ── Sticky nav ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/30 bg-white/70 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <TripTangleLogo size={30} />
            <span className="font-black text-[#3d2b1f] tracking-tight text-lg" style={{ fontFamily: 'Georgia, serif' }}>
              TripTangle
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block" style={{ color: '#5a4a38' }}>
              Hey, {displayName} 👋
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 pb-20">

        {/* ── Welcome heading ───────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#c4694a' }}>Welcome back,</p>
            <h1 className="text-3xl font-black tracking-tight leading-tight" style={{ color: '#2d1f14' }}>
              {firstName}&apos;s Trips ✈️
            </h1>
            <p className="text-sm mt-1" style={{ color: '#7a6350' }}>
              {trips.length === 0
                ? 'Your next adventure starts here.'
                : `${trips.length} trip${trips.length !== 1 ? 's' : ''} · tap a card to dive in`}
            </p>
          </div>
          <Link
            href="/create"
            className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #d4622a 0%, #e07b3a 100%)' }}
          >
            <span className="text-base leading-none">+</span> New Trip
          </Link>
        </div>

        {/* ── Trip cards ────────────────────────────────────────── */}
        {trips.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-5">
            {trips.map((trip) => {
              const membership = membershipMap.get(trip.id);
              const isLocked = !!trip.locked_dates_start;
              const isOrganizer = membership?.role === 'organizer';
              const memberCount = countMap.get(trip.id) ?? 1;
              const href = isLocked ? `/trip/${trip.id}/plan` : `/trip/${trip.id}`;
              const destKeyword = trip.destination
                ? encodeURIComponent(trip.destination.split(',')[0])
                : 'travel,city';
              const photoUrl = `https://source.unsplash.com/800x400/?${destKeyword},city,travel`;
              const shortDest = trip.destination?.split(',')[0] ?? '';

              return (
                <div
                  key={trip.id}
                  className="rounded-3xl bg-white shadow-xl overflow-hidden"
                  style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
                >
                  {/* ── Photo section (clickable) ─────────────── */}
                  <Link href={href} className="block relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={trip.destination ?? trip.name}
                      className="w-full object-cover"
                      style={{ height: '210px' }}
                    />
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

                    {/* Destination label — top left */}
                    {trip.destination && (
                      <div className="absolute top-3.5 left-4">
                        <span className="text-white font-semibold text-base drop-shadow-md">
                          {trip.destination}
                        </span>
                      </div>
                    )}

                    {/* Status badges — top right */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      {isOrganizer && (
                        <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#3d2b1f] uppercase tracking-wide shadow">
                          Organizer
                        </span>
                      )}
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow ${
                        isLocked
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-400 text-white'
                      }`}>
                        {isLocked ? '🔒 Locked' : '⏳ Planning'}
                      </span>
                    </div>

                    {/* Trip name + destination — bottom of photo */}
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8">
                      <h3 className="font-black text-white text-xl leading-tight drop-shadow-sm">
                        {trip.name}
                      </h3>
                      {trip.destination && (
                        <p className="text-white/80 text-sm mt-0.5 flex items-center gap-1">
                          <span>📍</span> {trip.destination}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* ── Card body ─────────────────────────────── */}
                  <div className="px-5 pt-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm" style={{ color: '#5a4a38' }}>
                        <span>📅</span>
                        <span>{formatDateRange(
                          isLocked ? trip.locked_dates_start! : trip.date_range_start,
                          isLocked ? trip.locked_dates_end! : trip.date_range_end
                        )}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm" style={{ color: '#5a4a38' }}>
                        <span>👥</span>
                        <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex justify-end mt-2 mb-1">
                      <Link
                        href={href}
                        className="text-sm font-bold hover:underline"
                        style={{ color: '#d4622a' }}
                      >
                        {isLocked ? 'View Plan →' : 'Open Trip →'}
                      </Link>
                    </div>
                  </div>

                  {/* ── Explore strip ─────────────────────────── */}
                  {trip.destination && (
                    <div className="px-5 pt-3 pb-4 border-t border-gray-100">
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#9a8070' }}>
                        Explore {shortDest}
                      </p>
                      <div className="flex items-center gap-2">
                        <a
                          href={youtubeUrl(trip.destination)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-sm"
                        >
                          <YouTubeIcon className="h-3.5 w-3.5" /> Vlogs
                        </a>
                        <a
                          href={tripadvisorUrl(trip.destination)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
                        >
                          <TripAdvisorIcon className="h-3.5 w-3.5" /> Reviews
                        </a>
                        <a
                          href={googleUrl(trip.destination)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
                        >
                          <GoogleIcon className="h-3.5 w-3.5" /> Tips
                        </a>
                      </div>
                    </div>
                  )}
                </div>
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
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg bg-white/80">
        🗺️
      </div>
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#3d2b1f' }}>No trips yet</h2>
        <p className="text-sm mt-1 max-w-xs" style={{ color: '#7a6350' }}>
          Create your first trip and invite your group — AI will find the perfect dates in minutes.
        </p>
      </div>
      <Link
        href="/create"
        className="mt-2 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #d4622a 0%, #e07b3a 100%)' }}
      >
        Plan your first trip 🌴
      </Link>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded-xl transition-colors font-medium"
        style={{ color: '#7a6350', background: 'rgba(255,255,255,0.6)' }}
      >
        Log out
      </button>
    </form>
  );
}
