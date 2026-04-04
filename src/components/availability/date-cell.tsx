'use client';

import type { AvailabilityStatus } from '@/types';

interface DateCellProps {
  date: string;
  status: AvailabilityStatus | null;
  onTap?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-emerald-500 text-white shadow-sm',
  maybe: 'bg-amber-500 text-white shadow-sm',
  unavailable: 'bg-red-400 text-white shadow-sm',
};

export function DateCell({ date, status, onTap }: DateCellProps) {
  const day = new Date(date + 'T00:00:00').getDate();
  const style = status ? STATUS_STYLES[status] : 'bg-white/80 text-foreground hover:bg-white shadow-sm';

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!onTap}
      className={`flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${style}`}
      aria-label={`${date}: ${status || 'not set'}`}
    >
      {day}
    </button>
  );
}
