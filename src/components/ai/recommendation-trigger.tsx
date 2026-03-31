'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MIN_MEMBERS_FOR_AI } from '@/lib/constants';
import type { AIRecommendation } from '@/types';

interface RecommendationTriggerProps {
  tripId: string;
  submittedCount: number;
  onRecommendation: (rec: AIRecommendation) => void;
}

export function RecommendationTrigger({
  tripId,
  submittedCount,
  onRecommendation,
}: RecommendationTriggerProps) {
  const [loading, setLoading] = useState(false);
  const canTrigger = submittedCount >= MIN_MEMBERS_FOR_AI;

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/recommend`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get recommendation');
      }

      const { recommendation } = await res.json();
      onRecommendation(recommendation);
      toast.success('AI recommendation ready!');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={!canTrigger || loading}
        className="h-14 w-full gap-2 rounded-xl bg-gradient-to-r from-brand-deep to-brand-bright text-base font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Analyzing availability...
          </>
        ) : (
          <>
            🤖 Get AI Recommendation
          </>
        )}
      </Button>
      {!canTrigger && (
        <p className="text-center text-xs text-muted-foreground">
          Need at least {MIN_MEMBERS_FOR_AI} members to submit availability
        </p>
      )}
    </div>
  );
}
