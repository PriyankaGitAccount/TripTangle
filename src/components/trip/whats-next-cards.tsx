'use client';

import { useRouter } from 'next/navigation';
import { daysBetween } from '@/lib/trip-utils';

interface Card {
  icon: string;
  gradient: string;
  glow: string;
  tag: string;
  title: string;
  description: string;
  cta: string;
  tab?: string;        // if set — links to /trip/[id]/plan?tab=<tab>
  comingSoon?: boolean;
}

function buildCards(days: number | null): Card[] {
  return [
  {
    icon: '📋',
    gradient: 'from-orange-500 to-amber-600',
    glow: 'rgba(249,115,22,0.15)',
    tag: 'AI-Powered',
    title: 'Itinerary Builder',
    description: days
      ? `Your ${days}-day itinerary is ready — local recommendations, Google Maps previews, vlogs, and booking links.`
      : 'A day-by-day itinerary tuned to your group — local recommendations, vlogs, and booking links.',
    cta: days ? 'View itinerary' : 'Build itinerary',
    tab: 'itinerary',
  },
  {
    icon: '🗺️',
    gradient: 'from-sky-500 to-cyan-600',
    glow: 'rgba(14,165,233,0.15)',
    tag: 'Live',
    title: 'Shared Map',
    description:
      'Pin your hotel, restaurants, and activities on a shared map. Every group member sees pins in real-time.',
    cta: 'Open map',
    tab: 'map',
  },
  {
    icon: '📊',
    gradient: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.15)',
    tag: 'Live',
    title: 'Daily Polls',
    description:
      'Replace unstructured WhatsApp debates with quick group polls — beach or market, walk or taxi.',
    cta: 'Create a poll',
    tab: 'polls',
  },
  {
    icon: '💰',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.15)',
    tag: 'Coming soon',
    title: 'Budget & Expense Tracker',
    description:
      'Set anonymous budgets, log shared expenses, and settle up fairly. No awkward "who owes what" chats.',
    cta: 'Set up budget',
    comingSoon: true,
  },
];
}

interface WhatsNextCardsProps {
  tripId: string;
  lockedStart?: string;
  lockedEnd?: string;
}

export function WhatsNextCards({ tripId, lockedStart, lockedEnd }: WhatsNextCardsProps) {
  const router = useRouter();
  const days = lockedStart && lockedEnd ? daysBetween(lockedStart, lockedEnd) : null;
  const CARDS = buildCards(days);

  function handleCard(card: Card) {
    if (card.comingSoon) return;
    router.push(`/trip/${tripId}/plan${card.tab ? `?tab=${card.tab}` : ''}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">✨</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Plan the rest of your trip
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map((card) => (
          <div
            key={card.title}
            onClick={() => handleCard(card)}
            className={`group relative rounded-2xl bg-card shadow-md overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${
              card.comingSoon ? 'cursor-default opacity-70' : 'cursor-pointer'
            }`}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: card.glow }}
            />

            <div className="relative p-5 space-y-3">
              {/* Icon + tag */}
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-2xl shadow-sm`}
                >
                  {card.icon}
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {card.tag}
                </span>
              </div>

              {/* Text */}
              <div>
                <h4 className="font-bold text-foreground mb-1">{card.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </div>

              {/* CTA */}
              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-sm font-semibold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}
                >
                  {card.cta} →
                </span>
                {card.comingSoon && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
