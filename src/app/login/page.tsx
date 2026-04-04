'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [step, setStep] = useState<'email' | 'otp' | 'name'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('otp');
      setResendCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'email',
      });
      if (error) throw error;

      // Check if profile exists
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', data.user!.id)
        .single();

      if (profile?.display_name) {
        // Returning user — go straight to destination
        router.push(redirect);
        router.refresh();
      } else {
        // New user — collect name
        setStep('name');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP — please try again');
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
      if (!user) throw new Error('Session lost — please log in again');

      const { error } = await supabase.from('user_profiles').upsert({
        id: user.id,
        email: user.email!,
        display_name: displayName.trim(),
      });
      if (error) throw error;

      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setResendCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #EBF5FB 0%, #FEF9EE 100%)' }}>

      {/* Logo / brand */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🌴</div>
        <h1 className="text-3xl font-black text-brand-deep tracking-tight">TripTangle</h1>
        <p className="text-sm text-muted-foreground mt-1">Untangle your group trip</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white shadow-lg overflow-hidden">

          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center pt-5">
            {(['email', 'otp', 'name'] as const).map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all ${
                s === step ? 'w-6 bg-brand-bright' :
                i < ['email','otp','name'].indexOf(step) ? 'w-3 bg-brand-bright/40' :
                'w-3 bg-muted'
              }`} />
            ))}
          </div>

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="p-7 space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-brand-deep">Welcome!</h2>
                <p className="text-sm text-muted-foreground">Enter your email to get started</p>
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
                {loading ? 'Sending…' : 'Send OTP →'}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="p-7 space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-brand-deep">Check your inbox</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to<br />
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-bright"
                />
              </div>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #1A5276 0%, #2980B9 100%)' }}
              >
                {loading ? 'Verifying…' : 'Verify →'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || loading}
                  className="text-xs text-muted-foreground hover:text-brand-bright disabled:opacity-40 transition-colors"
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                </button>
                <span className="mx-2 text-muted-foreground/40">·</span>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  className="text-xs text-muted-foreground hover:text-brand-bright transition-colors"
                >
                  Change email
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Display name (new users only) ── */}
          {step === 'name' && (
            <form onSubmit={handleSaveName} className="p-7 space-y-5">
              <div className="text-center space-y-1">
                <div className="text-3xl mb-1">👋</div>
                <h2 className="text-xl font-bold text-brand-deep">What's your name?</h2>
                <p className="text-sm text-muted-foreground">This is how your group will see you</p>
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
                {loading ? 'Saving…' : 'Let\'s go 🌴'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          No password. No spam. Just a quick code.
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
