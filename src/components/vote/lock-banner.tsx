'use client';

import { formatDateRange, daysBetween } from '@/lib/trip-utils';

interface LockBannerProps {
  start: string;
  end: string;
}

export function LockBanner({ start, end }: LockBannerProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-brand-green to-emerald-400 p-6 text-center text-white shadow-lg">
      <div className="mb-2 text-4xl">🎉</div>
      <h2 className="mb-1 text-xl font-bold">Dates Locked!</h2>
      <p className="text-lg font-semibold">
        {formatDateRange(start, end)}
      </p>
      <p className="mt-1 text-sm text-white/80">
        {daysBetween(start, end)} days of adventure await
      </p>
    </div>
  );
}
