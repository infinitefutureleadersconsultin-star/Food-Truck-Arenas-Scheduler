import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  Booking,
  CheckIn,
  CheckInMethod,
  CommissarySettings,
} from '@/lib/types';

const CHECKINS_COLLECTION = 'checkIns';
const BOOKINGS_COLLECTION = 'bookings';

/**
 * Check in a vendor for a booking.
 * Creates a check-in record and updates the booking status to 'checked_in'.
 */
export async function checkIn(
  bookingId: string,
  userId: string,
  method: CheckInMethod
): Promise<string> {
  try {
    const checkInId = await runTransaction(db, async (transaction) => {
      const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      const bookingSnap = await transaction.get(bookingRef);

      if (!bookingSnap.exists()) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      const booking = bookingSnap.data() as Booking;

      if (booking.userId !== userId && method !== 'admin') {
        throw new Error('You can only check in to your own bookings');
      }

      if (booking.status === 'cancelled') {
        throw new Error('Cannot check in to a cancelled booking');
      }

      if (booking.status === 'checked_in') {
        throw new Error('Already checked in to this booking');
      }

      if (booking.status === 'completed') {
        throw new Error('This booking is already completed');
      }

      const now = Timestamp.now();

      // Create the check-in record
      const checkInRef = doc(collection(db, CHECKINS_COLLECTION));
      transaction.set(checkInRef, {
        bookingId,
        userId,
        type: 'check_in',
        method,
        timestamp: now,
        assignedResources: booking.resources.map((r) => ({
          resourceId: r.resourceId,
          resourceName: r.resourceName,
        })),
        photoUrl: null,
      });

      // Update the booking status
      transaction.update(bookingRef, {
        status: 'checked_in',
        checkInTime: now,
        checkInMethod: method,
        updatedAt: now,
      });

      return checkInRef.id;
    });

    return checkInId;
  } catch (error) {
    console.error('Error checking in:', error);
    throw error;
  }
}

/**
 * Check out a vendor from a booking.
 * Creates a check-out record and updates the booking status to 'completed'.
 */
export async function checkOut(
  bookingId: string,
  userId: string,
  method: CheckInMethod
): Promise<string> {
  try {
    const checkOutId = await runTransaction(db, async (transaction) => {
      const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      const bookingSnap = await transaction.get(bookingRef);

      if (!bookingSnap.exists()) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      const booking = bookingSnap.data() as Booking;

      if (booking.userId !== userId && method !== 'admin') {
        throw new Error('You can only check out of your own bookings');
      }

      if (booking.status !== 'checked_in') {
        throw new Error('Must be checked in before checking out');
      }

      const now = Timestamp.now();

      // Create the check-out record
      const checkOutRef = doc(collection(db, CHECKINS_COLLECTION));
      transaction.set(checkOutRef, {
        bookingId,
        userId,
        type: 'check_out',
        method,
        timestamp: now,
        assignedResources: booking.resources.map((r) => ({
          resourceId: r.resourceId,
          resourceName: r.resourceName,
        })),
        photoUrl: null,
      });

      // Update the booking status
      transaction.update(bookingRef, {
        status: 'completed',
        checkOutTime: now,
        updatedAt: now,
      });

      return checkOutRef.id;
    });

    return checkOutId;
  } catch (error) {
    console.error('Error checking out:', error);
    throw error;
  }
}

/**
 * Get all check-in/check-out records for a specific booking.
 */
export async function getCheckInsForBooking(
  bookingId: string
): Promise<CheckIn[]> {
  try {
    // Only filter by bookingId — sort client-side to avoid composite index
    const q = query(
      collection(db, CHECKINS_COLLECTION),
      where('bookingId', '==', bookingId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as CheckIn)
      .sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() ?? 0;
        const bTime = b.timestamp?.toMillis?.() ?? 0;
        return aTime - bTime;
      });
  } catch (error) {
    console.error('Error getting check-ins for booking:', error);
    throw error;
  }
}

/**
 * Determine whether a booking is within the allowed check-in window.
 * The check-in window is defined in the commissary settings (in minutes before the start time).
 */
export function isWithinCheckInWindow(
  booking: Booking,
  settings: CommissarySettings
): boolean {
  try {
    const now = new Date();
    const windowMinutes = settings.checkInWindow || 30;

    // Parse the booking start time
    const [year, month, day] = booking.date.split('-').map(Number);
    const [hours, minutes] = booking.startTime.split(':').map(Number);

    const bookingStart = new Date(year, month - 1, day, hours, minutes);
    const windowStart = new Date(
      bookingStart.getTime() - windowMinutes * 60 * 1000
    );

    // Parse the booking end time for the window close
    const [endHours, endMinutes] = booking.endTime.split(':').map(Number);
    const bookingEnd = new Date(year, month - 1, day, endHours, endMinutes);

    return now >= windowStart && now <= bookingEnd;
  } catch (error) {
    console.error('Error checking check-in window:', error);
    return false;
  }
}
