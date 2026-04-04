'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #EBF5FB 0%, #FEF9EE 100%)' }}
    >
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🌴</div>
        <h1 className="text-3xl font-black text-brand-deep tracking-tight">TripTangle</h1>
        <p className="text-sm text-muted-foreground mt-1">Untangle your group trip</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
          <div className="px-8 py-8 space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-brand-deep">Welcome!</h2>
              <p className="text-sm text-muted-foreground">Sign in to plan your next group trip</p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600 text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/30 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-brand-bright" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our terms of service
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          No password needed — sign in with your Google account
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
