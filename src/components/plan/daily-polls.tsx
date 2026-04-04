'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRealtimePolls } from '@/hooks/use-realtime-polls';
import type { Poll, PollResponse, Member } from '@/types';

function PollCard({
  poll,
  responses,
  members,
  currentMemberId,
  tripId,
}: {
  poll: Poll;
  responses: PollResponse[];
  members: Member[];
  currentMemberId: string | null;
  tripId: string;
}) {
  const [voting, setVoting] = useState(false);
  const pollResponses = responses.filter((r) => r.poll_id === poll.id);
  const myResponse = pollResponses.find((r) => r.member_id === currentMemberId);
  const totalVotes = pollResponses.length;

  async function vote(optionIndex: number) {
    if (!currentMemberId || voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: currentMemberId, option_index: optionIndex }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to record vote');
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card shadow-md overflow-hidden">
      <div className="px-4 py-3 bg-muted/30">
        <p className="text-sm font-semibold text-foreground">{poll.question}</p>
        {poll.poll_date && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{poll.poll_date}</p>
        )}
      </div>
      <div className="p-3 space-y-2">
        {poll.options.map((option, i) => {
          const count = pollResponses.filter((r) => r.option_index === i).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isVoted = myResponse?.option_index === i;

          return (
            <button
              key={i}
              onClick={() => vote(i)}
              disabled={voting}
              className={`relative w-full overflow-hidden rounded-xl px-4 py-2.5 text-left text-sm transition-all ${
                isVoted
                  ? 'bg-brand-bright/5 shadow-md font-semibold text-brand-bright'
                  : 'bg-background shadow-sm text-foreground hover:shadow-md'
              }`}
            >
              {/* Progress bar */}
              {totalVotes > 0 && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    isVoted ? 'bg-brand-bright/10' : 'bg-muted/50'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="truncate">{option}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {count > 0 ? `${count} (${pct}%)` : ''}
                  {isVoted && ' ✓'}
                </span>
              </span>
            </button>
          );
        })}
        <p className="text-[11px] text-muted-foreground pt-1">
          {totalVotes} of {members.length} voted
          {myResponse == null && currentMemberId && ' · Tap to vote'}
        </p>
      </div>
    </div>
  );
}

interface CreatePollFormProps {
  onSubmit: (question: string, options: string[], pollDate: string) => Promise<void>;
  onCancel: () => void;
}

function CreatePollForm({ onSubmit, onCancel }: CreatePollFormProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollDate, setPollDate] = useState('');
  const [loading, setLoading] = useState(false);

  function updateOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = options.filter((o) => o.trim());
    if (!question.trim() || filled.length < 2) return;
    setLoading(true);
    await onSubmit(question.trim(), filled, pollDate);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-card shadow-lg p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        New Poll
      </p>
      <input
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Beach or market today?"
        maxLength={200}
        className="w-full rounded-lg bg-background shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright"
      />
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={80}
              className="flex-1 rounded-lg bg-background shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-red-500 text-sm px-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ''])}
            className="text-xs text-brand-bright hover:underline"
          >
            + Add option
          </button>
        )}
      </div>
      <input
        type="date"
        value={pollDate}
        onChange={(e) => setPollDate(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-bright"
        placeholder="Poll date (optional)"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !question.trim() || options.filter((o) => o.trim()).length < 2}
          className="flex-1 rounded-xl bg-brand-bright py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-brand-bright/90 transition-colors"
        >
          {loading ? 'Creating…' : 'Create Poll'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-muted/30 shadow-sm px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface DailyPollsProps {
  tripId: string;
  currentMemberId: string | null;
  members: Member[];
  initialPolls: Poll[];
  initialResponses: PollResponse[];
}

export function DailyPolls({
  tripId,
  currentMemberId,
  members,
  initialPolls,
  initialResponses,
}: DailyPollsProps) {
  const { polls, responses } = useRealtimePolls(tripId, initialPolls, initialResponses);
  const [showForm, setShowForm] = useState(false);

  async function createPoll(question: string, options: string[], pollDate: string) {
    try {
      const res = await fetch(`/api/trips/${tripId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentMemberId,
          question,
          options,
          poll_date: pollDate || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Poll created!');
      setShowForm(false);
    } catch {
      toast.error('Failed to create poll');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-deep">Daily Polls</h2>
        {currentMemberId && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-brand-bright px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-bright/90 transition-colors"
          >
            + New Poll
          </button>
        )}
      </div>

      {showForm && (
        <CreatePollForm onSubmit={createPoll} onCancel={() => setShowForm(false)} />
      )}

      {polls.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center space-y-2">
          <div className="text-4xl">📊</div>
          <p className="text-sm font-semibold text-foreground">No polls yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Replace WhatsApp debates with quick group polls — beach or market, lunch or dinner, walk
            or taxi.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {polls.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            responses={responses}
            members={members}
            currentMemberId={currentMemberId}
            tripId={tripId}
          />
        ))}
      </div>
    </div>
  );
}
