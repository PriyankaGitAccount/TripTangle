import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

      // Check if profile already exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existing) {
        // New user — create profile using Google name + email
        const googleName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Traveller';

        await supabase.from('user_profiles').insert({
          id: user.id,
          email: user.email!,
          display_name: googleName,
        });
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'Sign-in failed. Please try again.');
  return NextResponse.redirect(loginUrl);
}
