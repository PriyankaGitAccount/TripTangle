import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/constants';

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20">
        {/* Background gradient */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(135deg, #EBF5FB 0%, #D4E6F1 30%, #AED6F1 60%, #85C1E9 100%)',
          }}
        />
        <div className="absolute -top-40 -right-40 -z-10 h-80 w-80 rounded-full bg-brand-green/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 -z-10 h-80 w-80 rounded-full bg-brand-bright/10 blur-3xl" />

        <div className="mx-auto max-w-lg text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-brand-deep shadow-sm backdrop-blur-sm">
            AI-powered trip planning
          </div>

          <h1 className="mb-2 text-5xl font-bold tracking-tight text-brand-deep sm:text-6xl">
            {BRAND.name}
          </h1>

          <p className="mb-6 text-xl font-medium text-brand-bright">
            {BRAND.tagline}
          </p>

          <p className="mb-10 text-lg leading-relaxed text-brand-deep/70">
            Stop the endless WhatsApp back-and-forth. Get everyone to agree on
            travel dates in under 10 minutes.
          </p>

          <Link href="/create">
            <Button
              size="lg"
              className="h-14 rounded-full bg-brand-green px-10 text-lg font-semibold text-white shadow-lg shadow-brand-green/25 transition-all hover:bg-brand-green/90 hover:shadow-xl hover:shadow-brand-green/30 active:scale-[0.98]"
            >
              Start a Trip
            </Button>
          </Link>
        </div>

        {/* How it works */}
        <div className="mx-auto mt-20 grid w-full max-w-lg gap-4 sm:max-w-2xl sm:grid-cols-3 sm:gap-6">
          {[
            {
              step: '1',
              icon: '📝',
              title: 'Create',
              desc: 'Set your trip name and date range',
            },
            {
              step: '2',
              icon: '📲',
              title: 'Share',
              desc: 'Invite friends via WhatsApp or link',
            },
            {
              step: '3',
              icon: '🤖',
              title: 'Decide',
              desc: 'AI finds the best dates, group votes',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-4 rounded-2xl bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:flex-col sm:items-center sm:text-center"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-deep/10 text-2xl">
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold text-brand-deep">{item.title}</h3>
                <p className="text-sm text-brand-deep/60">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
