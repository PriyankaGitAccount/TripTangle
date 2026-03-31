'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Availability } from '@/types';

export function useRealtimeAvailability(
  tripId: string,
  initialAvailability: Availability[]
) {
  const [availability, setAvailability] =
    useState<Availability[]>(initialAvailability);

  useEffect(() => {
    setAvailability(initialAvailability);
  }, [initialAvailability]);

  useEffect(() => {
    const channel = supabase
      .channel(`availability:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAvailability((prev) => {
              if (prev.some((a) => a.id === payload.new.id)) return prev;
              return [...prev, payload.new as Availability];
            });
          } else if (payload.eventType === 'UPDATE') {
            setAvailability((prev) =>
              prev.map((a) =>
                a.id === payload.new.id ? (payload.new as Availability) : a
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAvailability((prev) =>
              prev.filter((a) => a.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return availability;
}
