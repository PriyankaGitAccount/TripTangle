'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep = searchParams.get('step') as 'email' | 'sent' | 'name' | null;
  const next = searchParams.get('next') || '/dashboard';
  const errorParam = searchParams.get('error');

  const [step, setStep] = useState<'email' | 'sent' | 'name'>(initialStep || 'email');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorParam || '');
  const [resendCountdown, setResendCountdown] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setStep('sent');
      setResendCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError('');
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setResendCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired — please log in again');

      const { error } = await supabase.from('user_profiles').upsert({
        id: user.id,
        email: user.email!,
        display_name: displayName.trim(),
      });
      if (error) throw error;

      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = { email: 0, sent: 1, name: 2 }[step];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #EBF5FB 0%, #FEF9EE 100%)' }}
    >
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🌴</div>
        <h1 className="text-3xl font-black text-brand-deep tracking-tight">TripTangle</h1>
        <p className="text-sm text-muted-foreground mt-1">Untangle your group trip</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white shadow-lg overflow-hidden">

          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center pt-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-6 bg-brand-bright' :
                i < stepIndex ? 'w-3 bg-brand-bright/40' : 'w-3 bg-muted'
              }`} />
            ))}
          </div>

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <form onSubmit={handleSendLink} className="p-7 space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-brand-deep">Welcome!</h2>
                <p className="text-sm text-muted-foreground">Enter your email to get a sign-in link</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright"
                />
              </div>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #1A5276 0%, #2980B9 100%)' }}
              >
                {loading ? 'Sending…' : 'Send sign-in link →'}
              </button>
            </form>
          )}

          {/* ── Step 2: Check inbox ── */}
          {step === 'sent' && (
            <div className="p-7 space-y-5 text-center">
              <div className="space-y-2">
                <div className="text-5xl">📬</div>
                <h2 className="text-xl font-bold text-brand-deep">Check your inbox</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a sign-in link to<br />
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  Click the link in the email to sign in.<br />
                  Check your spam folder if you don't see it.
                </p>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || loading}
                  className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-brand-bright disabled:opacity-40 hover:bg-brand-light transition-colors"
                >
                  {loading ? 'Sending…' : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); }}
                  className="text-xs text-muted-foreground hover:text-brand-bright transition-colors py-1"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Display name (new users only) ── */}
          {step === 'name' && (
            <form onSubmit={handleSaveName} className="p-7 space-y-5">
              <div className="text-center space-y-1">
                <div className="text-3xl mb-1">👋</div>
                <h2 className="text-xl font-bold text-brand-deep">One last thing</h2>
                <p className="text-sm text-muted-foreground">What should your group call you?</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Your name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Priya"
                  maxLength={50}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright"
                />
              </div>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !displayName.trim()}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #27AE60 0%, #2980B9 100%)' }}
              >
                {loading ? 'Saving…' : "Let's go 🌴"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          No password needed. Just a link in your email.
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
