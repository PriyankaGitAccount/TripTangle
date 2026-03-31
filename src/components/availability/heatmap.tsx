'use client';

import { getDatesBetween } from '@/lib/trip-utils';
import type { Availability, Member } from '@/types';

interface HeatmapProps {
  dateRangeStart: string;
  dateRangeEnd: string;
  availability: Availability[];
  members: Member[];
}

function getHeatColor(ratio: number): string {
  if (ratio === 0) return 'bg-red-100 text-red-700';
  if (ratio <= 0.25) return 'bg-orange-100 text-orange-700';
  if (ratio <= 0.5) return 'bg-amber-100 text-amber-800';
  if (ratio <= 0.75) return 'bg-emerald-100 text-emerald-700';
  return 'bg-emerald-200 text-emerald-800';
}

function getHeatBorder(ratio: number): string {
  if (ratio === 0) return 'ring-red-200';
  if (ratio <= 0.25) return 'ring-orange-200';
  if (ratio <= 0.5) return 'ring-amber-200';
  if (ratio <= 0.75) return 'ring-emerald-200';
  return 'ring-emerald-300';
}

export function Heatmap({
  dateRangeStart,
  dateRangeEnd,
  availability,
  members,
}: HeatmapProps) {
  const dates = getDatesBetween(dateRangeStart, dateRangeEnd);
  const totalMembers = members.length;

  // Build availability map: date -> { available, maybe, unavailable }
  const dateStats = new Map<
    string,
    { available: number; maybe: number; unavailable: number }
  >();

  for (const date of dates) {
    dateStats.set(date, { available: 0, maybe: 0, unavailable: 0 });
  }

  for (const a of availability) {
    const stats = dateStats.get(a.date);
    if (stats && a.status in stats) {
      stats[a.status as keyof typeof stats]++;
    }
  }

  const firstDate = new Date(dates[0] + 'T00:00:00');
  const startPadding = (firstDate.getDay() + 6) % 7;
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Members who submitted
  const submittedCount = new Set(availability.map((a) => a.member_id)).size;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Group Heatmap
        </h3>
        <span className="text-xs text-muted-foreground">
          {submittedCount}/{totalMembers} submitted
        </span>
      </div>

      {submittedCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 text-center">
          <span className="mb-2 text-3xl">📅</span>
          <p className="text-sm text-muted-foreground">
            No one has submitted availability yet.
            <br />
            Be the first!
          </p>
        </div>
      ) : (
        <>
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

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {dates.map((date) => {
              const stats = dateStats.get(date)!;
              // Weight: available = 1, maybe = 0.5
              const score =
                totalMembers > 0
                  ? (stats.available + stats.maybe * 0.5) / totalMembers
                  : 0;
              const day = new Date(date + 'T00:00:00').getDate();

              return (
                <div
                  key={date}
                  className={`flex h-11 items-center justify-center rounded-lg text-xs font-medium ring-1 transition-colors ${getHeatColor(score)} ${getHeatBorder(score)}`}
                  title={`${stats.available} available, ${stats.maybe} maybe, ${stats.unavailable} unavailable`}
                >
                  <div className="text-center">
                    <div>{day}</div>
                    {stats.available > 0 && (
                      <div className="text-[10px] leading-none opacity-70">
                        {stats.available}/{totalMembers}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-1 pt-1">
            <span className="text-[10px] text-muted-foreground">Less</span>
            <div className="h-3 w-3 rounded-sm bg-red-100" />
            <div className="h-3 w-3 rounded-sm bg-orange-100" />
            <div className="h-3 w-3 rounded-sm bg-amber-100" />
            <div className="h-3 w-3 rounded-sm bg-emerald-100" />
            <div className="h-3 w-3 rounded-sm bg-emerald-200" />
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </>
      )}
    </div>
  );
}
