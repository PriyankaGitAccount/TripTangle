'use client';

import type { Member, Availability } from '@/types';

interface MemberListProps {
  members: Member[];
  availability: Availability[];
  currentMemberId: string | null;
}

const AVATAR_COLORS = [
  '#9A3412', '#EA580C', '#16A34A', '#D97706',
  '#8E44AD', '#E91E8C', '#0D9488', '#DC2626',
];

export function MemberList({ members, availability, currentMemberId }: MemberListProps) {
  const submittedIds = new Set(availability.map((a) => a.member_id));
  const submittedCount = members.filter((m) => submittedIds.has(m.id)).length;
  const pct = members.length > 0 ? Math.round((submittedCount / members.length) * 100) : 0;
  const allSubmitted = submittedCount === members.length;

  return (
    <div className="space-y-3">
      {/* Status */}
      <div className="flex items-center justify-end">
        <span
          className={`text-xs font-semibold ${allSubmitted ? 'text-brand-green' : 'text-muted-foreground'}`}
        >
          {allSubmitted ? '✓ All submitted' : `${submittedCount} / ${members.length} submitted`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: allSubmitted
              ? '#16A34A'
              : 'linear-gradient(90deg, #EA580C, #D97706)',
          }}
        />
      </div>

      {/* Member rows */}
      <div className="space-y-2">
        {members.map((member, i) => {
          const submitted = submittedIds.has(member.id);
          const isMe = member.id === currentMemberId;
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];

          return (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar */}
                <div
                  className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: color }}
                >
                  {member.display_name[0].toUpperCase()}
                </div>
                {/* Name */}
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">
                    {member.display_name}
                    {isMe && (
                      <span className="ml-1 text-xs text-muted-foreground font-normal">(you)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Status pill */}
              <div
                className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  submitted
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${submitted ? 'bg-brand-green' : 'bg-muted-foreground/40'}`}
                />
                {submitted ? 'Submitted' : 'Pending'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Waiting hint */}
      {!allSubmitted && (
        <p className="text-xs text-muted-foreground pt-1">
          Waiting for{' '}
          {members
            .filter((m) => !submittedIds.has(m.id))
            .map((m) => m.display_name)
            .join(', ')}{' '}
          to submit their dates.
        </p>
      )}
    </div>
  );
}
