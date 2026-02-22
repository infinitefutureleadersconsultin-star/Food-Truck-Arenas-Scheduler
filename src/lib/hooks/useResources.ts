import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
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

    const constraints = typeId
      ? [where('typeId', '==', typeId), orderBy('name', 'asc')]
      : [orderBy('name', 'asc')];

    const q = query(resourcesRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Resource
        );
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
        // 1. Get all resources of this type that are in "available" status
        const allResources = await getDocuments<Resource>(
          'resources',
          where('typeId', '==', typeId),
          where('status', '==', 'available')
        );

        // 2. Get bookings that overlap with the requested window
        const overlapping = await getDocuments<{
          resources: { resourceId: string }[];
        }>(
          'bookings',
          where('date', '==', date),
          where('status', 'in', ['confirmed', 'checked_in', 'pending'])
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
