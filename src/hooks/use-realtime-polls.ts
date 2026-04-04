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
      .subscribe();

    return () => { supabase.removeChannel(pollChannel); };
  }, [tripId]);

  useEffect(() => {
    // Subscribe to all poll_responses for polls in this trip.
    // Supabase filters don't support JOINs so we subscribe to all and filter client-side.
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
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(responseChannel); };
  }, [tripId]);

  return { polls, responses };
}
