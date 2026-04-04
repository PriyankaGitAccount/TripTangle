import Link from 'next/link';
import { BRAND } from '@/lib/constants';

/* ─── Step cards ─── */
const STEPS = [
  {
    num: '01',
    icon: '✈️',
    color: '#EA580C',
    title: 'Create your trip',
    desc: 'Name it, pick a date range, get a shareable link in seconds.',
  },
  {
    num: '02',
    icon: '📅',
    color: '#D97706',
    title: 'Everyone marks dates',
    desc: 'Friends tap free, maybe or busy — no account needed.',
  },
  {
    num: '03',
    icon: '🤖',
    color: '#16A34A',
    title: 'AI finds the sweet spot',
    desc: 'Analyses all responses and surfaces the best travel windows.',
  },
  {
    num: '04',
    icon: '🗳️',
    color: '#9A3412',
    title: 'Group votes, trip locked',
    desc: 'Highest votes win. Dates locked. Time to pack your bags.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#FFFBF5]">

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div
            className="h-9 w-9 rounded-2xl flex items-center justify-center text-white font-black text-base"
            style={{ background: 'linear-gradient(135deg, #EA580C, #D97706)' }}
          >
            T
          </div>
          <span className="text-[#9A3412] font-bold tracking-wider text-sm">
            {BRAND.name}
          </span>
        </div>
        <Link href="/create">
          <button
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#9A3412] bg-white/80 shadow-sm hover:shadow-md hover:bg-white transition-all"
          >
            Start planning
          </button>
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center px-6 py-16 sm:py-20 text-center overflow-hidden">

        {/* Background warm glow blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-20 blur-[100px]"
            style={{ background: 'radial-gradient(circle, #FDBA74, transparent)' }} />
          <div className="absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full opacity-15 blur-[80px]"
            style={{ background: 'radial-gradient(circle, #FDE68A, transparent)' }} />
          <div className="absolute top-1/3 right-1/4 h-72 w-72 rounded-full opacity-10 blur-[80px]"
            style={{ background: 'radial-gradient(circle, #FCA5A5, transparent)' }} />
        </div>

        {/* App name — large and prominent */}
        <h1
          className="font-black text-[#3C1106] mb-4"
          style={{ fontSize: 'clamp(3.5rem, 10vw, 7rem)', lineHeight: 1 }}
        >
          <span
            className="inline-block"
            style={{
              background: 'linear-gradient(90deg, #EA580C, #D97706, #EA580C)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s linear infinite',
            }}
          >
            {BRAND.name}
          </span>
        </h1>

        {/* Badge */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 shadow-sm px-4 py-1.5 text-xs font-medium text-[#9A3412]/60"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          No sign-up required · AI-powered · Free
        </div>

        {/* Subtitle */}
        <p
          className="mx-auto max-w-3xl font-semibold text-[#3C1106]/70 mb-4"
          style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}
        >
          Plan your next trip, together.
        </p>

        {/* Subheadline */}
        <p className="mx-auto max-w-lg text-base text-[#9A3412]/50 leading-relaxed">
          Stop losing your group trip in a 400-message chat.
          Share a link, pick dates, and let AI find the perfect window.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/create">
            <button
              className="relative h-14 rounded-full px-10 text-base font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #EA580C 0%, #D97706 100%)',
                boxShadow: '0 8px 32px rgba(234,88,12,0.3)',
              }}
            >
              Create a trip — it&apos;s free
            </button>
          </Link>
          <a href="#how-it-works" className="text-sm text-[#9A3412]/40 hover:text-[#9A3412]/70 transition-colors">
            See how it works ↓
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {['#EA580C','#D97706','#16A34A','#9A3412','#DC2626'].map((c, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                style={{ borderColor: '#FFFBF5', background: c }}
              >
                {['A','J','S','P','R'][i]}
              </div>
            ))}
          </div>
          <p className="text-sm text-[#9A3412]/40">
            Groups planned this week
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative px-6 py-12 sm:px-10 bg-white/50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#9A3412]/30 mb-3">
              How it works
            </p>
            <h2
              className="font-black text-[#3C1106]"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
            >
              From group chat chaos{' '}
              <span className="text-[#EA580C]">to confirmed trip.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="relative rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Connector dot */}
                {i < STEPS.length - 1 && (
                  <div
                    className="absolute hidden lg:block top-10 -right-2.5 h-2 w-2 rounded-full"
                    style={{ background: step.color }}
                  />
                )}
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: `${step.color}12` }}
                >
                  {step.icon}
                </div>
                <p
                  className="text-[10px] font-black tracking-widest mb-2"
                  style={{ color: step.color }}
                >
                  STEP {step.num}
                </p>
                <h3 className="text-[#3C1106] font-bold text-sm mb-2">{step.title}</h3>
                <p className="text-[#9A3412]/40 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-8 py-6 text-center text-xs text-[#9A3412]/25">
        {BRAND.name} · {BRAND.tagline}
      </footer>

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
