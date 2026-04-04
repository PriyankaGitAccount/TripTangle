'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { AVAILABILITY_CYCLE } from '@/lib/constants';
import type { Availability, AvailabilityStatus } from '@/types';
import { DateCell } from './date-cell';

interface CalendarGridProps {
  tripId: string;
  memberId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  availability: Availability[];
  onSave?: (record: Availability) => void;
  onRemove?: (memberId: string, date: string) => void;
  onPause?: () => void;
  canEdit?: boolean;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthsInRange(start: string, end: string): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const cur = new Date(start + 'T00:00:00');
  cur.setDate(1);
  const last = new Date(end + 'T00:00:00');
  last.setDate(1);
  while (cur <= last) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const PAUSE_DELAY = 3000; // 3 seconds of inactivity triggers AI re-suggestion

export function CalendarGrid({
  tripId,
  memberId,
  dateRangeStart,
  dateRangeEnd,
  availability,
  onSave,
  onRemove,
  onPause,
  canEdit = true,
}: CalendarGridProps) {
  const myAvailability = availability.filter((a) => a.member_id === memberId);
  const statusMap = new Map(myAvailability.map((a) => [a.date, a.status]));

  const [localStatus, setLocalStatus] = useState<Map<string, AvailabilityStatus | null>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPendingChangesRef = useRef(false);
  // Always holds the latest onPause — timer closure reads this, not the captured prop
  const onPauseRef = useRef(onPause);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);

  // Clean up pause timer on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  function getStatus(date: string): AvailabilityStatus | null {
    if (localStatus.has(date)) return localStatus.get(date)!;
    return statusMap.get(date) || null;
  }

  const handleTap = useCallback(
    (date: string) => {
      if (!canEdit) return;

      const current = getStatus(date);
      const currentIndex = AVAILABILITY_CYCLE.indexOf(current);
      const next = AVAILABILITY_CYCLE[(currentIndex + 1) % AVAILABILITY_CYCLE.length];

      setLocalStatus((prev) => new Map(prev).set(date, next));
      hasPendingChangesRef.current = true;

      // Restart pause timer on each tap — always, so it fires even if onPause
      // becomes defined after the tap (e.g. auto-trigger loads while user is tapping)
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => {
        if (hasPendingChangesRef.current) {
          hasPendingChangesRef.current = false;
          onPauseRef.current?.(); // reads latest value, not the closure-captured one
        }
      }, PAUSE_DELAY);

      const existing = debounceTimers.current.get(date);
      if (existing) clearTimeout(existing);

      debounceTimers.current.set(
        date,
        setTimeout(async () => {
          try {
            const res = await fetch(`/api/trips/${tripId}/availability`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ member_id: memberId, date, status: next }),
            });
            if (!res.ok) throw new Error();
            const { record } = await res.json();
            if (next === null) {
              onRemove?.(memberId, date);
            } else if (record) {
              onSave?.(record);
            }
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
    [tripId, memberId, availability, localStatus, canEdit]
  );

  const rangeStart = new Date(dateRangeStart + 'T00:00:00');
  const rangeEnd = new Date(dateRangeEnd + 'T00:00:00');
  const months = getMonthsInRange(dateRangeStart, dateRangeEnd);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-md bg-emerald-500" />
          Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-md bg-amber-500" />
          Maybe
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-md bg-red-400" />
          Busy
        </span>
      </div>

      {/* Editing locked notice */}
      {!canEdit && (
        <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground text-center">
          Max revisions reached — availability locked
        </div>
      )}

      {/* Month-by-month grid */}
      {months.map(({ year, month }) => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDow = new Date(year, month, 1).getDay();
        const startPad = (firstDow + 6) % 7;

        const cells: { date: string; day: number; inRange: boolean }[] = Array.from(
          { length: daysInMonth },
          (_, i) => {
            const day = i + 1;
            const date = toISO(year, month, day);
            const d = new Date(date + 'T00:00:00');
            return { date, day, inRange: d >= rangeStart && d <= rangeEnd };
          }
        );

        return (
          <div key={`${year}-${month}`} className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">
              {MONTH_NAMES[month]} {year}
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map((d, i) => (
                <div key={i} className="py-0.5 text-center text-[10px] font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {cells.map(({ date, day, inRange }) =>
                inRange ? (
                  <DateCell
                    key={date}
                    date={date}
                    status={getStatus(date)}
                    onTap={canEdit ? () => handleTap(date) : undefined}
                  />
                ) : (
                  <div
                    key={date}
                    className="flex h-10 items-center justify-center rounded-xl text-xs text-muted-foreground/25"
                  >
                    {day}
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
