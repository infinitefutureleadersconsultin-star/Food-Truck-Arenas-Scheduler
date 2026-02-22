import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Announcement, AnnouncementType } from '@/lib/types';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

/**
 * Create a new announcement.
 */
export async function createAnnouncement(
  data: Omit<Announcement, 'id' | 'createdAt' | 'readBy'>
): Promise<string> {
  try {
    const docRef = await addDoc(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      {
        ...data,
        readBy: [],
        createdAt: Timestamp.now(),
      }
    );

    return docRef.id;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
}

/**
 * Get announcements with optional filters for type and active status.
 */
export async function getAnnouncements(
  options?: {
    type?: AnnouncementType;
    active?: boolean;
  }
): Promise<Announcement[]> {
  try {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    if (options?.type) {
      constraints.push(where('type', '==', options.type));
    }

    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      ...constraints
    );
    const snapshot = await getDocs(q);

    let announcements = snapshot.docs.map(
      (docSnap) =>
        ({ id: docSnap.id, ...docSnap.data() }) as Announcement
    );

    // Filter by active status client-side (requires comparing with current time)
    if (options?.active) {
      const now = Timestamp.now();
      announcements = announcements.filter(
        (a) => a.expiresAt === null || a.expiresAt > now
      );
    }

    return announcements;
  } catch (error) {
    console.error('Error getting announcements:', error);
    throw error;
  }
}

/**
 * Get all active (non-expired) announcements.
 */
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const now = Timestamp.now();

    return snapshot.docs
      .map(
        (docSnap) =>
          ({ id: docSnap.id, ...docSnap.data() }) as Announcement
      )
      .filter((a) => a.expiresAt === null || a.expiresAt > now);
  } catch (error) {
    console.error('Error getting active announcements:', error);
    throw error;
  }
}

/**
 * Mark an announcement as read by a specific user.
 * Uses arrayUnion to add the userId to the readBy array without duplicates.
 */
export async function markAnnouncementRead(
  announcementId: string,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, announcementId);
    await updateDoc(docRef, {
      readBy: arrayUnion(userId),
    });
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    throw error;
  }
}

/**
 * Delete an announcement.
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
}
