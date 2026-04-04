'use client';

import type { DateOption, RecommendationData } from '@/types';
import { formatDateRange, daysBetween } from '@/lib/trip-utils';

interface RecommendationCardProps {
  recommendation: RecommendationData;
}

function ConfidenceBar({ value, light }: { value: number; light?: boolean }) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = pct >= 75 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-1.5 flex-1 rounded-full ${light ? 'bg-white/20' : 'bg-muted'}`}
      >
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${light ? 'text-white/80' : 'text-muted-foreground'}`}>
        {pct}%
      </span>
    </div>
  );
}

function MemberPips({
  available, maybe, total, light,
}: {
  available: number; maybe: number; total: number; light?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: total }).map((_, i) => {
        const isAvail = i < available;
        const isMaybe = !isAvail && i < available + maybe;
        return (
          <div
            key={i}
            className="h-2 w-2 rounded-full"
            style={{
              background: isAvail
                ? '#16A34A'
                : isMaybe
                ? '#D97706'
                : light
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(0,0,0,0.1)',
            }}
          />
        );
      })}
      <span className={`text-xs ml-1 ${light ? 'text-white/70' : 'text-muted-foreground'}`}>
        {available}/{total} free{maybe > 0 ? `, ${maybe} maybe` : ''}
      </span>
    </div>
  );
}

function OptionCard({
  option,
  rank,
  isPrimary,
}: {
  option: DateOption;
  rank: number;
  isPrimary: boolean;
}) {
  const label = rank === 1 ? '✦ BEST MATCH' : rank === 2 ? 'RUNNER UP' : `OPTION ${rank}`;

  if (isPrimary) {
    return (
      <div
        className="rounded-2xl p-5 text-white space-y-3"
        style={{
          background: 'linear-gradient(135deg, #9A3412 0%, #EA580C 100%)',
          boxShadow: '0 4px 24px rgba(234,88,12,0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-widest">
            {label}
          </span>
          <span className="text-xs text-white/50">{daysBetween(option.start, option.end)} days</span>
        </div>
        <div>
          <h3 className="text-2xl font-bold">{formatDateRange(option.start, option.end)}</h3>
        </div>
        <MemberPips available={option.available_count} maybe={option.maybe_count} total={option.total_members} light />
        <p className="text-sm leading-relaxed text-white/85">{option.summary}</p>
        {option.confidence !== undefined && (
          <div className="space-y-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wide">AI Confidence</span>
            <ConfidenceBar value={option.confidence} light />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-sm p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{daysBetween(option.start, option.end)} days</span>
      </div>
      <h3 className="text-base font-bold text-brand-deep">{formatDateRange(option.start, option.end)}</h3>
      <MemberPips available={option.available_count} maybe={option.maybe_count} total={option.total_members} />
      {option.confidence !== undefined && <ConfidenceBar value={option.confidence} />}
      {option.trade_off && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800 leading-relaxed">
          ⚖️ {option.trade_off}
        </div>
      )}
    </div>
  );
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { best, runner_up, alternatives = [], nudge } = recommendation;
  const allOptions: { option: DateOption; rank: number }[] = [
    { option: best, rank: 1 },
    { option: runner_up, rank: 2 },
    ...alternatives.map((opt, i) => ({ option: opt, rank: i + 3 })),
  ];

  return (
    <div className="space-y-3">
      {allOptions.map(({ option, rank }) => (
        <OptionCard
          key={`${option.start}-${option.end}`}
          option={option}
          rank={rank}
          isPrimary={rank === 1}
        />
      ))}

      {nudge && (
        <div className="rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-deep leading-relaxed">
          💬 {nudge}
        </div>
      )}
    </div>
  );
}
