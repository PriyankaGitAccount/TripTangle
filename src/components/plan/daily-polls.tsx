'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRealtimePolls } from '@/hooks/use-realtime-polls';
import type { Poll, PollResponse, Member } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────

function getWinningIndex(pollResponses: PollResponse[], optionCount: number): number | null {
  if (pollResponses.length === 0) return null;
  const counts = Array.from({ length: optionCount }, (_, i) =>
    pollResponses.filter((r) => r.option_index === i).length
  );
  const max = Math.max(...counts);
  if (max === 0) return null;
  return counts.indexOf(max);
}

// ── Poll card ─────────────────────────────────────────────────────

function PollCard({
  poll,
  responses,
  members,
  currentMemberId,
  tripId,
  onPollUpdate,
}: {
  poll: Poll;
  responses: PollResponse[];
  members: Member[];
  currentMemberId: string | null;
  tripId: string;
  onPollUpdate: (updated: Poll) => void;
}) {
  const [voting, setVoting] = useState(false);
  const [locking, setLocking] = useState(false);

  const pollResponses = responses.filter((r) => r.poll_id === poll.id);
  const myResponses = pollResponses.filter((r) => r.member_id === currentMemberId);
  const myOptionIndexes = new Set(myResponses.map((r) => r.option_index));

  // For single-select: count distinct voters. For multiselect: count distinct voters too.
  const distinctVoters = new Set(pollResponses.map((r) => r.member_id)).size;
  const isCreator = poll.created_by_member_id === currentMemberId;

  // Compute live winner from responses (for display before locking)
  const liveWinnerIndex = getWinningIndex(pollResponses, poll.options.length);
  const lockedWinnerIndex = poll.winning_option_index ?? null;
  const isLocked = lockedWinnerIndex !== null;

  async function vote(optionIndex: number) {
    if (!currentMemberId || voting || isLocked) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentMemberId,
          option_index: optionIndex,
          is_multiselect: poll.is_multiselect,
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to record vote');
    } finally {
      setVoting(false);
    }
  }

  async function lockAnswer(optionIndex: number) {
    if (!currentMemberId || locking) return;
    setLocking(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/polls/${poll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: currentMemberId, winning_option_index: optionIndex }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed');
      }
      const { poll: updated } = await res.json();
      onPollUpdate(updated);
      toast.success('Answer locked!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to lock answer');
    } finally {
      setLocking(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/90 shadow-md overflow-hidden border border-white/50">
      {/* Header */}
      <div className="px-4 py-3" style={{ background: 'rgba(237,228,206,0.7)' }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#2d1f14' }}>{poll.question}</p>
            {poll.poll_date && (
              <p className="text-[11px] mt-0.5" style={{ color: '#7a6350' }}>{poll.poll_date}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {poll.is_multiselect && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                Multi-select
              </span>
            )}
            {isLocked && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                🔒 Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="p-3 space-y-2">
        {/* Winner banner */}
        {isLocked && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-1"
            style={{ background: 'rgba(212,98,42,0.08)', border: '1px solid rgba(212,98,42,0.2)' }}>
            <span className="text-base">🏆</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#d4622a' }}>Final Answer</p>
              <p className="text-sm font-semibold" style={{ color: '#2d1f14' }}>
                {poll.options[lockedWinnerIndex!]}
              </p>
            </div>
          </div>
        )}

        {poll.options.map((option, i) => {
          const count = pollResponses.filter((r) => r.option_index === i).length;
          const totalForPct = poll.is_multiselect
            ? Math.max(distinctVoters, 1)
            : Math.max(pollResponses.length, 1);
          const pct = pollResponses.length > 0 ? Math.round((count / totalForPct) * 100) : 0;
          const isSelected = myOptionIndexes.has(i);
          const isWinner = isLocked && lockedWinnerIndex === i;
          const isLiveLeader = !isLocked && liveWinnerIndex === i && pollResponses.length > 0;

          return (
            <button
              key={i}
              onClick={() => vote(i)}
              disabled={voting || isLocked}
              className={`relative w-full overflow-hidden rounded-xl px-4 py-2.5 text-left text-sm transition-all ${
                isWinner
                  ? 'ring-2 ring-emerald-400 shadow-md'
                  : isSelected
                  ? 'shadow-md'
                  : isLocked
                  ? 'opacity-60'
                  : 'shadow-sm hover:shadow-md'
              }`}
              style={{
                background: isSelected
                  ? 'rgba(212,98,42,0.07)'
                  : 'rgba(255,255,255,0.8)',
              }}
            >
              {/* Progress fill */}
              {pollResponses.length > 0 && (
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isSelected
                      ? 'rgba(212,98,42,0.12)'
                      : 'rgba(90,64,48,0.06)',
                  }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {/* Checkbox for multiselect, radio-dot for single */}
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                      poll.is_multiselect ? 'rounded-sm border' : 'rounded-full border'
                    } transition-all ${
                      isSelected
                        ? 'border-transparent'
                        : 'border-gray-300'
                    }`}
                    style={isSelected ? { background: '#d4622a' } : {}}
                  >
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span
                    className="truncate font-medium"
                    style={{ color: isWinner ? '#16a34a' : isSelected ? '#d4622a' : '#2d1f14' }}
                  >
                    {option}
                  </span>
                  {isLiveLeader && !isLocked && (
                    <span className="text-[10px] font-bold text-amber-600 shrink-0">↑ leading</span>
                  )}
                  {isWinner && <span className="text-sm shrink-0">🏆</span>}
                </span>
                <span className="shrink-0 text-xs" style={{ color: '#7a6350' }}>
                  {count > 0 ? `${count} (${pct}%)` : ''}
                </span>
              </span>
            </button>
          );
        })}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
          <p className="text-[11px]" style={{ color: '#7a6350' }}>
            {distinctVoters} of {members.length} voted
            {!isLocked && myOptionIndexes.size === 0 && currentMemberId && ' · Tap to vote'}
            {!isLocked && poll.is_multiselect && myOptionIndexes.size > 0 && ` · ${myOptionIndexes.size} selected`}
          </p>

          {/* Lock answer button — poll creator only, not yet locked, has votes */}
          {isCreator && !isLocked && liveWinnerIndex !== null && (
            <button
              onClick={() => lockAnswer(liveWinnerIndex)}
              disabled={locking}
              className="rounded-xl px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #d4622a, #e07b3a)' }}
            >
              {locking ? 'Locking…' : `🔒 Lock "${poll.options[liveWinnerIndex]}"`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create poll form ──────────────────────────────────────────────

interface CreatePollFormProps {
  onSubmit: (question: string, options: string[], pollDate: string, isMultiselect: boolean) => Promise<void>;
  onCancel: () => void;
}

function CreatePollForm({ onSubmit, onCancel }: CreatePollFormProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollDate, setPollDate] = useState('');
  const [isMultiselect, setIsMultiselect] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = options.filter((o) => o.trim());
    if (!question.trim() || filled.length < 2) return;
    setLoading(true);
    await onSubmit(question.trim(), filled, pollDate, isMultiselect);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white/90 shadow-lg p-4 space-y-3 border border-white/50">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7a6350' }}>
        New Poll
      </p>

      <input
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Beach or market today?"
        maxLength={200}
        className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white shadow-sm"
        style={{ color: '#2d1f14' }}
      />

      {/* Multiselect toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
        <div
          onClick={() => setIsMultiselect((v) => !v)}
          className={`relative h-5 w-9 rounded-full transition-all ${isMultiselect ? '' : 'bg-gray-200'}`}
          style={isMultiselect ? { background: '#d4622a' } : {}}
        >
          <div
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all"
            style={{ left: isMultiselect ? '18px' : '2px' }}
          />
        </div>
        <span className="text-xs font-medium" style={{ color: '#5a4a38' }}>
          Allow multiple selections
        </span>
      </label>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={80}
              className="flex-1 rounded-xl bg-white shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ color: '#2d1f14' }}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-red-500 text-sm px-1"
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
            className="text-xs font-semibold hover:underline"
            style={{ color: '#d4622a' }}
          >
            + Add option
          </button>
        )}
      </div>

      <input
        type="date"
        value={pollDate}
        onChange={(e) => setPollDate(e.target.value)}
        className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2"
        style={{ color: '#7a6350', borderColor: '#c8b898' }}
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !question.trim() || options.filter((o) => o.trim()).length < 2}
          className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ background: 'linear-gradient(135deg, #d4622a, #e07b3a)' }}
        >
          {loading ? 'Creating…' : 'Create Poll'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm transition-colors bg-white/80 shadow-sm"
          style={{ color: '#7a6350' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────

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
  const { polls, responses, setPolls } = useRealtimePolls(tripId, initialPolls, initialResponses);
  const [showForm, setShowForm] = useState(false);

  async function createPoll(question: string, options: string[], pollDate: string, isMultiselect: boolean) {
    try {
      const res = await fetch(`/api/trips/${tripId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentMemberId,
          question,
          options,
          poll_date: pollDate || null,
          is_multiselect: isMultiselect,
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
        <h2 className="text-lg font-bold" style={{ color: '#2d1f14' }}>Daily Polls</h2>
        {currentMemberId && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #d4622a, #e07b3a)' }}
          >
            + New Poll
          </button>
        )}
      </div>

      {showForm && (
        <CreatePollForm onSubmit={createPoll} onCancel={() => setShowForm(false)} />
      )}

      {polls.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed py-14 text-center space-y-2 bg-white/50"
          style={{ borderColor: '#c8b898' }}>
          <div className="text-4xl">📊</div>
          <p className="text-sm font-semibold" style={{ color: '#2d1f14' }}>No polls yet</p>
          <p className="text-xs max-w-xs mx-auto" style={{ color: '#7a6350' }}>
            Replace WhatsApp debates with quick group polls — beach or market, lunch or dinner,
            walk or taxi.
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
            onPollUpdate={(updated) =>
              setPolls((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            }
          />
        ))}
      </div>
    </div>
  );
}
