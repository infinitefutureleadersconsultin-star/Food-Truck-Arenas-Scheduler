import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getDocument, getDocuments } from '@/lib/firebase/firestore';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Booking, BookingStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Options type for the main useBookings hook
// ---------------------------------------------------------------------------
interface UseBookingsOptions {
  userId?: string;
  date?: string;
  status?: BookingStatus;
}

/**
 * useBookings - Fetch a filtered list of bookings.
 *
 * Accepts optional filters for userId, date (YYYY-MM-DD), and status.
 * Performs an initial fetch and exposes a manual `refetch` function.
 */
export function useBookings(options?: UseBookingsOptions) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const constraints: QueryConstraint[] = [];

      if (options?.userId) {
        constraints.push(where('userId', '==', options.userId));
      }
      if (options?.date) {
        constraints.push(where('date', '==', options.date));
      }
      if (options?.status) {
        constraints.push(where('status', '==', options.status));
      }

      constraints.push(orderBy('date', 'desc'));

      const results = await getDocuments<Booking>('bookings', ...constraints);
      setBookings(results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch bookings.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [options?.userId, options?.date, options?.status]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings,
  };
}

/**
 * useBooking - Fetch a single booking by its ID.
 */
export function useBooking(bookingId: string | null) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getDocument<Booking>('bookings', bookingId);
      setBooking(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch booking.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  return {
    booking,
    loading,
    error,
    refetch: fetchBooking,
  };
}

/**
 * useUserBookings - Convenience hook that fetches bookings for the current
 * authenticated user.
 */
export function useUserBookings() {
  const { user } = useAuthContext();
  return useBookings(user ? { userId: user.uid } : undefined);
}

/**
 * useTodaysBookings - Real-time listener for all bookings on a specific date.
 *
 * Uses Firestore `onSnapshot` so the data stays in sync automatically.
 * Defaults to today's date (YYYY-MM-DD) when no date is provided.
 */
export function useTodaysBookings(date?: string) {
  const targetDate =
    date ?? new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('date', '==', targetDate),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Booking
        );
        setBookings(results);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetDate]);

  return {
    bookings,
    loading,
    error,
  };
}
