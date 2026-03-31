'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const displayName = (form.get('displayName') as string).trim();

    if (!displayName) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join');
      }

      const { member_id } = await res.json();

      try {
        localStorage.setItem(
          `triptangle_member_${tripId}`,
          JSON.stringify({ memberId: member_id, displayName })
        );
      } catch {
        // localStorage unavailable
      }

      router.push(`/trip/${tripId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 text-5xl">🌴</div>
        <h1 className="mb-2 text-2xl font-bold text-brand-deep">
          Join the Trip
        </h1>
        <p className="mb-8 text-muted-foreground">
          Enter your name to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="displayName">Your Name</Label>
            <Input
              id="displayName"
              name="displayName"
              placeholder="What should we call you?"
              required
              maxLength={50}
              autoFocus
              className="h-12 text-center text-lg"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-xl bg-brand-green text-lg font-semibold text-white shadow-md hover:bg-brand-green/90 active:scale-[0.98]"
          >
            {loading ? 'Joining...' : 'Join Trip'}
          </Button>
        </form>
      </div>
    </div>
  );
}
