'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TripTangleLogo } from '@/components/ui/logo';

// ── Compass rose watermark ────────────────────────────────────────
function CompassRose({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="97" stroke="currentColor" strokeWidth="0.7" opacity="0.5"/>
      <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
      <circle cx="100" cy="100" r="58" stroke="currentColor" strokeWidth="0.5" opacity="0.25"/>
      <circle cx="100" cy="100" r="38" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
      {/* 16 compass lines */}
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
      {/* 8-point star */}
      <path d="M100 22 L105 95 L178 100 L105 105 L100 178 L95 105 L22 100 L95 95Z"
        fill="currentColor" opacity="0.12"/>
      {/* Cardinal labels */}
      <text x="100" y="11" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.55" fontWeight="bold" fontFamily="Georgia, serif">N</text>
      <text x="100" y="196" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">S</text>
      <text x="192" y="104" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">E</text>
      <text x="8" y="104" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">W</text>
      <circle cx="100" cy="100" r="3.5" fill="currentColor" opacity="0.35"/>
    </svg>
  );
}

// ── Login form ────────────────────────────────────────────────────
function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const errorParam = searchParams.get('error');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorParam || '');

  const supabase = createClient();

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-12 overflow-hidden">

      {/* ── Background photo + overlay ─────────────────────────── */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://source.unsplash.com/1920x1080/?europe,cobblestone,street,travel"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'blur(3px) brightness(0.72) saturate(0.9)' }}
        />
        {/* Warm cream overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(242, 232, 215, 0.62)' }}/>
      </div>

      {/* ── Compass watermarks ────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 text-[#7a6045] pointer-events-none select-none">
        <CompassRose size={180}/>
      </div>
      <div className="absolute bottom-4 right-4 text-[#7a6045] pointer-events-none select-none">
        <CompassRose size={150}/>
      </div>
      <div className="absolute top-6 left-6 text-[#7a6045] pointer-events-none select-none opacity-50">
        <CompassRose size={110}/>
      </div>
      <div className="absolute top-10 right-10 text-[#7a6045] pointer-events-none select-none opacity-30">
        <CompassRose size={90}/>
      </div>

      {/* ── Brand ─────────────────────────────────────────────────── */}
      <div className="mb-7 text-center">
        <TripTangleLogo size={100} />
        <h1
          className="text-4xl font-black mt-3 tracking-tight"
          style={{ color: '#3d2b1f', fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          TripTangle
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7a6350' }}>
          Untangle your group trip
        </p>
      </div>

      {/* ── Auth card ─────────────────────────────────────────────── */}
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* Progress dots */}
        <div className="flex justify-center items-center gap-2 pt-5 pb-0.5">
          <div className="h-2 w-8 rounded-full" style={{ background: '#E07B54' }}/>
          <div className="h-2 w-3 rounded-full" style={{ background: '#F0C4B0' }}/>
          <div className="h-2 w-3 rounded-full bg-gray-200"/>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Heading */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold" style={{ color: '#E07B54' }}>Welcome!</h2>
            <p className="text-sm" style={{ color: '#7a6350' }}>
              Sign in to plan your next group trip
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-2.5 text-xs text-center" style={{ background: '#fff0ed', color: '#c0392b' }}>
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: loading ? '#2c4a6e' : 'linear-gradient(135deg, #1e3a5f 0%, #2e6da4 100%)' }}
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"/>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Redirecting…' : 'Continue with Google →'}
          </button>

          <p className="text-center text-xs" style={{ color: '#a08060' }}>
            By continuing, you agree to our terms of service
          </p>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-5 text-center text-sm" style={{ color: '#5a4a38', textShadow: '0 1px 3px rgba(255,255,255,0.6)' }}>
        No password needed — sign in with your Google account.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm/>
    </Suspense>
  );
}
