'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Member } from '@/types';

export function useRealtimeMembers(tripId: string, initialMembers: Member[]) {
  const [members, setMembers] = useState<Member[]>(initialMembers);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  useEffect(() => {
    const channel = supabase
      .channel(`members:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'members',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          setMembers((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Member];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'members',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === payload.new.id ? (payload.new as Member) : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return members;
}
