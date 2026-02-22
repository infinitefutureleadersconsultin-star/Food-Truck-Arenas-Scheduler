import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  Booking,
  BookingStatus,
  BookingResource,
  RecurringPattern,
} from '@/lib/types';

const BOOKINGS_COLLECTION = 'bookings';
const RESOURCES_COLLECTION = 'resources';
const RESOURCE_TYPES_COLLECTION = 'resourceTypes';

/**
 * Create a new booking with transaction-based availability checking and resource allocation.
 */
export async function createBooking(
  bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const bookingId = await runTransaction(db, async (transaction) => {
      // Check availability for each requested resource type
      const allocatedResources: BookingResource[] = [];

      for (const [resourceTypeId, requestedCount] of Object.entries(
        bookingData.resourceRequests
      )) {
        // Get the resource type
        const typeRef = doc(db, RESOURCE_TYPES_COLLECTION, resourceTypeId);
        const typeSnap = await transaction.get(typeRef);

        if (!typeSnap.exists()) {
          throw new Error(`Resource type ${resourceTypeId} not found`);
        }

        const resourceType = typeSnap.data();

        // Query existing bookings for this resource type on the same date
        // that overlap with the requested time
        const existingBookingsQuery = query(
          collection(db, BOOKINGS_COLLECTION),
          where('date', '==', bookingData.date),
          where('status', 'in', ['pending', 'confirmed', 'checked_in'])
        );
        const existingBookingsSnap = await getDocs(existingBookingsQuery);

        let bookedCount = 0;
        existingBookingsSnap.forEach((docSnap) => {
          const existing = docSnap.data();
          // Check time overlap
          if (
            existing.startTime < bookingData.endTime &&
            existing.endTime > bookingData.startTime
          ) {
            const existingRequests = existing.resourceRequests || {};
            bookedCount += existingRequests[resourceTypeId] || 0;
          }
        });

        const available = resourceType.totalQuantity - bookedCount;
        if (available < requestedCount) {
          throw new Error(
            `Not enough ${resourceType.name} available. Requested: ${requestedCount}, Available: ${available}`
          );
        }

        // If resources are tracked individually, allocate specific ones
        if (resourceType.trackIndividually) {
          const resourcesQuery = query(
            collection(db, RESOURCES_COLLECTION),
            where('typeId', '==', resourceTypeId),
            where('status', '==', 'available')
          );
          const resourcesSnap = await getDocs(resourcesQuery);

          // Find resources not booked during this time
          const bookedResourceIds = new Set<string>();
          existingBookingsSnap.forEach((docSnap) => {
            const existing = docSnap.data();
            if (
              existing.startTime < bookingData.endTime &&
              existing.endTime > bookingData.startTime
            ) {
              (existing.resources || []).forEach(
                (r: BookingResource) => {
                  if (r.resourceTypeId === resourceTypeId) {
                    bookedResourceIds.add(r.resourceId);
                  }
                }
              );
            }
          });

          const availableResources = resourcesSnap.docs.filter(
            (d) => !bookedResourceIds.has(d.id)
          );

          if (availableResources.length < requestedCount) {
            throw new Error(
              `Not enough individual ${resourceType.name} resources available`
            );
          }

          // Allocate the first N available resources
          for (let i = 0; i < requestedCount; i++) {
            const res = availableResources[i];
            allocatedResources.push({
              resourceId: res.id,
              resourceTypeId,
              resourceName: res.data().name,
              resourceTypeName: resourceType.name,
            });
          }
        } else {
          // For non-individually tracked resources, create a generic allocation
          for (let i = 0; i < requestedCount; i++) {
            allocatedResources.push({
              resourceId: `${resourceTypeId}_pool`,
              resourceTypeId,
              resourceName: `${resourceType.name} #${i + 1}`,
              resourceTypeName: resourceType.name,
            });
          }
        }
      }

      const now = Timestamp.now();
      const newBookingRef = doc(collection(db, BOOKINGS_COLLECTION));

      transaction.set(newBookingRef, {
        ...bookingData,
        resources: allocatedResources,
        createdAt: now,
        updatedAt: now,
      });

      return newBookingRef.id;
    });

    return bookingId;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

/**
 * Get a single booking by ID.
 */
export async function getBooking(id: string): Promise<Booking | null> {
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as Booking;
  } catch (error) {
    console.error('Error getting booking:', error);
    throw error;
  }
}

/**
 * Get bookings for a specific user with optional filters.
 */
export async function getBookingsByUser(
  userId: string,
  options?: {
    status?: BookingStatus[];
    dateRange?: { start: string; end: string };
  }
): Promise<Booking[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('date', 'desc'),
    ];

    if (options?.status && options.status.length > 0) {
      constraints.push(where('status', 'in', options.status));
    }

    const q = query(collection(db, BOOKINGS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    let bookings = snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Booking
    );

    // Filter by date range client-side (Firestore limits compound queries)
    if (options?.dateRange) {
      bookings = bookings.filter(
        (b) =>
          b.date >= options.dateRange!.start &&
          b.date <= options.dateRange!.end
      );
    }

    return bookings;
  } catch (error) {
    console.error('Error getting bookings by user:', error);
    throw error;
  }
}

/**
 * Get all bookings for a specific date, optionally filtered by status.
 */
export async function getBookingsByDate(
  date: string,
  status?: BookingStatus[]
): Promise<Booking[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('date', '==', date),
      orderBy('startTime', 'asc'),
    ];

    if (status && status.length > 0) {
      constraints.push(where('status', 'in', status));
    }

    const q = query(collection(db, BOOKINGS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Booking
    );
  } catch (error) {
    console.error('Error getting bookings by date:', error);
    throw error;
  }
}

/**
 * Update a booking with transaction safety.
 */
export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, BOOKINGS_COLLECTION, id);
      const docSnap = await transaction.get(docRef);

      if (!docSnap.exists()) {
        throw new Error(`Booking ${id} not found`);
      }

      transaction.update(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
}

/**
 * Cancel a booking. Records who cancelled and the reason.
 */
export async function cancelBooking(
  id: string,
  userId: string,
  reason: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, BOOKINGS_COLLECTION, id);
      const docSnap = await transaction.get(docRef);

      if (!docSnap.exists()) {
        throw new Error(`Booking ${id} not found`);
      }

      const booking = docSnap.data() as Booking;

      if (booking.status === 'cancelled') {
        throw new Error('Booking is already cancelled');
      }

      if (booking.status === 'completed') {
        throw new Error('Cannot cancel a completed booking');
      }

      const now = Timestamp.now();

      transaction.update(docRef, {
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: userId,
        cancelReason: reason,
        updatedAt: now,
      });
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
}

/**
 * Get all bookings that include a specific resource on a given date.
 */
export async function getBookingsForResource(
  resourceId: string,
  date: string
): Promise<Booking[]> {
  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      where('date', '==', date),
      where('status', 'in', ['pending', 'confirmed', 'checked_in'])
    );
    const snapshot = await getDocs(q);

    // Filter client-side for bookings containing the specific resource
    return snapshot.docs
      .map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Booking
      )
      .filter((booking) =>
        booking.resources.some((r) => r.resourceId === resourceId)
      );
  } catch (error) {
    console.error('Error getting bookings for resource:', error);
    throw error;
  }
}

/**
 * Create multiple bookings based on a recurring pattern.
 * Returns the array of created booking IDs.
 */
export async function createRecurringBookings(
  baseBooking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
  pattern: RecurringPattern
): Promise<string[]> {
  try {
    const recurringId = doc(collection(db, BOOKINGS_COLLECTION)).id;
    const bookingIds: string[] = [];

    // Generate dates based on the pattern
    const dates = generateRecurringDates(baseBooking.date, pattern);

    for (const date of dates) {
      try {
        const bookingId = await createBooking({
          ...baseBooking,
          date,
          isRecurring: true,
          recurringId,
          recurringPattern: pattern,
        });
        bookingIds.push(bookingId);
      } catch (error) {
        // Log the error but continue creating other bookings
        console.warn(
          `Could not create recurring booking for date ${date}:`,
          error
        );
      }
    }

    return bookingIds;
  } catch (error) {
    console.error('Error creating recurring bookings:', error);
    throw error;
  }
}

/**
 * Generate dates for a recurring booking pattern.
 */
function generateRecurringDates(
  startDate: string,
  pattern: RecurringPattern
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(pattern.endDate + 'T00:00:00');
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();

    if (pattern.daysOfWeek.length === 0 || pattern.daysOfWeek.includes(dayOfWeek)) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    switch (pattern.frequency) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 1);
        // If we've checked all days in the week, skip to the next week start
        if (
          pattern.daysOfWeek.length > 0 &&
          dayOfWeek === Math.max(...pattern.daysOfWeek)
        ) {
          const daysUntilNextWeekStart =
            7 - dayOfWeek + Math.min(...pattern.daysOfWeek);
          current.setDate(current.getDate() + daysUntilNextWeekStart - 1);
        }
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 1);
        if (
          pattern.daysOfWeek.length > 0 &&
          dayOfWeek === Math.max(...pattern.daysOfWeek)
        ) {
          const daysUntilBiweekStart =
            14 - dayOfWeek + Math.min(...pattern.daysOfWeek);
          current.setDate(current.getDate() + daysUntilBiweekStart - 1);
        }
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}
