import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
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
 *
 * Sorting is performed client-side to avoid requiring Firestore composite
 * indexes that may not be deployed.
 */
export function useBookings(options?: UseBookingsOptions) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use at most one where() to avoid composite index requirement.
      // Filter the rest client-side.
      const constraints: QueryConstraint[] = [];

      if (options?.userId) {
        constraints.push(where('userId', '==', options.userId));
      }

      let results = await getDocuments<Booking>('bookings', ...constraints);

      // Client-side filters
      if (options?.date) {
        results = results.filter((b) => b.date === options.date);
      }
      if (options?.status) {
        results = results.filter((b) => b.status === options.status);
      }

      results.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
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
 *
 * Sorting is performed client-side to avoid requiring a composite index.
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
    // Only filter by date — sort client-side to avoid composite index requirement
    const q = query(
      bookingsRef,
      where('date', '==', targetDate)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Booking)
          .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
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
