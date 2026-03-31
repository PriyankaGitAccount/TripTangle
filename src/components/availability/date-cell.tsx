'use client';

import type { AvailabilityStatus } from '@/types';

interface DateCellProps {
  date: string;
  status: AvailabilityStatus | null;
  onTap: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-brand-green text-white shadow-sm shadow-brand-green/20',
  maybe: 'bg-brand-amber text-white shadow-sm shadow-brand-amber/20',
  unavailable: 'bg-brand-red text-white shadow-sm shadow-brand-red/20',
};

export function DateCell({ date, status, onTap }: DateCellProps) {
  const day = new Date(date + 'T00:00:00').getDate();
  const style = status ? STATUS_STYLES[status] : 'bg-muted/50 text-foreground hover:bg-muted';

  return (
    <button
      type="button"
      onClick={onTap}
      className={`flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-all active:scale-95 ${style}`}
      aria-label={`${date}: ${status || 'not set'}`}
    >
      {day}
    </button>
  );
}
