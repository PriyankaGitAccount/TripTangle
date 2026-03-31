'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberIdentity } from '@/hooks/use-member-identity';
import { useRealtimeMembers } from '@/hooks/use-realtime-members';
import { useRealtimeAvailability } from '@/hooks/use-realtime-availability';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { TripHeader } from './trip-header';
import { MemberList } from './member-list';
import { CalendarGrid } from '@/components/availability/calendar-grid';
import { Heatmap } from '@/components/availability/heatmap';
import { RecommendationCard } from '@/components/ai/recommendation-card';
import { RecommendationTrigger } from '@/components/ai/recommendation-trigger';
import { VotePoll } from '@/components/vote/vote-poll';
import { LockBanner } from '@/components/vote/lock-banner';
import { WhatsNextCards } from './whats-next-cards';
import type {
  Trip,
  Member,
  Availability,
  AIRecommendation,
  Vote,
} from '@/types';

interface TripDashboardProps {
  trip: Trip;
  initialMembers: Member[];
  initialAvailability: Availability[];
  initialRecommendation: AIRecommendation | null;
  initialVotes: Vote[];
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
  const availability = useRealtimeAvailability(trip.id, initialAvailability);
  const votes = useRealtimeVotes(trip.id, initialVotes);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(
    initialRecommendation
  );
  const [tripState, setTripState] = useState(trip);

  // Redirect to join if not identified
  if (isLoaded && !isIdentified) {
    router.push(`/trip/${trip.id}/join`);
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-bright/20 border-t-brand-bright" />
      </div>
    );
  }

  const isCreator = trip.creator_member_id === memberId;
  const isLocked = !!tripState.locked_dates_start;
  const submittedMemberIds = new Set(availability.map((a) => a.member_id));
  const submittedCount = submittedMemberIds.size;

  function handleLock(start: string, end: string) {
    setTripState((prev) => ({
      ...prev,
      locked_dates_start: start,
      locked_dates_end: end,
    }));
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 pb-20">
      <div className="space-y-8">
        {/* Header */}
        <TripHeader trip={tripState} />

        {/* Lock Banner */}
        {isLocked && (
          <LockBanner
            start={tripState.locked_dates_start!}
            end={tripState.locked_dates_end!}
          />
        )}

        {/* Members */}
        <MemberList
          members={members}
          availability={availability}
          currentMemberId={memberId}
        />

        {/* Availability - only show if not locked */}
        {!isLocked && memberId && (
          <CalendarGrid
            tripId={trip.id}
            memberId={memberId}
            dateRangeStart={trip.date_range_start}
            dateRangeEnd={trip.date_range_end}
            availability={availability}
          />
        )}

        {/* Heatmap */}
        <Heatmap
          dateRangeStart={trip.date_range_start}
          dateRangeEnd={trip.date_range_end}
          availability={availability}
          members={members}
        />

        {/* AI Recommendation */}
        {recommendation ? (
          <div className="space-y-6">
            <RecommendationCard
              recommendation={recommendation.recommendation_json}
            />
            <VotePoll
              tripId={trip.id}
              memberId={memberId}
              recommendation={recommendation.recommendation_json}
              votes={votes}
              members={members}
              isCreator={isCreator}
              isLocked={isLocked}
              onLock={handleLock}
            />
          </div>
        ) : (
          !isLocked && (
            <RecommendationTrigger
              tripId={trip.id}
              submittedCount={submittedCount}
              onRecommendation={setRecommendation}
            />
          )
        )}

        {/* What's Next - show after lock */}
        {isLocked && <WhatsNextCards />}
      </div>
    </div>
  );
}
