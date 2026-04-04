'use client';

import type { Trip } from '@/types';
import { ShareDialog } from './share-dialog';
import { formatDateRange } from '@/lib/trip-utils';
import { Badge } from '@/components/ui/badge';

interface TripHeaderProps {
  trip: Trip;
  isLocked?: boolean;
}

export function TripHeader({ trip, isLocked: lockedProp }: TripHeaderProps) {
  const isLocked = lockedProp ?? !!trip.locked_dates_start;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-brand-deep truncate">
            {trip.name}
          </h1>
          {trip.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {trip.description}
            </p>
          )}
        </div>
        {!isLocked && <ShareDialog tripId={trip.id} tripName={trip.name} />}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {formatDateRange(trip.date_range_start, trip.date_range_end)}
        </span>
        {isLocked && (
          <Badge className="bg-brand-green text-white">
            Dates Locked
          </Badge>
        )}
      </div>
    </div>
  );
}
