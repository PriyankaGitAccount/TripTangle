'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { getDatesBetween, getDayOfWeek } from '@/lib/trip-utils';
import { AVAILABILITY_CYCLE } from '@/lib/constants';
import type { Availability, AvailabilityStatus } from '@/types';
import { DateCell } from './date-cell';

interface CalendarGridProps {
  tripId: string;
  memberId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  availability: Availability[];
}

export function CalendarGrid({
  tripId,
  memberId,
  dateRangeStart,
  dateRangeEnd,
  availability,
}: CalendarGridProps) {
  const dates = getDatesBetween(dateRangeStart, dateRangeEnd);
  const myAvailability = availability.filter((a) => a.member_id === memberId);
  const statusMap = new Map(myAvailability.map((a) => [a.date, a.status]));

  const [localStatus, setLocalStatus] = useState<
    Map<string, AvailabilityStatus | null>
  >(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Merge server status with local optimistic updates
  function getStatus(date: string): AvailabilityStatus | null {
    if (localStatus.has(date)) return localStatus.get(date)!;
    return statusMap.get(date) || null;
  }

  const handleTap = useCallback(
    (date: string) => {
      const current = getStatus(date);
      const currentIndex = AVAILABILITY_CYCLE.indexOf(current);
      const next =
        AVAILABILITY_CYCLE[(currentIndex + 1) % AVAILABILITY_CYCLE.length];

      // Optimistic update
      setLocalStatus((prev) => new Map(prev).set(date, next));

      // Debounce API call
      const existing = debounceTimers.current.get(date);
      if (existing) clearTimeout(existing);

      debounceTimers.current.set(
        date,
        setTimeout(async () => {
          try {
            const res = await fetch(`/api/trips/${tripId}/availability`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                member_id: memberId,
                date,
                status: next,
              }),
            });
            if (!res.ok) throw new Error();
            // Clear local override after server confirms
            setLocalStatus((prev) => {
              const updated = new Map(prev);
              updated.delete(date);
              return updated;
            });
          } catch {
            toast.error('Failed to save availability');
            setLocalStatus((prev) => {
              const updated = new Map(prev);
              updated.delete(date);
              return updated;
            });
          }
        }, 300)
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tripId, memberId, availability, localStatus]
  );

  // Get the day of week for the first date to add padding
  const firstDate = new Date(dates[0] + 'T00:00:00');
  const startPadding = (firstDate.getDay() + 6) % 7; // Monday = 0

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Your Availability
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-brand-green" />
            Free
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-brand-amber" />
            Maybe
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-brand-red" />
            Busy
          </span>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for first week */}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {dates.map((date) => (
          <DateCell
            key={date}
            date={date}
            status={getStatus(date)}
            onTap={() => handleTap(date)}
          />
        ))}
      </div>
    </div>
  );
}
