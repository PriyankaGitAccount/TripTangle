'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Vote } from '@/types';

export function useRealtimeVotes(tripId: string, initialVotes: Vote[]) {
  const [votes, setVotes] = useState<Vote[]>(initialVotes);

  useEffect(() => {
    setVotes(initialVotes);
  }, [initialVotes]);

  useEffect(() => {
    const channel = supabase
      .channel(`votes:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVotes((prev) => {
              // Replace if same member voted again (upsert)
              const filtered = prev.filter(
                (v) => v.member_id !== payload.new.member_id
              );
              return [...filtered, payload.new as Vote];
            });
          } else if (payload.eventType === 'UPDATE') {
            setVotes((prev) =>
              prev.map((v) =>
                v.id === payload.new.id ? (payload.new as Vote) : v
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return votes;
}
