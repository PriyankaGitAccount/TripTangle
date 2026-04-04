'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Expense } from '@/types';

export function useRealtimeExpenses(tripId: string, initialExpenses: Expense[]) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  useEffect(() => {
    const channel = supabase
      .channel(`expenses:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setExpenses((prev) => {
              if (prev.some((e) => e.id === payload.new.id)) return prev;
              return [...prev, payload.new as Expense];
            });
          } else if (payload.eventType === 'DELETE') {
            setExpenses((prev) => prev.filter((e) => e.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setExpenses((prev) => prev.map((e) => (e.id === payload.new.id ? (payload.new as Expense) : e)));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  return { expenses, setExpenses };
}
