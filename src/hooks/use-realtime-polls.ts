'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Poll, PollResponse } from '@/types';

export function useRealtimePolls(
  tripId: string,
  initialPolls: Poll[],
  initialResponses: PollResponse[]
) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [responses, setResponses] = useState<PollResponse[]>(initialResponses);

  useEffect(() => { setPolls(initialPolls); }, [initialPolls]);
  useEffect(() => { setResponses(initialResponses); }, [initialResponses]);

  useEffect(() => {
    const pollChannel = supabase
      .channel(`polls:${tripId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'polls', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          setPolls((prev) => {
            if (prev.some((p) => p.id === payload.new.id)) return prev;
            return [payload.new as Poll, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'polls', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          setPolls((prev) =>
            prev.map((p) => (p.id === payload.new.id ? (payload.new as Poll) : p))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(pollChannel); };
  }, [tripId]);

  useEffect(() => {
    const responseChannel = supabase
      .channel(`poll_responses:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_responses' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setResponses((prev) => {
              if (prev.some((r) => r.id === payload.new.id)) return prev;
              return [...prev, payload.new as PollResponse];
            });
          } else if (payload.eventType === 'UPDATE') {
            setResponses((prev) =>
              prev.map((r) => (r.id === payload.new.id ? (payload.new as PollResponse) : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setResponses((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(responseChannel); };
  }, [tripId]);

  return { polls, setPolls, responses };
}
