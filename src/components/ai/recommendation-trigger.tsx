'use client';

import { useState } from 'react';
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
      const res = await fetch(`/api/trips/${tripId}/recommend`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get recommendation');
      }
      const { recommendation } = await res.json();
      onRecommendation(recommendation);
      toast.success('AI recommendation ready!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl border-2 border-dashed p-6 text-center space-y-4"
      style={{
        borderColor: canTrigger ? 'rgba(234,88,12,0.3)' : undefined,
        background: canTrigger ? 'rgba(234,88,12,0.04)' : undefined,
      }}
    >
      <div className="text-4xl">{canTrigger ? '🤖' : '⏳'}</div>

      <div>
        <p className="font-semibold text-brand-deep">
          {canTrigger
            ? 'Ready! Analyse the group overlap'
            : `Waiting for ${MIN_MEMBERS_FOR_AI - submittedCount} more member${MIN_MEMBERS_FOR_AI - submittedCount === 1 ? '' : 's'} to submit`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {canTrigger
            ? `${submittedCount} members have submitted — we'll find the best window`
            : `${submittedCount}/${MIN_MEMBERS_FOR_AI} submitted so far`}
        </p>
      </div>

      {canTrigger && (
        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #EA580C 0%, #D97706 100%)',
            boxShadow: '0 4px 16px rgba(234,88,12,0.25)',
          }}
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Analysing availability…
            </>
          ) : (
            '✦ Get AI Recommendation'
          )}
        </button>
      )}
    </div>
  );
}
