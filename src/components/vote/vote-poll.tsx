'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatDateRange, daysBetween } from '@/lib/trip-utils';
import type { RecommendationData, Vote, Member } from '@/types';

interface VotePollProps {
  tripId: string;
  memberId: string | null;
  recommendation: RecommendationData;
  votes: Vote[];
  members: Member[];
  isCreator: boolean;
  isLocked: boolean;
  onLock: (start: string, end: string) => void;
}

export function VotePoll({
  tripId,
  memberId,
  recommendation,
  votes,
  members,
  isCreator,
  isLocked,
  onLock,
}: VotePollProps) {
  const [voting, setVoting] = useState(false);
  const [locking, setLocking] = useState(false);

  const options = [recommendation.best, ...(recommendation.runner_up ? [recommendation.runner_up] : [])];
  const myVote = votes.find((v) => v.member_id === memberId);

  // Count votes per option
  const voteCounts = options.map((_, i) =>
    votes.filter((v) => v.option_index === i).length
  );
  const totalVotes = votes.length;

  // Get voters for each option
  const voterNames = options.map((_, i) => {
    const optionVotes = votes.filter((v) => v.option_index === i);
    return optionVotes
      .map((v) => members.find((m) => m.id === v.member_id)?.display_name)
      .filter(Boolean);
  });

  // Determine winner (if majority or all voted)
  const allVoted = totalVotes >= members.length;
  const winnerIndex = allVoted
    ? voteCounts.indexOf(Math.max(...voteCounts))
    : -1;

  async function handleVote(optionIndex: number) {
    if (!memberId || isLocked) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          option_index: optionIndex,
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to cast vote');
    } finally {
      setVoting(false);
    }
  }

  async function handleLock() {
    const winner = options[winnerIndex >= 0 ? winnerIndex : 0];
    if (!winner) return;
    setLocking(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          start: winner.start,
          end: winner.end,
        }),
      });
      if (!res.ok) throw new Error();
      onLock(winner.start, winner.end);
      toast.success('Dates locked! 🎉');
    } catch {
      toast.error('Failed to lock dates');
    } finally {
      setLocking(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Vote for Your Preferred Dates
      </h3>

      {options.map((option, i) => {
        const isSelected = myVote?.option_index === i;
        const isWinner = winnerIndex === i && (allVoted || isLocked);
        const percentage =
          totalVotes > 0 ? Math.round((voteCounts[i] / totalVotes) * 100) : 0;

        return (
          <Card
            key={i}
            className={`relative cursor-pointer overflow-hidden border-2 p-4 transition-all ${
              isSelected
                ? 'border-brand-bright bg-brand-bright/5'
                : 'border-transparent hover:border-border'
            } ${isWinner ? 'ring-2 ring-brand-green' : ''}`}
            onClick={() => !voting && !isLocked && handleVote(i)}
          >
            {/* Vote bar background */}
            {totalVotes > 0 && (
              <div
                className="absolute inset-y-0 left-0 bg-brand-bright/5 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            )}

            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-brand-deep">
                    {formatDateRange(option.start, option.end)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {daysBetween(option.start, option.end)} days &middot;{' '}
                    {option.available_count}/{option.total_members} available
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-brand-deep">
                    {voteCounts[i]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {voteCounts[i] === 1 ? 'vote' : 'votes'}
                  </p>
                </div>
              </div>

              {voterNames[i].length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {voterNames[i].join(', ')}
                </p>
              )}

              {isWinner && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
                  Leading
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {/* Lock button for creator */}
      {isCreator && !isLocked && totalVotes > 0 && (
        <Button
          onClick={handleLock}
          disabled={locking}
          className="h-12 w-full rounded-xl bg-brand-green text-base font-semibold text-white shadow-md hover:bg-brand-green/90"
        >
          {locking ? 'Locking...' : 'Lock Dates 🎉'}
        </Button>
      )}
    </div>
  );
}
