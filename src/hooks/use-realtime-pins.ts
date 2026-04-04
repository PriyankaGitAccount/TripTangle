'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { MapPin } from '@/types';

export function useRealtimePins(tripId: string, initialPins: MapPin[]) {
  const [pins, setPins] = useState<MapPin[]>(initialPins);

  useEffect(() => {
    setPins(initialPins);
  }, [initialPins]);

  useEffect(() => {
    const channel = supabase
      .channel(`map_pins:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'map_pins', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPins((prev) => {
              if (prev.some((p) => p.id === payload.new.id)) return prev;
              return [...prev, payload.new as MapPin];
            });
          } else if (payload.eventType === 'DELETE') {
            setPins((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  return { pins, setPins };
}
