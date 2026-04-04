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

  function patchAvailability(record: Availability) {
    setAvailability((prev) => {
      const idx = prev.findIndex(
        (a) => a.member_id === record.member_id && a.date === record.date
      );
      if (idx >= 0) return prev.map((a, i) => (i === idx ? record : a));
      return [...prev, record];
    });
  }

  function removeAvailability(memberId: string, date: string) {
    setAvailability((prev) =>
      prev.filter((a) => !(a.member_id === memberId && a.date === date))
    );
  }

  return { availability, patchAvailability, removeAvailability };
}
