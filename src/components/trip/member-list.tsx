'use client';

import type { Member, Availability } from '@/types';
import { Badge } from '@/components/ui/badge';

interface MemberListProps {
  members: Member[];
  availability: Availability[];
  currentMemberId: string | null;
}

const AVATAR_COLORS = [
  'bg-brand-deep',
  'bg-brand-bright',
  'bg-brand-green',
  'bg-brand-amber',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
];

export function MemberList({
  members,
  availability,
  currentMemberId,
}: MemberListProps) {
  const membersWithSubmission = members.map((m) => ({
    ...m,
    hasSubmitted: availability.some((a) => a.member_id === m.id),
    isCurrentUser: m.id === currentMemberId,
  }));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Members ({members.length})
      </h3>
      <div className="flex flex-wrap gap-2">
        {membersWithSubmission.map((member, i) => (
          <div
            key={member.id}
            className="flex items-center gap-2 rounded-full bg-card py-1.5 pl-1.5 pr-3 shadow-sm ring-1 ring-border"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
            >
              {member.display_name[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium">
              {member.display_name}
              {member.isCurrentUser && (
                <span className="text-muted-foreground"> (you)</span>
              )}
            </span>
            {member.hasSubmitted ? (
              <Badge
                variant="secondary"
                className="bg-brand-green/10 text-brand-green text-xs"
              >
                Done
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Pending
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
