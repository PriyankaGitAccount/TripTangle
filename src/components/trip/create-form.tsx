'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MAX_DATE_RANGE_DAYS } from '@/lib/constants';
import { daysBetween } from '@/lib/trip-utils';

export function CreateTripForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string).trim();
    const description = (form.get('description') as string).trim();
    const dateStart = form.get('dateStart') as string;
    const dateEnd = form.get('dateEnd') as string;
    const displayName = (form.get('displayName') as string).trim();

    if (!name || !dateStart || !dateEnd || !displayName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (dateEnd < dateStart) {
      toast.error('End date must be after start date');
      return;
    }

    if (daysBetween(dateStart, dateEnd) > MAX_DATE_RANGE_DAYS) {
      toast.error(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          date_range_start: dateStart,
          date_range_end: dateEnd,
          display_name: displayName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create trip');
      }

      const { trip_id, member_id } = await res.json();

      // Store identity in localStorage
      try {
        localStorage.setItem(
          `triptangle_member_${trip_id}`,
          JSON.stringify({ memberId: member_id, displayName })
        );
      } catch {
        // localStorage unavailable
      }

      router.push(`/trip/${trip_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  // Default date range: next month
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const defaultStart = nextMonth.toISOString().split('T')[0];
  const endOfNextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 2,
    0
  );
  const defaultEnd = endOfNextMonth.toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Trip Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Summer Beach Trip"
          required
          maxLength={100}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="A weekend getaway with friends..."
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateStart">Start Date *</Label>
          <Input
            id="dateStart"
            name="dateStart"
            type="date"
            required
            defaultValue={defaultStart}
            min={today.toISOString().split('T')[0]}
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateEnd">End Date *</Label>
          <Input
            id="dateEnd"
            name="dateEnd"
            type="date"
            required
            defaultValue={defaultEnd}
            min={today.toISOString().split('T')[0]}
            className="h-12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Your Name *</Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder="What should we call you?"
          required
          maxLength={50}
          className="h-12"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-14 w-full rounded-xl bg-brand-green text-lg font-semibold text-white shadow-md transition-all hover:bg-brand-green/90 active:scale-[0.98]"
      >
        {loading ? 'Creating...' : 'Create Trip'}
      </Button>
    </form>
  );
}
