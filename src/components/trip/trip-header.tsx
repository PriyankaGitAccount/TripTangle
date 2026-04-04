'use client';

import type { Trip } from '@/types';
import { ShareDialog } from './share-dialog';
import { formatDateRange } from '@/lib/trip-utils';
import { Badge } from '@/components/ui/badge';

interface TripHeaderProps {
  trip: Trip;
  isLocked?: boolean;
  inviteCount?: number;
  memberCount?: number;
  submittedCount?: number;
  onInviteSent?: () => void;
}

export function TripHeader({
  trip,
  isLocked: lockedProp,
  inviteCount = 0,
  memberCount = 1,
  submittedCount = 0,
  onInviteSent,
}: TripHeaderProps) {
  const isLocked = lockedProp ?? !!trip.locked_dates_start;

  // joined = members who exist (excluding creator, but we count creator too)
  // pending = invited - (memberCount - 1) since creator wasn't "invited"
  const joinedFriends = memberCount - 1; // friends who have joined (excl. creator)
  const pending = Math.max(0, inviteCount - joinedFriends);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-brand-deep truncate">
            {trip.name}
          </h1>
          {trip.description && (
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
              {trip.description}
            </p>
          )}
        </div>
        {!isLocked && (
          <ShareDialog
            tripId={trip.id}
            tripName={trip.name}
            inviteCount={inviteCount}
            onInviteSent={onInviteSent}
          />
        )}
      </div>

      <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
        <span className="text-sm text-muted-foreground">
          {formatDateRange(trip.date_range_start, trip.date_range_end)}
        </span>

        {isLocked ? (
          <Badge className="bg-brand-green text-white">Dates Locked</Badge>
        ) : (
          inviteCount > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-0.5 font-medium text-brand-deep">
                👥 {memberCount} joined
              </span>
              {pending > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700">
                  ⏳ {pending} pending
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-0.5 text-muted-foreground">
                {submittedCount}/{memberCount} ready
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
