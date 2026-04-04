import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreateTripForm } from '@/components/trip/create-form';
import Link from 'next/link';

export const metadata = {
  title: 'Create a Trip — TripTangle',
};

export default async function CreatePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/create');

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #EBF5FB 0%, #FEF9EE 100%)' }}>
      <header className="sticky top-0 z-20 border-b border-border/40 bg-white/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-brand-bright transition-colors">
            ← My Trips
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-brand-deep">Create a Trip</h1>
            <p className="mt-2 text-muted-foreground">Set up your trip and invite your group.</p>
          </div>
          <div className="rounded-2xl bg-card shadow-md p-6">
            <CreateTripForm />
          </div>
        </div>
      </div>
    </div>
  );
}
