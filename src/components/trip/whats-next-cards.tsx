'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CARDS = [
  {
    icon: '🗺️',
    title: 'AI Destination Suggestions',
    description:
      'Get personalized destination recommendations based on your group\'s preferences and budget.',
  },
  {
    icon: '🏨',
    title: 'Accommodation Options',
    description:
      'Compare hotels, Airbnbs, and hostels with real-time pricing and group-friendly amenities.',
  },
  {
    icon: '💰',
    title: 'Budget & Expense Tracker',
    description:
      'Set anonymous budgets, track group expenses, and split costs fairly.',
  },
  {
    icon: '📋',
    title: 'AI Itinerary Builder',
    description:
      'Generate day-by-day itineraries tailored to your destination and group interests.',
  },
];

export function WhatsNextCards() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        What&apos;s Next
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Card
            key={card.title}
            className="relative overflow-hidden border p-5 opacity-75 transition-opacity hover:opacity-100"
          >
            <Badge
              variant="secondary"
              className="absolute right-3 top-3 text-xs"
            >
              Coming Soon
            </Badge>
            <div className="mb-3 text-3xl">{card.icon}</div>
            <h4 className="mb-1 font-semibold text-brand-deep">
              {card.title}
            </h4>
            <p className="text-sm text-muted-foreground">
              {card.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
