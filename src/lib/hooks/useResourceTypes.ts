import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { ResourceType } from '@/lib/types';

/**
 * useResourceTypes - Real-time listener for all active resource types.
 *
 * Subscribes to the `resourceTypes` collection filtered by `isActive`.
 * Sorting is done client-side to avoid requiring a composite Firestore index.
 * Uses Firestore `onSnapshot` for live updates.
 */
export function useResourceTypes() {
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const typesRef = collection(db, 'resourceTypes');
    // Only where() — sort client-side to avoid composite index requirement
    const q = query(typesRef, where('isActive', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as ResourceType)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setResourceTypes(results);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return {
    resourceTypes,
    loading,
    error,
  };
}
