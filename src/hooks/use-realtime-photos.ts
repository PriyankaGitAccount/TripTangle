'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { TripPhoto } from '@/types';

export function useRealtimePhotos(tripId: string, initialPhotos: TripPhoto[]) {
  const [photos, setPhotos] = useState<TripPhoto[]>(initialPhotos);

  useEffect(() => {
    const channel = supabase
      .channel(`trip_photos:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_photos', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPhotos((prev) => {
              if (prev.some((p) => p.id === payload.new.id)) return prev;
              return [payload.new as TripPhoto, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setPhotos((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  return { photos, setPhotos };
}
