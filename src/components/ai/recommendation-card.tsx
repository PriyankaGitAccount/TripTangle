'use client';

import type { RecommendationData } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateRange, daysBetween } from '@/lib/trip-utils';

interface RecommendationCardProps {
  recommendation: RecommendationData;
}

export function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const { best, runner_up, nudge } = recommendation;

  return (
    <div className="space-y-4">
      {/* Best option */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand-deep to-brand-bright p-5 text-white shadow-lg">
        <div className="absolute -top-6 -right-6 text-6xl opacity-10">
          ✨
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <Badge className="border-0 bg-white/20 text-white">
            AI Pick
          </Badge>
        </div>
        <h3 className="mb-1 text-xl font-bold">
          {formatDateRange(best.start, best.end)}
        </h3>
        <p className="mb-3 text-sm text-white/80">
          {daysBetween(best.start, best.end)} days
        </p>
        <div className="mb-3 flex items-center gap-4 text-sm">
          <span>
            <span className="font-bold text-lg">{best.available_count}</span>
            /{best.total_members} available
          </span>
          {best.maybe_count > 0 && (
            <span className="text-white/70">
              +{best.maybe_count} maybe
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-white/90">
          {best.summary}
        </p>
      </Card>

      {/* Runner up */}
      <Card className="border p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary">Runner Up</Badge>
        </div>
        <h3 className="mb-1 text-lg font-semibold text-brand-deep">
          {formatDateRange(runner_up.start, runner_up.end)}
        </h3>
        <p className="mb-2 text-xs text-muted-foreground">
          {daysBetween(runner_up.start, runner_up.end)} days
        </p>
        <div className="mb-2 flex items-center gap-4 text-sm">
          <span>
            <span className="font-bold">{runner_up.available_count}</span>
            /{runner_up.total_members} available
          </span>
          {runner_up.maybe_count > 0 && (
            <span className="text-muted-foreground">
              +{runner_up.maybe_count} maybe
            </span>
          )}
        </div>
        {runner_up.trade_off && (
          <p className="text-sm text-muted-foreground">
            {runner_up.trade_off}
          </p>
        )}
      </Card>

      {/* Nudge */}
      {nudge && (
        <div className="rounded-xl bg-brand-light p-4 text-sm text-brand-deep">
          💬 {nudge}
        </div>
      )}
    </div>
  );
}
