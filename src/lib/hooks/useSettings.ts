'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CommissarySettings } from '@/lib/types';
import * as settingsService from '@/lib/services/settingsService';

export function useSettings() {
  const [settings, setSettings] = useState<CommissarySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'commissary'),
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings({ id: 'commissary', ...snapshot.data() } as CommissarySettings);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<CommissarySettings>, updatedBy: string) => {
    await settingsService.updateSettings(updates, updatedBy);
  }, []);

  return { settings, loading, error, updateSettings };
}
