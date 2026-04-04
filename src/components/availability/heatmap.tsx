'use client';

import { getDatesBetween } from '@/lib/trip-utils';
import type { Availability, Member } from '@/types';

interface HeatmapProps {
  dateRangeStart: string;
  dateRangeEnd: string;
  availability: Availability[];
  members: Member[];
}

type Stats = { available: number; maybe: number; unavailable: number };

function getHeatClasses(stats: Stats, totalMembers: number, hasData: boolean): string {
  if (!hasData) return 'bg-white/50 text-muted-foreground/50 shadow-sm';
  const { available, maybe, unavailable } = stats;
  // All members fully available → bright green
  if (available === totalMembers) return 'bg-emerald-200 text-emerald-800 shadow-sm shadow-emerald-200';
  // Some available, none unavailable → light green (available + maybe mix)
  if (available > 0 && unavailable === 0) return 'bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-100';
  // Some available but conflicts exist → amber
  if (available > 0) return 'bg-amber-100 text-amber-700 shadow-sm shadow-amber-100';
  // No one available, all maybe → yellow
  if (maybe > 0 && unavailable === 0) return 'bg-yellow-100 text-yellow-700 shadow-sm shadow-yellow-100';
  // Maybe + unavailable mix → orange
  if (maybe > 0) return 'bg-orange-100 text-orange-700 shadow-sm shadow-orange-100';
  // All unavailable → red
  return 'bg-red-100 text-red-700 shadow-sm shadow-red-100';
}

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

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Heatmap({ dateRangeStart, dateRangeEnd, availability, members }: HeatmapProps) {
  const totalMembers = members.length;
  const rangeStart = new Date(dateRangeStart + 'T00:00:00');
  const rangeEnd = new Date(dateRangeEnd + 'T00:00:00');

  const dateStats = new Map<string, Stats>();
  for (const d of getDatesBetween(dateRangeStart, dateRangeEnd)) {
    dateStats.set(d, { available: 0, maybe: 0, unavailable: 0 });
  }
  for (const a of availability) {
    const stats = dateStats.get(a.date);
    if (stats && a.status in stats) stats[a.status as keyof Stats]++;
  }

  const submittedCount = new Set(availability.map((a) => a.member_id)).size;
  const months = getMonthsInRange(dateRangeStart, dateRangeEnd);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <span className="text-xs font-medium text-muted-foreground">
          {submittedCount}/{totalMembers} submitted
        </span>
      </div>

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
              {cells.map(({ date, day, inRange }) => {
                if (!inRange) {
                  return (
                    <div key={date} className="flex h-10 items-center justify-center rounded-xl text-xs text-muted-foreground/25">
                      {day}
                    </div>
                  );
                }

                const stats = dateStats.get(date) ?? { available: 0, maybe: 0, unavailable: 0 };
                const totalMarked = stats.available + stats.maybe + stats.unavailable;
                const hasData = totalMarked > 0;
                const heatClass = getHeatClasses(stats, totalMembers, hasData);

                // Build ordered pip colours: available (green) → maybe (amber) → unavailable (red) → no-response (grey)
                const noResponse = totalMembers - totalMarked;
                const pipColors = [
                  ...Array(stats.available).fill('#16A34A'),
                  ...Array(stats.maybe).fill('#D97706'),
                  ...Array(stats.unavailable).fill('#EF4444'),
                  ...Array(noResponse).fill('rgba(0,0,0,0.08)'),
                ];

                return (
                  <div
                    key={date}
                    className={`flex flex-col h-10 items-center justify-center rounded-xl text-xs font-medium transition-colors gap-0.5 ${heatClass}`}
                    title={
                      hasData
                        ? `${stats.available} free · ${stats.maybe} maybe · ${stats.unavailable} busy`
                        : 'No responses yet'
                    }
                  >
                    <div>{day}</div>
                    {totalMembers > 0 && (
                      <div className="flex items-center gap-0.5">
                        {pipColors.map((color, i) => (
                          <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="pt-2 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">
          Colour key
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            { cls: 'bg-emerald-200', label: 'Everyone free' },
            { cls: 'bg-emerald-100', label: 'Some free, no conflicts' },
            { cls: 'bg-amber-100',   label: 'Free + busy mix' },
            { cls: 'bg-yellow-100',  label: 'Everyone maybe' },
            { cls: 'bg-orange-100',  label: 'Maybe + busy mix' },
            { cls: 'bg-red-100',     label: 'Everyone busy' },
          ].map(({ cls, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`h-4 w-4 rounded-md shrink-0 ${cls} shadow-sm`} />
              <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="h-4 w-4 rounded-md shrink-0 bg-white/50 shadow-sm border border-border/20" />
          <span className="text-[10px] text-muted-foreground">No responses yet</span>
        </div>
      </div>
    </div>
  );
}
