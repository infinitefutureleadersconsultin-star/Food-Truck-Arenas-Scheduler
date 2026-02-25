import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getDocuments } from '@/lib/firebase/firestore';
import type { Resource } from '@/lib/types';

/**
 * useResources - Real-time listener for resources, optionally filtered by typeId.
 *
 * Uses Firestore `onSnapshot` so that any changes to the resources collection
 * are automatically reflected in the UI.
 */
export function useResources(typeId?: string) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const resourcesRef = collection(db, 'resources');

    // Only use where() filter — sort client-side to avoid composite index requirement
    const constraints = typeId
      ? [where('typeId', '==', typeId)]
      : [];

    const q = query(resourcesRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Resource)
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        setResources(results);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [typeId]);

  return {
    resources,
    loading,
    error,
  };
}

/**
 * useAvailableResources - Fetch resources of a given type that are available
 * during a specific date/time window.
 *
 * This performs a one-time query: it fetches all resources of the given type
 * and then filters out those that overlap with existing bookings in the
 * requested time window.
 */
export function useAvailableResources(
  typeId: string,
  date: string,
  startTime: string,
  endTime: string
) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!typeId || !date || !startTime || !endTime) {
      setResources([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAvailable() {
      setLoading(true);
      setError(null);

      try {
        // 1. Get all resources of this type — filter status client-side
        //    to avoid composite index requirement
        const allResourcesRaw = await getDocuments<Resource>(
          'resources',
          where('typeId', '==', typeId)
        );
        const allResources = allResourcesRaw.filter(
          (r) => r.status === 'available'
        );

        // 2. Get bookings for the date — filter status client-side
        const overlappingRaw = await getDocuments<{
          resources: { resourceId: string }[];
          status: string;
        }>(
          'bookings',
          where('date', '==', date)
        );
        const activeStatuses = new Set(['confirmed', 'checked_in', 'pending']);
        const overlapping = overlappingRaw.filter(
          (b) => activeStatuses.has(b.status)
        );

        // Collect resource IDs that are booked during the window
        const bookedResourceIds = new Set<string>();
        for (const booking of overlapping) {
          // A booking overlaps if its time range intersects with the requested range
          const bData = booking as unknown as {
            startTime: string;
            endTime: string;
            resources: { resourceId: string }[];
          };

          const overlaps =
            bData.startTime < endTime && bData.endTime > startTime;

          if (overlaps && bData.resources) {
            for (const r of bData.resources) {
              bookedResourceIds.add(r.resourceId);
            }
          }
        }

        // 3. Filter to only available resources
        const available = allResources.filter(
          (r) => !bookedResourceIds.has(r.id)
        );

        if (!cancelled) {
          setResources(available);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to fetch available resources.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAvailable();

    return () => {
      cancelled = true;
    };
  }, [typeId, date, startTime, endTime]);

  return {
    resources,
    loading,
    error,
  };
}
