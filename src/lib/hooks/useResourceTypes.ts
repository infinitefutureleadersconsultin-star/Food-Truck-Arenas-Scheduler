import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { ResourceType } from '@/lib/types';

/**
 * useResourceTypes - Real-time listener for all active resource types.
 *
 * Subscribes to the `resourceTypes` collection ordered by `sortOrder`.
 * Only returns types that are marked as active.
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
    const q = query(
      typesRef,
      where('isActive', '==', true),
      orderBy('sortOrder', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as ResourceType
        );
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
