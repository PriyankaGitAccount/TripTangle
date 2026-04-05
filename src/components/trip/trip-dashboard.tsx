'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useRealtimeMembers } from '@/hooks/use-realtime-members';
import { useRealtimeAvailability } from '@/hooks/use-realtime-availability';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { TripHeader } from './trip-header';
import { TripTangleLogo } from '@/components/ui/logo';
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
  currentMemberId: string;
  currentUserRole: 'organizer' | 'member';
  initialMembers: Member[];
  initialAvailability: Availability[];
  initialRecommendation: AIRecommendation | null;
  initialVotes: Vote[];
  initialInviteCount: number;
}

function JoinView({
  trip,
  members,
  availability,
  onJoin,
}: {
  trip: Trip;
  members: Member[];
  availability: Availability[];
  onJoin: (memberId: string, displayName: string) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/trips/${trip.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join');
      }
      const { member_id } = await res.json();
      onJoin(member_id, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-5 pb-16 space-y-5">

      {/* Trip header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">You're invited to</p>
        <h1 className="text-2xl font-black text-brand-deep">{trip.name}</h1>
        {trip.destination && (
          <p className="text-sm text-muted-foreground mt-0.5">📍 {trip.destination}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {trip.date_range_start} → {trip.date_range_end}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-5 items-start">

        {/* Left — heatmap showing existing availability */}
        <div className="rounded-2xl bg-card shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📊</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Group Availability</span>
            </div>
            <span className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''} so far</span>
          </div>
          <div className="p-4">
            <Heatmap
              dateRangeStart={trip.date_range_start}
              dateRangeEnd={trip.date_range_end}
              availability={availability}
              members={members}
            />
          </div>
        </div>

        {/* Right — join form */}
        <div className="md:sticky md:top-4 rounded-2xl bg-card shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-brand-deep to-brand-bright px-5 py-4">
            <div className="mb-1"><TripTangleLogo size={32} /></div>
            <h2 className="text-lg font-bold text-white">Join & mark your dates</h2>
            <p className="text-xs text-white/70 mt-0.5">
              Enter your name, then tap the calendar to show when you're free
            </p>
          </div>
          <form onSubmit={handleJoin} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={50}
                autoFocus
                required
                className="w-full rounded-xl bg-background shadow-sm border border-border/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #27AE60 0%, #2980B9 100%)' }}
            >
              {loading ? 'Joining…' : 'Join Trip →'}
            </button>

            {members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {members.map((m) => (
                  <span key={m.id} className="rounded-full bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {m.display_name}
                  </span>
                ))}
                <span className="rounded-full bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground/60">
                  + you
                </span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
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
  currentMemberId,
  currentUserRole,
  initialMembers,
  initialAvailability,
  initialRecommendation,
  initialVotes,
  initialInviteCount,
}: TripDashboardProps) {
  const router = useRouter();
  const memberId = currentMemberId;
  const members = useRealtimeMembers(trip.id, initialMembers);
  const { availability, patchAvailability, removeAvailability } = useRealtimeAvailability(trip.id, initialAvailability);
  const votes = useRealtimeVotes(trip.id, initialVotes);

  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(initialRecommendation);
  const [tripState, setTripState] = useState(trip);
  const [autoLoading, setAutoLoading] = useState(false);
  const [inviteCount, setInviteCount] = useState(initialInviteCount);
  const hasAutoTriggered = useRef(false);
  const revisionCountRef = useRef(0);

  const canEditCalendar = !recommendation || revisionCountRef.current < 3;
  const incrementRevision = () => { revisionCountRef.current += 1; };

  const isCreator = currentUserRole === 'organizer';
  const isLocked = !!tripState.locked_dates_start;
  const submittedMemberIds = new Set(availability.map((a) => a.member_id));
  const submittedCount = submittedMemberIds.size;

  // Trigger AI when ≥60% of expected group (invites + creator) have submitted, min 2
  const expectedTotal = Math.max(members.length, inviteCount + 1);
  const threshold = Math.max(MIN_MEMBERS_FOR_AI, Math.ceil(expectedTotal * 0.6));
  const allSubmitted = submittedCount >= threshold;

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

  // Redirect to plan when dates get locked via realtime
  useEffect(() => {
    if (isLocked) router.push(`/trip/${trip.id}/plan`);
  }, [isLocked, trip.id, router]);

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
        <TripHeader
          trip={tripState}
          isLocked={isLocked}
          inviteCount={inviteCount}
          memberCount={members.length}
          submittedCount={submittedCount}
          onInviteSent={() => setInviteCount((c) => c + 1)}
        />
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
