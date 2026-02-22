'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import * as waitlistService from '@/lib/services/waitlistService';
import { WaitlistEntry } from '@/lib/types';

export function useWaitlist(date?: string) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      if (date) {
        const data = await waitlistService.getWaitlistForDate(date);
        setEntries(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch waitlist');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addToWaitlist = useCallback(async (entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'status' | 'notifiedAt'>) => {
    await waitlistService.addToWaitlist(entry);
    await fetchEntries();
  }, [fetchEntries]);

  const removeFromWaitlist = useCallback(async (id: string) => {
    await waitlistService.removeFromWaitlist(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, loading, error, addToWaitlist, removeFromWaitlist, refetch: fetchEntries };
}

export function useUserWaitlist() {
  const { user } = useAuthContext();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await waitlistService.getUserWaitlistEntries(user.uid);
        setEntries(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return { entries, loading };
}
