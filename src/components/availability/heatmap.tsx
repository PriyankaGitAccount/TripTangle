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
  if (ratio === 0) return 'bg-red-50 text-red-600';
  if (ratio <= 0.25) return 'bg-orange-50 text-orange-600';
  if (ratio <= 0.5) return 'bg-amber-50 text-amber-700';
  if (ratio <= 0.75) return 'bg-emerald-50 text-emerald-600';
  return 'bg-emerald-100 text-emerald-700';
}

function getHeatShadow(ratio: number): string {
  if (ratio === 0) return 'shadow-sm shadow-red-100';
  if (ratio <= 0.25) return 'shadow-sm shadow-orange-100';
  if (ratio <= 0.5) return 'shadow-sm shadow-amber-100';
  if (ratio <= 0.75) return 'shadow-sm shadow-emerald-100';
  return 'shadow-sm shadow-emerald-200';
}

/** Returns { year, month } objects for every calendar month the range touches */
function getMonthsInRange(start: string, end: string): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  const last = new Date(e.getFullYear(), e.getMonth(), 1);
  while (cur <= last) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

/** Returns all days (1-based) in a given month */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** ISO date string from year, month (0-based), day */
function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Heatmap({ dateRangeStart, dateRangeEnd, availability, members }: HeatmapProps) {
  const totalMembers = members.length;
  const rangeStart = new Date(dateRangeStart + 'T00:00:00');
  const rangeEnd = new Date(dateRangeEnd + 'T00:00:00');

  // Build date → stats map from submitted availability
  const dateStats = new Map<string, { available: number; maybe: number; unavailable: number }>();
  const rangeDates = getDatesBetween(dateRangeStart, dateRangeEnd);
  for (const d of rangeDates) {
    dateStats.set(d, { available: 0, maybe: 0, unavailable: 0 });
  }
  for (const a of availability) {
    const stats = dateStats.get(a.date);
    if (stats && a.status in stats) stats[a.status as keyof typeof stats]++;
  }

  const submittedCount = new Set(availability.map((a) => a.member_id)).size;
  const months = getMonthsInRange(dateRangeStart, dateRangeEnd);

  return (
    <div className="space-y-4">
      {/* Submitted count */}
      <div className="flex items-center justify-end">
        <span className="text-xs font-medium text-muted-foreground">
          {submittedCount}/{totalMembers} submitted
        </span>
      </div>

      {/* One grid per calendar month */}
      {months.map(({ year, month }) => {
        const daysInMonth = getDaysInMonth(year, month);
        // Monday = 0 offset: getDay() returns 0=Sun,1=Mon,...,6=Sat → convert to Mon-first
        const firstDow = new Date(year, month, 1).getDay();
        const startPad = (firstDow + 6) % 7; // Mon-based padding

        const cells: { date: string | null; day: number | null }[] = [
          ...Array.from({ length: startPad }, () => ({ date: null, day: null })),
          ...Array.from({ length: daysInMonth }, (_, i) => ({
            date: toISO(year, month, i + 1),
            day: i + 1,
          })),
        ];

        return (
          <div key={`${year}-${month}`} className="space-y-1">
            {/* Month header */}
            <p className="text-xs font-semibold text-muted-foreground">
              {MONTH_NAMES[month]} {year}
            </p>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map((d, i) => (
                <div key={i} className="py-0.5 text-center text-[10px] font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell, idx) => {
                if (!cell.date) {
                  return <div key={`pad-${idx}`} />;
                }

                const cellDate = new Date(cell.date + 'T00:00:00');
                const inRange = cellDate >= rangeStart && cellDate <= rangeEnd;

                if (!inRange) {
                  return (
                    <div
                      key={cell.date}
                      className="flex h-10 items-center justify-center rounded-xl text-xs text-muted-foreground/25"
                    >
                      {cell.day}
                    </div>
                  );
                }

                const stats = dateStats.get(cell.date) ?? { available: 0, maybe: 0, unavailable: 0 };
                const totalMarked = stats.available + stats.maybe + stats.unavailable;
                const hasData = totalMarked > 0;
                const score =
                  hasData && totalMembers > 0
                    ? (stats.available + stats.maybe * 0.5) / totalMembers
                    : 0;

                return (
                  <div
                    key={cell.date}
                    className={`flex h-10 items-center justify-center rounded-xl text-xs font-medium transition-colors ${
                      hasData
                        ? `${getHeatColor(score)} ${getHeatShadow(score)}`
                        : 'bg-white/50 text-muted-foreground/50 shadow-sm'
                    }`}
                    title={
                      hasData
                        ? `${stats.available} available, ${stats.maybe} maybe, ${stats.unavailable} unavailable`
                        : 'No responses yet'
                    }
                  >
                    <div className="text-center leading-none">
                      <div>{cell.day}</div>
                      {hasData && stats.available > 0 && (
                        <div className="text-[9px] opacity-70 mt-0.5">
                          {stats.available}/{totalMembers}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      {submittedCount > 0 && (
        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-md bg-white/70 shadow-sm" />
            <span className="text-[10px] text-muted-foreground">No response</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-md bg-red-50 shadow-sm" />
            <span className="text-[10px] text-muted-foreground">None free</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-md bg-amber-50 shadow-sm" />
            <span className="text-[10px] text-muted-foreground">Some free</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-md bg-emerald-100 shadow-sm" />
            <span className="text-[10px] text-muted-foreground">All free</span>
          </div>
        </div>
      )}
    </div>
  );
}
