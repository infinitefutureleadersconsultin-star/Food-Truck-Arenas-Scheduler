import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { WaitlistEntry, WaitlistStatus } from '@/lib/types';

const WAITLIST_COLLECTION = 'waitlist';

/**
 * Add a new entry to the waitlist.
 */
export async function addToWaitlist(
  entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'notifiedAt' | 'status'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, WAITLIST_COLLECTION), {
      ...entry,
      status: 'waiting' as WaitlistStatus,
      notifiedAt: null,
      createdAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    throw error;
  }
}

/**
 * Get all waitlist entries for a specific date, ordered by creation time.
 */
export async function getWaitlistForDate(
  date: string
): Promise<WaitlistEntry[]> {
  try {
    const q = query(
      collection(db, WAITLIST_COLLECTION),
      where('date', '==', date),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as WaitlistEntry
    );
  } catch (error) {
    console.error('Error getting waitlist for date:', error);
    throw error;
  }
}

/**
 * Get all waitlist entries for a specific user.
 */
export async function getUserWaitlistEntries(
  userId: string
): Promise<WaitlistEntry[]> {
  try {
    const q = query(
      collection(db, WAITLIST_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as WaitlistEntry
    );
  } catch (error) {
    console.error('Error getting user waitlist entries:', error);
    throw error;
  }
}

/**
 * Remove an entry from the waitlist.
 */
export async function removeFromWaitlist(id: string): Promise<void> {
  try {
    const docRef = doc(db, WAITLIST_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error removing from waitlist:', error);
    throw error;
  }
}

/**
 * Find waitlist entries that match a newly available time slot.
 * Returns entries where the preferred time overlaps with the available window.
 */
export async function notifyWaitlistedVendors(
  date: string,
  startTime: string,
  endTime: string
): Promise<WaitlistEntry[]> {
  try {
    const q = query(
      collection(db, WAITLIST_COLLECTION),
      where('date', '==', date),
      where('status', '==', 'waiting')
    );
    const snapshot = await getDocs(q);

    const now = Timestamp.now();

    // Filter for entries whose preferred time overlaps the available window
    const matchingEntries = snapshot.docs
      .map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as WaitlistEntry
      )
      .filter(
        (entry) =>
          entry.preferredStartTime < endTime &&
          entry.preferredEndTime > startTime
      );

    // Update matching entries to 'notified' status
    for (const entry of matchingEntries) {
      const entryRef = doc(db, WAITLIST_COLLECTION, entry.id);
      await updateDoc(entryRef, {
        status: 'notified' as WaitlistStatus,
        notifiedAt: now,
      });
    }

    return matchingEntries;
  } catch (error) {
    console.error('Error notifying waitlisted vendors:', error);
    throw error;
  }
}

/**
 * Update the status of a waitlist entry.
 */
export async function updateWaitlistStatus(
  id: string,
  status: WaitlistStatus
): Promise<void> {
  try {
    const docRef = doc(db, WAITLIST_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Waitlist entry ${id} not found`);
    }

    const updates: Record<string, unknown> = { status };

    if (status === 'notified') {
      updates.notifiedAt = Timestamp.now();
    }

    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating waitlist status:', error);
    throw error;
  }
}
