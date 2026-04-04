'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { formatDateRange, daysBetween } from '@/lib/trip-utils';
import type { DateOption, RecommendationData, Vote, Member, FallbackMonths } from '@/types';

interface AiVotePanelProps {
  tripId: string;
  memberId: string | null;
  recommendation: RecommendationData;
  votes: Vote[];
  members: Member[];
  isCreator: boolean;
  isLocked: boolean;
  onLock: (start: string, end: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 75 ? '#16A34A' : value >= 50 ? '#D97706' : '#DC2626';
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{value}%</span>
    </div>
  );
}

function MemberPips({ available, maybe, total }: { available: number; maybe: number; total: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full"
          style={{
            background: i < available ? '#16A34A' : i < available + maybe ? '#D97706' : 'rgba(0,0,0,0.1)',
          }}
        />
      ))}
    </div>
  );
}

const OPTION_TYPE_LABELS: Record<string, string> = {
  exact: 'PERFECT MATCH',
  partial: 'BEST AVAILABLE',
  maybe_organiser: "ORGANISER'S MAYBE",
  maybe_member: "MEMBER'S MAYBE",
  maybe_group: 'GROUP COMPROMISE',
};

interface OptionRowProps {
  option: DateOption;
  rank: number;
  optionIndex: number;
  myVoteIndex: number | null;
  voteCount: number;
  totalVotes: number;
  memberCount: number;
  voterNames: string[];
  isLeading: boolean;
  isLocked: boolean;
  voting: boolean;
  onVote: (index: number) => void;
}

function OptionRow({
  option, rank, optionIndex, myVoteIndex, voteCount, totalVotes,
  memberCount, voterNames, isLeading, isLocked, voting, onVote,
}: OptionRowProps) {
  const isMyVote = myVoteIndex === optionIndex;
  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
  const majority = Math.floor(memberCount / 2) + 1;
  const nearMajority = voteCount === majority - 1 && memberCount > 1;

  const rankLabel = option.option_type
    ? OPTION_TYPE_LABELS[option.option_type] ?? `OPTION ${rank}`
    : rank === 1 ? 'BEST MATCH' : rank === 2 ? 'RUNNER UP' : `OPTION ${rank}`;
  const rankColor =
    rank === 1
      ? { bg: 'rgba(234,88,12,0.06)', border: 'rgba(234,88,12,0.2)', badge: '#9A3412' }
      : { bg: 'transparent', border: 'rgba(0,0,0,0.06)', badge: '#94a3b8' };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: rankColor.bg,
        border: `1.5px solid ${isMyVote ? '#EA580C' : rankColor.border}`,
        boxShadow: isMyVote ? '0 0 0 2px rgba(234,88,12,0.12)' : undefined,
      }}
    >
      {/* Vote progress bar */}
      {totalVotes > 0 && (
        <div
          className="h-0.5 transition-all duration-500"
          style={{ width: `${pct}%`, background: rank === 1 ? '#EA580C' : '#94a3b8' }}
        />
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[9px] font-bold tracking-widest" style={{ color: rankColor.badge }}>
              {rankLabel}
            </span>
            <p className="text-sm font-bold text-foreground leading-tight">
              {formatDateRange(option.start, option.end)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {daysBetween(option.start, option.end)} days
            </p>
          </div>

          {/* Vote button */}
          {!isLocked && (
            <button
              onClick={() => onVote(optionIndex)}
              disabled={voting}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                isMyVote
                  ? 'bg-brand-bright text-white'
                  : 'bg-muted text-muted-foreground hover:bg-brand-bright/10 hover:text-brand-bright'
              }`}
            >
              {isMyVote ? '✓ Voted' : 'Vote'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <MemberPips
            available={option.available_count}
            maybe={option.maybe_count}
            total={option.total_members}
          />
          <span className="text-[10px] text-muted-foreground">
            {option.available_count}/{option.total_members} free
            {option.maybe_count > 0 && `, ${option.maybe_count} maybe`}
          </span>
        </div>

        {option.justification && (
          <p className="text-[11px] text-muted-foreground leading-relaxed italic">
            {option.justification}
          </p>
        )}

        {option.confidence !== undefined && <ConfidenceBar value={option.confidence} />}

        {option.trade_off && (
          <p className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 leading-relaxed">
            ⚖️ {option.trade_off}
          </p>
        )}

        {/* Vote count + near-majority hint */}
        {(voterNames.length > 0 || isLeading || nearMajority) && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {isLeading && voteCount > 0 && (
              <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[9px] font-bold text-brand-green uppercase tracking-wide">
                Leading · {voteCount}/{memberCount} votes
              </span>
            )}
            {nearMajority && !isLeading && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase tracking-wide">
                1 vote away from auto-lock
              </span>
            )}
            {voterNames.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{voterNames.join(', ')}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiVotePanel({
  tripId, memberId, recommendation, votes, members, isCreator, isLocked, onLock, onRefresh, refreshing,
}: AiVotePanelProps) {
  const [voting, setVoting] = useState(false);
  const [locking, setLocking] = useState(false);

  const { best, runner_up, alternatives = [], nudge, fallback } = recommendation;
  // Deduplicate: remove options with identical start+end to a previous option
  const rawOptions: (DateOption | undefined)[] = [best, runner_up, ...alternatives];
  const allOptions: DateOption[] = rawOptions.filter(
    (opt, idx, arr): opt is DateOption =>
      !!opt && arr.findIndex((o) => o?.start === opt.start && o?.end === opt.end) === idx
  );
  // If the only "option" is a fallback placeholder (available_count 0), show fallback UI instead
  const isFallbackMode = !!fallback && allOptions.length === 1 && allOptions[0].available_count === 0;

  const myVote = votes.find((v) => v.member_id === memberId);
  const myVoteIndex = myVote?.option_index ?? null;

  const voteCounts = allOptions.map((_, i) => votes.filter((v) => v.option_index === i).length);
  const totalVotes = votes.length;
  const maxVotes = Math.max(...voteCounts, 0);
  const winnerIndex = maxVotes > 0 ? voteCounts.indexOf(maxVotes) : 0;

  const majority = Math.floor(members.length / 2) + 1;
  const allVoted = totalVotes >= members.length;
  // Deadlock: everyone voted but no option has majority
  const isDeadlock = allVoted && maxVotes < majority;

  const voterNamesPerOption = allOptions.map((_, i) =>
    votes
      .filter((v) => v.option_index === i)
      .map((v) => members.find((m) => m.id === v.member_id)?.display_name)
      .filter(Boolean) as string[]
  );

  async function handleVote(optionIndex: number) {
    if (!memberId || isLocked || voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, option_index: optionIndex }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Auto-lock triggered by consensus
      if (data.auto_locked) {
        onLock(data.locked_start, data.locked_end);
        toast.success('Majority reached — dates auto-locked! 🎉');
      }
    } catch {
      toast.error('Failed to cast vote');
    } finally {
      setVoting(false);
    }
  }

  async function handleLock(optionIdx: number) {
    const winner = allOptions[optionIdx];
    if (!winner) return;
    setLocking(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, start: winner.start, end: winner.end }),
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

  // ── Fallback: no availability overlap found ────────────────────────────────
  if (isFallbackMode && fallback) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-orange-50 px-3 py-3 flex items-start gap-2">
          <span className="text-base">😕</span>
          <p className="text-xs text-orange-800 font-medium leading-relaxed">{fallback.message}</p>
        </div>
        {fallback.months.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Great times to visit
            </p>
            {fallback.months.map((m, i) => (
              <div key={i} className="rounded-xl bg-card shadow-sm px-3 py-2.5 space-y-0.5">
                <p className="text-sm font-bold text-foreground">{m.name}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{m.reason}</p>
              </div>
            ))}
          </div>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="w-full rounded-xl py-2.5 text-xs font-semibold text-brand-bright bg-brand-bright/5 hover:bg-brand-bright/10 transition-colors disabled:opacity-40"
          >
            {refreshing ? '⏳ Recalculating…' : '↻ Try again'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Status banner ── */}
      {!isLocked && (() => {
        if (myVoteIndex === null) {
          return (
            <div className="rounded-xl bg-brand-bright/5 shadow-sm px-3 py-2.5 flex items-start gap-2">
              <span className="text-base">📣</span>
              <p className="text-xs text-brand-bright font-medium leading-relaxed">
                Pick your preferred dates below. If {majority} or more members choose the same option, dates auto-lock instantly.
              </p>
            </div>
          );
        }
        if (isDeadlock) {
          return (
            <div className="rounded-xl bg-orange-50 shadow-sm px-3 py-2.5 flex items-start gap-2">
              <span className="text-base">⚖️</span>
              <p className="text-xs text-orange-800 font-medium leading-relaxed">
                Everyone voted — no clear majority.{' '}
                {isCreator ? 'You can now lock the winning option.' : 'Waiting for the trip creator to decide.'}
              </p>
            </div>
          );
        }
        if (myVoteIndex !== null) {
          return (
            <div className="rounded-xl bg-amber-50 shadow-sm px-3 py-2.5 flex items-start gap-2">
              <span className="text-base">⏳</span>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                {totalVotes}/{members.length} voted · need {majority} votes on one option to auto-lock.
              </p>
            </div>
          );
        }
      })()}

      {/* ── Recalculate button ── */}
      {!isLocked && onRefresh && (
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-[11px] font-semibold text-muted-foreground hover:text-brand-bright transition-colors disabled:opacity-40"
          >
            {refreshing ? '⏳ Recalculating…' : '↻ Recalculate dates'}
          </button>
        </div>
      )}

      {/* ── Option rows ── */}
      <div className="space-y-2">
        {allOptions.map((option, i) => (
          <OptionRow
            key={`option-${i}-${option.start}-${option.end}`}
            option={option}
            rank={i + 1}
            optionIndex={i}
            myVoteIndex={myVoteIndex}
            voteCount={voteCounts[i]}
            totalVotes={totalVotes}
            memberCount={members.length}
            voterNames={voterNamesPerOption[i]}
            isLeading={voteCounts[i] === maxVotes && maxVotes > 0 && i === winnerIndex}
            isLocked={isLocked}
            voting={voting}
            onVote={handleVote}
          />
        ))}
      </div>

      {/* Nudge */}
      {nudge && !isLocked && (
        <p className="text-[11px] text-brand-deep/70 bg-brand-light rounded-xl px-3 py-2 leading-relaxed">
          💬 {nudge}
        </p>
      )}

      {/* ── Creator lock controls ── */}
      {isCreator && !isLocked && (
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest pt-1">
            Creator controls
          </p>

          {isDeadlock ? (
            /* Deadlock — show all options for creator to pick */
            <div className="space-y-1.5">
              <p className="text-xs text-orange-700 font-medium">
                No majority — choose which dates to lock:
              </p>
              {allOptions.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleLock(i)}
                  disabled={locking}
                  className="w-full flex items-center justify-between rounded-xl bg-card shadow-sm px-3 py-2.5 text-sm hover:shadow-md hover:bg-brand-bright/5 transition-all disabled:opacity-60"
                >
                  <span className="font-medium text-foreground">
                    {formatDateRange(option.start, option.end)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {voteCounts[i]} vote{voteCounts[i] !== 1 ? 's' : ''} · Lock →
                  </span>
                </button>
              ))}
            </div>
          ) : (
            /* Normal — lock the leading option */
            <button
              onClick={() => handleLock(winnerIndex >= 0 ? winnerIndex : 0)}
              disabled={locking}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)' }}
            >
              {locking
                ? 'Locking…'
                : totalVotes > 0
                  ? `🎉 Lock Leading Dates (${maxVotes} vote${maxVotes !== 1 ? 's' : ''})`
                  : '🔒 Lock Best Match Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
