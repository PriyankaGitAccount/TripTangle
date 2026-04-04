'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useMemberIdentity } from '@/hooks/use-member-identity';
import { useRealtimeMembers } from '@/hooks/use-realtime-members';
import { useRealtimeAvailability } from '@/hooks/use-realtime-availability';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { TripHeader } from './trip-header';
import { MemberList } from './member-list';
import { CalendarGrid } from '@/components/availability/calendar-grid';
import { Heatmap } from '@/components/availability/heatmap';
import { RecommendationTrigger } from '@/components/ai/recommendation-trigger';
import { AiVotePanel } from '@/components/vote/ai-vote-panel';
import { LockBanner } from '@/components/vote/lock-banner';
import { WhatsNextCards } from './whats-next-cards';
import { MIN_MEMBERS_FOR_AI } from '@/lib/constants';
import type { Trip, Member, Availability, AIRecommendation, Vote } from '@/types';

interface TripDashboardProps {
  trip: Trip;
  initialMembers: Member[];
  initialAvailability: Availability[];
  initialRecommendation: AIRecommendation | null;
  initialVotes: Vote[];
}

function Panel({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
        </div>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Live
    </span>
  );
}

export function TripDashboard({
  trip,
  initialMembers,
  initialAvailability,
  initialRecommendation,
  initialVotes,
}: TripDashboardProps) {
  const router = useRouter();
  const { memberId, isIdentified, isLoaded } = useMemberIdentity(trip.id);
  const members = useRealtimeMembers(trip.id, initialMembers);
  const { availability, patchAvailability, removeAvailability } = useRealtimeAvailability(trip.id, initialAvailability);
  const votes = useRealtimeVotes(trip.id, initialVotes);

  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(initialRecommendation);
  const [tripState, setTripState] = useState(trip);
  const [autoLoading, setAutoLoading] = useState(false);
  const hasAutoTriggered = useRef(false);

  const MAX_REVISIONS = 3;
  const revisionStorageKey = memberId ? `triptangle_revisions_${trip.id}_${memberId}` : null;
  const getRevisionCount = () => {
    if (!revisionStorageKey) return 0;
    return parseInt(localStorage.getItem(revisionStorageKey) ?? '0', 10);
  };
  const incrementRevision = () => {
    if (!revisionStorageKey) return;
    localStorage.setItem(revisionStorageKey, String(getRevisionCount() + 1));
  };
  const canEditCalendar = !recommendation || getRevisionCount() < MAX_REVISIONS;

  const isCreator = trip.creator_member_id === memberId;
  const isLocked = !!tripState.locked_dates_start;
  const submittedMemberIds = new Set(availability.map((a) => a.member_id));
  const submittedCount = submittedMemberIds.size;
  const allSubmitted = members.length >= MIN_MEMBERS_FOR_AI && submittedCount === members.length;

  const autoTrigger = useCallback(async () => {
    if (hasAutoTriggered.current || recommendation || isLocked) return;
    hasAutoTriggered.current = true;
    setAutoLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/recommend`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const { recommendation: rec } = await res.json();
      setRecommendation(rec);
      toast.success('AI found the best dates! 🎉');
    } catch {
      hasAutoTriggered.current = false;
    } finally {
      setAutoLoading(false);
    }
  }, [recommendation, isLocked, trip.id]);

  const handlePause = useCallback(async () => {
    if (isLocked || autoLoading) return;
    incrementRevision();
    setAutoLoading(true);
    hasAutoTriggered.current = false;
    setRecommendation(null);
    try {
      const res = await fetch(`/api/trips/${trip.id}/recommend`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const { recommendation: rec } = await res.json();
      setRecommendation(rec);
      toast.success('Suggestions updated!');
    } catch {
      toast.error('Failed to update suggestions');
    } finally {
      setAutoLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, autoLoading, trip.id]);

  useEffect(() => {
    if (allSubmitted && !recommendation && !autoLoading) {
      autoTrigger();
    }
  }, [allSubmitted, recommendation, autoLoading, autoTrigger]);

  useEffect(() => {
    if (isLoaded && !isIdentified) {
      router.push(`/trip/${trip.id}/join`);
    }
  }, [isLoaded, isIdentified, trip.id, router]);

  useEffect(() => {
    if (isLoaded && isLocked) {
      router.push(`/trip/${trip.id}/plan`);
    }
  }, [isLoaded, isLocked, trip.id, router]);

  if (!isLoaded || !isIdentified) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-amber/20 border-t-brand-bright" />
      </div>
    );
  }

  function handleLock(start: string, end: string) {
    setTripState((prev) => ({ ...prev, locked_dates_start: start, locked_dates_end: end }));
    if (trip.destination?.trim()) {
      toast.info('Building your itinerary…');
      fetch(`/api/trips/${trip.id}/itinerary`, { method: 'POST' })
        .then((r) => { if (r.ok) toast.success('Itinerary ready! Head to the Plan tab 🗺️'); })
        .catch(() => {});
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-5 pb-16">

      {/* Full-width top bar */}
      <div className="mb-5">
        <TripHeader trip={tripState} isLocked={isLocked} />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-5 items-start">

        {/* ═══════════════════════════════════
            LEFT COLUMN — Personal / Input
            ═══════════════════════════════════ */}
        <div className="space-y-4 md:sticky md:top-4">

          {/* Who's in */}
          <Panel icon="👥" title="Who's in">
            <MemberList
              members={members}
              availability={availability}
              currentMemberId={memberId}
            />
          </Panel>

          {/* After lock: destination card under members */}
          {isLocked && (
            <LockBanner
              start={tripState.locked_dates_start!}
              end={tripState.locked_dates_end!}
              tripName={trip.name}
            />
          )}

          {/* Your availability calendar — only when not locked */}
          {!isLocked && memberId && (
            <Panel icon="📅" title="Your Availability">
              <CalendarGrid
                tripId={trip.id}
                memberId={memberId}
                dateRangeStart={trip.date_range_start}
                dateRangeEnd={trip.date_range_end}
                availability={availability}
                onSave={patchAvailability}
                onRemove={removeAvailability}
                onPause={recommendation ? handlePause : undefined}
                canEdit={canEditCalendar}
              />
            </Panel>
          )}
        </div>

        {/* ═══════════════════════════════════
            RIGHT COLUMN
            Active: heatmap ↔ AI + vote
            Locked: feature cards
            ═══════════════════════════════════ */}
        <div className="space-y-4">
          {isLocked ? (
            /* Post-lock: feature planning cards */
            <WhatsNextCards
              tripId={trip.id}
              lockedStart={tripState.locked_dates_start ?? undefined}
              lockedEnd={tripState.locked_dates_end ?? undefined}
            />
          ) : (
            /* Active: heatmap + AI/vote side by side */
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">

              {/* Group heatmap */}
              <Panel icon="📊" title="Group Availability" badge={<LiveBadge />}>
                <Heatmap
                  dateRangeStart={trip.date_range_start}
                  dateRangeEnd={trip.date_range_end}
                  availability={availability}
                  members={members}
                />
              </Panel>

              {/* AI options + inline vote */}
              <Panel icon="🗓️" title="Our Date Suggestions">
                {autoLoading ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="text-3xl">🤖</div>
                    <p className="text-sm font-semibold text-brand-deep">
                      Analysing availability…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Finding the best window
                    </p>
                    <div className="flex justify-center pt-1">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-bright/20 border-t-brand-bright" />
                    </div>
                  </div>
                ) : recommendation ? (
                  <AiVotePanel
                    tripId={trip.id}
                    memberId={memberId}
                    recommendation={recommendation.recommendation_json}
                    votes={votes}
                    members={members}
                    isCreator={isCreator}
                    isLocked={isLocked}
                    onLock={handleLock}
                    refreshing={autoLoading}
                    onRefresh={async () => {
                      setAutoLoading(true);
                      hasAutoTriggered.current = false;
                      setRecommendation(null);
                      try {
                        const res = await fetch(`/api/trips/${trip.id}/recommend`, { method: 'POST' });
                        if (!res.ok) throw new Error();
                        const { recommendation: rec } = await res.json();
                        setRecommendation(rec);
                        toast.success('Dates recalculated!');
                      } catch {
                        toast.error('Failed to recalculate');
                      } finally {
                        setAutoLoading(false);
                      }
                    }}
                  />
                ) : (
                  <RecommendationTrigger
                    tripId={trip.id}
                    submittedCount={submittedCount}
                    onRecommendation={setRecommendation}
                  />
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
