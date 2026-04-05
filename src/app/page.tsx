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

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16 sm:px-10"
        style={{ background: 'rgba(237, 228, 206, 0.9)' }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-bold mb-10"
            style={{
              fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#2d1f14',
            }}>
            From group chat chaos to confirmed trip.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Step 01 — Create your trip (Biplane) */}
            <div className="rounded-2xl p-5 border flex flex-col"
              style={{ background: 'rgba(255,252,244,0.95)', borderColor: '#c8b898', boxShadow: '0 2px 10px rgba(90,60,30,0.07)' }}>
              <div className="flex items-center justify-center h-36 mb-4">
                <svg viewBox="0 0 200 150" fill="none" className="w-full h-full" aria-hidden="true">
                  {/* Upper wing */}
                  <path d="M25 62 L168 48 L168 56 L25 70Z" fill="#d4b896" stroke="#7a5c3a" strokeWidth="1.8"/>
                  {/* Lower wing */}
                  <path d="M50 84 L152 74 L152 82 L50 92Z" fill="#d4b896" stroke="#7a5c3a" strokeWidth="1.8"/>
                  {/* Fuselage */}
                  <path d="M58 60 Q110 52 165 64 Q178 70 165 78 Q110 88 58 84 Q44 75 58 60Z" fill="#e8d5b5" stroke="#7a5c3a" strokeWidth="1.8"/>
                  {/* Nose cone */}
                  <path d="M165 64 L185 70 L165 78Z" fill="#d4b896" stroke="#7a5c3a" strokeWidth="1.4"/>
                  {/* Propeller hub */}
                  <circle cx="186" cy="70" r="3" fill="#7a5c3a"/>
                  {/* Propeller blades */}
                  <path d="M186 57 Q189 63 186 70 Q183 63 186 57Z" fill="#7a5c3a" opacity="0.7"/>
                  <path d="M186 83 Q183 77 186 70 Q189 77 186 83Z" fill="#7a5c3a" opacity="0.7"/>
                  {/* Tail fin */}
                  <path d="M58 68 L32 55 L38 68 L32 82 L58 76Z" fill="#d4b896" stroke="#7a5c3a" strokeWidth="1.4"/>
                  {/* Struts */}
                  <line x1="88" y1="57" x2="88" y2="80" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <line x1="132" y1="53" x2="132" y2="76" stroke="#7a5c3a" strokeWidth="1.4"/>
                  {/* Cross wires */}
                  <line x1="88" y1="57" x2="132" y2="76" stroke="#7a5c3a" strokeWidth="0.7" opacity="0.45"/>
                  <line x1="132" y1="53" x2="88" y2="80" stroke="#7a5c3a" strokeWidth="0.7" opacity="0.45"/>
                  {/* Cockpit window */}
                  <ellipse cx="138" cy="68" rx="10" ry="7" fill="#c8dce8" stroke="#7a5c3a" strokeWidth="1.2" opacity="0.8"/>
                  {/* Landing gear */}
                  <line x1="90" y1="84" x2="90" y2="100" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <line x1="125" y1="82" x2="125" y2="98" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <line x1="75" y1="100" x2="105" y2="100" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <line x1="110" y1="98" x2="140" y2="98" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <circle cx="82" cy="102" r="5" fill="none" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <circle cx="98" cy="102" r="5" fill="none" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <circle cx="116" cy="100" r="5" fill="none" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <circle cx="132" cy="100" r="5" fill="none" stroke="#7a5c3a" strokeWidth="1.4"/>
                </svg>
              </div>
              <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#a07048' }}>STEP 01</p>
              <h3 className="font-bold text-base mb-1.5" style={{ color: '#2d1f14', fontFamily: 'Georgia,serif' }}>Create your trip</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#7a6050' }}>Name it, pick a date range, get a shareable link in seconds.</p>
            </div>

            {/* Step 02 — Everyone marks dates (Calendar + Avatars) */}
            <div className="rounded-2xl p-5 border flex flex-col"
              style={{ background: 'rgba(255,252,244,0.95)', borderColor: '#c8b898', boxShadow: '0 2px 10px rgba(90,60,30,0.07)' }}>
              <div className="flex items-center justify-center h-36 mb-4">
                <svg viewBox="0 0 200 150" fill="none" className="w-full h-full" aria-hidden="true">
                  {/* Calendar body */}
                  <rect x="52" y="28" width="96" height="94" rx="6" fill="#f5ede0" stroke="#7a5c3a" strokeWidth="1.8"/>
                  {/* Calendar header */}
                  <rect x="52" y="28" width="96" height="20" rx="6" fill="#c8a87a" stroke="#7a5c3a" strokeWidth="1.8"/>
                  <rect x="52" y="40" width="96" height="8" fill="#c8a87a"/>
                  {/* Header rings */}
                  <line x1="78" y1="22" x2="78" y2="34" stroke="#7a5c3a" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="122" y1="22" x2="122" y2="34" stroke="#7a5c3a" strokeWidth="2.5" strokeLinecap="round"/>
                  {/* Day labels */}
                  {['M','T','W','T','F'].map((d, i) => (
                    <text key={i} x={63 + i * 17} y="60" textAnchor="middle" fontSize="7" fill="#7a5c3a" fontWeight="bold" fontFamily="Georgia,serif">{d}</text>
                  ))}
                  {/* Row 1: free, free, busy, maybe, free */}
                  <rect x="55" y="64" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  <rect x="72" y="64" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  <rect x="89" y="64" width="13" height="10" rx="2" fill="#e07070" opacity="0.85"/>
                  <rect x="106" y="64" width="13" height="10" rx="2" fill="#f0c060" opacity="0.85"/>
                  <rect x="123" y="64" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  {/* Row 2 */}
                  <rect x="55" y="78" width="13" height="10" rx="2" fill="#f0c060" opacity="0.85"/>
                  <rect x="72" y="78" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  <rect x="89" y="78" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  <rect x="106" y="78" width="13" height="10" rx="2" fill="#e07070" opacity="0.85"/>
                  <rect x="123" y="78" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  {/* Row 3 */}
                  <rect x="55" y="92" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  <rect x="72" y="92" width="13" height="10" rx="2" fill="#e07070" opacity="0.85"/>
                  <rect x="89" y="92" width="13" height="10" rx="2" fill="#f0c060" opacity="0.85"/>
                  <rect x="106" y="92" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  <rect x="123" y="92" width="13" height="10" rx="2" fill="#6ab87a" opacity="0.85"/>
                  {/* Labels */}
                  <text x="63" y="70" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">free</text>
                  <text x="97" y="70" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">busy</text>
                  <text x="114" y="70" textAnchor="middle" fontSize="5" fill="#7a5020" fontWeight="bold">maybe</text>
                  {/* Avatar circles around calendar */}
                  <circle cx="30" cy="50" r="16" fill="#c4622a" stroke="#f5ede0" strokeWidth="2"/>
                  <circle cx="30" cy="47" r="6" fill="#e8c4a0"/>
                  <path d="M18 66 Q30 58 42 66" fill="#c4622a"/>
                  <circle cx="170" cy="45" r="16" fill="#3a7a5a" stroke="#f5ede0" strokeWidth="2"/>
                  <circle cx="170" cy="42" r="6" fill="#e8c4a0"/>
                  <path d="M158 61 Q170 53 182 61" fill="#3a7a5a"/>
                  <circle cx="28" cy="110" r="14" fill="#3a5a7a" stroke="#f5ede0" strokeWidth="2"/>
                  <circle cx="28" cy="107" r="5" fill="#e8c4a0"/>
                  <path d="M17 123 Q28 115 39 123" fill="#3a5a7a"/>
                  <circle cx="172" cy="108" r="14" fill="#7a5c3a" stroke="#f5ede0" strokeWidth="2"/>
                  <circle cx="172" cy="105" r="5" fill="#e8c4a0"/>
                  <path d="M161 121 Q172 113 183 121" fill="#7a5c3a"/>
                </svg>
              </div>
              <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#a07048' }}>STEP 02</p>
              <h3 className="font-bold text-base mb-1.5" style={{ color: '#2d1f14', fontFamily: 'Georgia,serif' }}>Everyone marks dates</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#7a6050' }}>Friends easily mark their availability (free, busy, maybe) — no account needed.</p>
            </div>

            {/* Step 03 — AI finds the sweet spot (Globe + Robot) */}
            <div className="rounded-2xl p-5 border flex flex-col"
              style={{ background: 'rgba(255,252,244,0.95)', borderColor: '#c8b898', boxShadow: '0 2px 10px rgba(90,60,30,0.07)' }}>
              <div className="flex items-center justify-center h-36 mb-4">
                <svg viewBox="0 0 200 150" fill="none" className="w-full h-full" aria-hidden="true">
                  {/* Globe stand */}
                  <line x1="100" y1="118" x2="100" y2="132" stroke="#7a5c3a" strokeWidth="2.5" strokeLinecap="round"/>
                  <ellipse cx="100" cy="133" rx="22" ry="5" fill="#c8a87a" stroke="#7a5c3a" strokeWidth="1.4"/>
                  <line x1="78" y1="133" x2="122" y2="133" stroke="#7a5c3a" strokeWidth="2"/>
                  {/* Globe body */}
                  <circle cx="100" cy="72" r="46" fill="#d8eaf5" stroke="#7a5c3a" strokeWidth="1.8"/>
                  {/* Meridians */}
                  <ellipse cx="100" cy="72" rx="20" ry="46" fill="none" stroke="#7a5c3a" strokeWidth="1" opacity="0.5"/>
                  <ellipse cx="100" cy="72" rx="38" ry="46" fill="none" stroke="#7a5c3a" strokeWidth="1" opacity="0.3"/>
                  {/* Parallels */}
                  <ellipse cx="100" cy="55" rx="43" ry="8" fill="none" stroke="#7a5c3a" strokeWidth="1" opacity="0.4"/>
                  <ellipse cx="100" cy="72" rx="46" ry="10" fill="none" stroke="#7a5c3a" strokeWidth="1" opacity="0.4"/>
                  <ellipse cx="100" cy="89" rx="43" ry="8" fill="none" stroke="#7a5c3a" strokeWidth="1" opacity="0.4"/>
                  {/* Continents (simplified) */}
                  <path d="M72 55 Q80 48 90 52 Q96 58 88 65 Q80 68 72 62Z" fill="#b8c87a" opacity="0.7"/>
                  <path d="M108 50 Q118 44 126 50 Q132 58 124 66 Q114 70 108 62Z" fill="#b8c87a" opacity="0.7"/>
                  <path d="M78 72 Q88 68 96 74 Q100 82 92 88 Q82 90 76 82Z" fill="#b8c87a" opacity="0.7"/>
                  {/* Robot face overlay (top-right of globe) */}
                  <rect x="118" y="26" width="36" height="30" rx="5" fill="#e8d5b5" stroke="#7a5c3a" strokeWidth="1.5"/>
                  <rect x="122" y="20" width="8" height="8" rx="2" fill="#c8a87a" stroke="#7a5c3a" strokeWidth="1.2"/>
                  <rect x="142" y="20" width="8" height="8" rx="2" fill="#c8a87a" stroke="#7a5c3a" strokeWidth="1.2"/>
                  {/* Robot eyes */}
                  <rect x="123" y="32" width="10" height="7" rx="2" fill="#4a8ac8" stroke="#7a5c3a" strokeWidth="1"/>
                  <rect x="139" y="32" width="10" height="7" rx="2" fill="#4a8ac8" stroke="#7a5c3a" strokeWidth="1"/>
                  <circle cx="128" cy="35" r="2" fill="white"/>
                  <circle cx="144" cy="35" r="2" fill="white"/>
                  {/* Robot mouth */}
                  <path d="M124 44 Q136 50 148 44" stroke="#7a5c3a" strokeWidth="1.5" strokeLinecap="round"/>
                  {/* Gear icon */}
                  <circle cx="136" cy="58" r="5" fill="none" stroke="#c8a87a" strokeWidth="1.5"/>
                  <circle cx="136" cy="58" r="2" fill="#c8a87a"/>
                </svg>
              </div>
              <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#a07048' }}>STEP 03</p>
              <h3 className="font-bold text-base mb-1.5" style={{ color: '#2d1f14', fontFamily: 'Georgia,serif' }}>AI finds the sweet spot</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#7a6050' }}>Analyzes all responses and surfaces the best travel windows.</p>
            </div>

            {/* Step 04 — Group votes, trip locked (Passport + Lock) */}
            <div className="rounded-2xl p-5 border flex flex-col"
              style={{ background: 'rgba(255,252,244,0.95)', borderColor: '#c8b898', boxShadow: '0 2px 10px rgba(90,60,30,0.07)' }}>
              <div className="flex items-center justify-center h-36 mb-4">
                <svg viewBox="0 0 200 150" fill="none" className="w-full h-full" aria-hidden="true">
                  {/* Passport book */}
                  <rect x="38" y="20" width="88" height="110" rx="6" fill="#1a4a7a" stroke="#0e2d52" strokeWidth="1.8"/>
                  <rect x="44" y="26" width="76" height="98" rx="4" fill="#1e5590"/>
                  {/* Passport spine */}
                  <rect x="38" y="20" width="10" height="110" rx="3" fill="#0e2d52"/>
                  {/* Globe emblem on passport */}
                  <circle cx="82" cy="68" r="22" fill="none" stroke="#c8b050" strokeWidth="1.5" opacity="0.8"/>
                  <ellipse cx="82" cy="68" rx="10" ry="22" fill="none" stroke="#c8b050" strokeWidth="1" opacity="0.6"/>
                  <ellipse cx="82" cy="68" rx="22" ry="8" fill="none" stroke="#c8b050" strokeWidth="1" opacity="0.6"/>
                  <circle cx="82" cy="68" r="5" fill="#c8b050" opacity="0.7"/>
                  {/* Passport text lines */}
                  <rect x="52" y="98" width="60" height="4" rx="2" fill="#c8b050" opacity="0.5"/>
                  <rect x="52" y="106" width="46" height="4" rx="2" fill="#c8b050" opacity="0.35"/>
                  {/* Stars decoration */}
                  <text x="57" y="44" fontSize="8" fill="#c8b050" opacity="0.7">★ ★ ★</text>
                  {/* Padlock */}
                  <rect x="112" y="62" width="52" height="44" rx="8" fill="#c8a020" stroke="#7a6010" strokeWidth="2"/>
                  {/* Lock shackle */}
                  <path d="M124 62 L124 48 Q138 36 152 48 L152 62" fill="none" stroke="#7a6010" strokeWidth="4.5" strokeLinecap="round"/>
                  {/* Keyhole */}
                  <circle cx="138" cy="82" r="8" fill="#7a6010" opacity="0.6"/>
                  <rect x="134" y="86" width="8" height="10" rx="2" fill="#7a6010" opacity="0.6"/>
                  {/* Shine on lock */}
                  <path d="M118 68 Q122 66 126 68" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                </svg>
              </div>
              <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#a07048' }}>STEP 04</p>
              <h3 className="font-bold text-base mb-1.5" style={{ color: '#2d1f14', fontFamily: 'Georgia,serif' }}>Group votes, trip locked</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#7a6050' }}>Highest votes win, dates locked. Time to pack your bags.</p>
            </div>

          </div>
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
