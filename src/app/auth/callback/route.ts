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
      // Check if this user has a profile (returning user vs new user)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', data.user.id)
        .single();

      if (!profile?.display_name) {
        // New user — collect their name first
        const nameUrl = new URL('/login', origin);
        nameUrl.searchParams.set('step', 'name');
        nameUrl.searchParams.set('next', next);
        return NextResponse.redirect(nameUrl);
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Auth failed
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'Link expired or already used. Please try again.');
  return NextResponse.redirect(loginUrl);
}
