import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { TripTangleLogo } from '@/components/ui/logo';

// ── Compass rose SVG ─────────────────────────────────────────────
function CompassRose({ size = 300 }: { size?: number }) {
  const rings = [97, 78, 58, 38];
  const angles = [0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      {rings.map((r) => (
        <circle key={r} cx="100" cy="100" r={r} stroke="currentColor"
          strokeWidth={r === 97 ? 0.8 : 0.5} opacity={r === 97 ? 0.5 : 0.3}/>
      ))}
      {angles.map((angle) => {
        const isCard = angle % 90 === 0;
        const isOrd = angle % 45 === 0;
        return (
          <line key={angle} x1="100" y1={isCard ? '3' : isOrd ? '12' : '22'}
            x2="100" y2="97" stroke="currentColor"
            strokeWidth={isCard ? 1.2 : isOrd ? 0.7 : 0.4}
            opacity={isCard ? 0.5 : isOrd ? 0.32 : 0.16}
            transform={`rotate(${angle} 100 100)`}/>
        );
      })}
      <path d="M100 20 L106 95 L180 100 L106 105 L100 180 L94 105 L20 100 L94 95Z"
        fill="currentColor" opacity="0.14"/>
      <text x="100" y="10" textAnchor="middle" fontSize="11" fill="currentColor"
        opacity="0.55" fontWeight="bold" fontFamily="Georgia,serif">N</text>
      <text x="100" y="196" textAnchor="middle" fontSize="9" fill="currentColor"
        opacity="0.4" fontFamily="Georgia,serif">S</text>
      <text x="192" y="104" textAnchor="middle" fontSize="9" fill="currentColor"
        opacity="0.4" fontFamily="Georgia,serif">E</text>
      <text x="8" y="104" textAnchor="middle" fontSize="9" fill="currentColor"
        opacity="0.4" fontFamily="Georgia,serif">W</text>
      <circle cx="100" cy="100" r="4" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

export default async function HomePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: '#ede4ce', color: '#2d1f14' }}>

      {/* ── Parchment map-line texture overlay ───────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Subtle horizontal map lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mapgrid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#5a3a1a" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapgrid)"/>
        </svg>

        {/* Large compass — left center */}
        <div className="absolute left-[-60px] top-[15%] text-[#6b5040]">
          <CompassRose size={340}/>
        </div>
        {/* Large compass — top right */}
        <div className="absolute right-[-40px] top-[-20px] text-[#6b5040]">
          <CompassRose size={280}/>
        </div>
        {/* Small compass — bottom right */}
        <div className="absolute right-[5%] bottom-[12%] text-[#6b5040] opacity-50">
          <CompassRose size={160}/>
        </div>

        {/* Sketch city illustration — right side of hero */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://source.unsplash.com/1200x900/?venice,canal,europe,architecture,historical"
          alt=""
          className="absolute right-0 top-0 h-[560px] w-[55%] object-cover object-left"
          style={{
            filter: 'grayscale(1) contrast(0.22) brightness(3.2) sepia(0.25)',
            opacity: 0.55,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,0.7) 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.7) 40%, transparent 100%)',
          }}
        />
      </div>

      {/* ── Star badge (top-left corner) ─────────────────────────── */}
      <div className="fixed top-0 left-0 z-30 w-12 h-12 flex items-center justify-center"
        style={{ background: '#6b5040' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      {/* Nav is intentionally minimal — star badge is fixed top-left; no logo or CTA here */}
      <nav className="relative z-20 h-14 sm:h-16" aria-hidden="true"/>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-4 pb-20">

        {/* Brand logo */}
        <div className="mb-4">
          <TripTangleLogo size={90}/>
        </div>

        {/* Main heading */}
        <h1 className="font-black tracking-tight leading-tight mb-3"
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#2d1f14',
          }}>
          TripTangle
        </h1>

        {/* Sub-heading */}
        <p className="font-bold mb-4 max-w-2xl"
          style={{
            fontSize: 'clamp(1.5rem, 3.5vw, 2.4rem)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#2d1f14',
            lineHeight: 1.25,
          }}>
          Plan your next trip, together.
        </p>

        {/* Body copy */}
        <p className="mb-7 max-w-lg text-base leading-relaxed" style={{ color: '#5a4030' }}>
          Stop losing your group trip in a 400-message chat.
          <br/>
          Share a link, pick dates, and let AI find the{' '}
          <strong style={{ color: '#2d1f14' }}>perfect window.</strong>
        </p>

        {/* Feature bar */}
        <div className="mb-8 flex items-center gap-5 rounded-xl px-6 py-3 text-sm font-medium text-white"
          style={{ background: '#5a4030' }}>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            AI-powered
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Free
          </span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
          <Link href="/login">
            <button
              className="rounded-2xl px-12 py-5 text-xl font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#d4622a' }}>
              Create a trip — it&apos;s free
            </button>
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2.5">
            {[
              { initials: 'P', bg: '#c4622a' },
              { initials: 'A', bg: '#7a5c3a' },
              { initials: 'S', bg: '#4a7a5a' },
              { initials: 'J', bg: '#3a5a7a' },
            ].map(({ initials, bg }) => (
              <div key={initials}
                className="h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                style={{ borderColor: '#ede4ce', background: bg }}>
                {initials}
              </div>
            ))}
          </div>
          <p className="text-sm font-medium" style={{ color: '#5a4030' }}>
            <strong style={{ color: '#2d1f14' }}>4,310</strong> groups planned this week
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="relative z-10 px-8 py-6 text-center text-xs border-t"
        style={{ color: '#a08060', borderColor: '#c8b898' }}>
        TripTangle · Untangle your group trip
      </footer>
    </div>
  );
}
