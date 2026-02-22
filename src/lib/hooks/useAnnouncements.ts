import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Announcement } from '@/lib/types';

/**
 * useAnnouncements - Real-time listener for announcements.
 *
 * When `active` is true (default), only announcements that have not yet
 * expired are returned. Pass `false` to retrieve all announcements.
 *
 * Uses Firestore `onSnapshot` for live updates.
 */
export function useAnnouncements(active: boolean = true) {
  const { user } = useAuthContext();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const announcementsRef = collection(db, 'announcements');

    // Build query constraints
    const constraints = active
      ? [orderBy('createdAt', 'desc')]
      : [orderBy('createdAt', 'desc')];

    const q = query(announcementsRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let results = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Announcement
        );

        // Client-side filter for active announcements (not yet expired)
        if (active) {
          const now = Timestamp.now();
          results = results.filter(
            (a) => a.expiresAt === null || a.expiresAt > now
          );
        }

        setAnnouncements(results);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [active]);

  /**
   * Mark an announcement as read by the current user.
   * Adds the user's UID to the `readBy` array.
   */
  const markRead = useCallback(
    async (announcementId: string) => {
      if (!user) return;

      try {
        const announcementRef = doc(db, 'announcements', announcementId);
        await updateDoc(announcementRef, {
          readBy: arrayUnion(user.uid),
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to mark announcement as read.';
        setError(message);
      }
    },
    [user]
  );

  return {
    announcements,
    loading,
    error,
    markRead,
  };
}
