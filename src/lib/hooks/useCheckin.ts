import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getDocument } from '@/lib/firebase/firestore';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Booking, CheckIn, CheckInMethod } from '@/lib/types';

/** How many minutes before the booking start time a vendor may check in. */
const CHECK_IN_WINDOW_MINUTES = 30;

/**
 * useCheckin - Manage check-in / check-out for a specific booking.
 *
 * Fetches the booking, determines whether the user can check in or out
 * based on the current time, and exposes `checkIn` / `checkOut` actions.
 */
export function useCheckin(bookingId: string | null) {
  const { user } = useAuthContext();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the booking
  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await getDocument<Booking>('bookings', bookingId!);
        if (!cancelled) {
          setBooking(result);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load booking.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // ---- Derived state ----
  const isCheckedIn = booking?.status === 'checked_in';

  /**
   * Whether the current time falls within the allowed check-in window.
   * Vendors can check in starting CHECK_IN_WINDOW_MINUTES before the
   * booking start time and up until the booking end time.
   */
  const canCheckIn = (() => {
    if (!booking || booking.status !== 'confirmed') return false;

    const now = new Date();
    const [startHour, startMin] = booking.startTime.split(':').map(Number);
    const [endHour, endMin] = booking.endTime.split(':').map(Number);

    const bookingDate = new Date(booking.date + 'T00:00:00');

    const startDate = new Date(bookingDate);
    startDate.setHours(startHour, startMin, 0, 0);

    const endDate = new Date(bookingDate);
    endDate.setHours(endHour, endMin, 0, 0);

    const windowOpen = new Date(
      startDate.getTime() - CHECK_IN_WINDOW_MINUTES * 60 * 1000
    );

    return now >= windowOpen && now <= endDate;
  })();

  /**
   * Whether the vendor can check out (must already be checked in and the
   * booking date must be today).
   */
  const canCheckOut = (() => {
    if (!booking || booking.status !== 'checked_in') return false;

    const today = new Date().toISOString().split('T')[0];
    return booking.date === today;
  })();

  /**
   * Perform a check-in for this booking.
   */
  const checkIn = useCallback(
    async (method: CheckInMethod = 'button') => {
      if (!booking || !bookingId || !user) return;

      setLoading(true);
      setError(null);

      try {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
          status: 'checked_in',
          checkInTime: serverTimestamp(),
          checkInMethod: method,
          updatedAt: serverTimestamp(),
        });

        // Create a check-in record
        const checkInData: Omit<CheckIn, 'id'> = {
          bookingId,
          userId: user.uid,
          type: 'check_in',
          method,
          timestamp: Timestamp.now(),
          assignedResources: booking.resources.map((r) => ({
            resourceId: r.resourceId,
            resourceName: r.resourceName,
          })),
          photoUrl: null,
        };

        await addDoc(collection(db, 'checkIns'), checkInData);

        // Update local state optimistically
        setBooking((prev) =>
          prev
            ? { ...prev, status: 'checked_in' as const, checkInMethod: method }
            : null
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Check-in failed.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [booking, bookingId, user]
  );

  /**
   * Perform a check-out for this booking.
   */
  const checkOut = useCallback(
    async (method: CheckInMethod = 'button') => {
      if (!booking || !bookingId || !user) return;

      setLoading(true);
      setError(null);

      try {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
          status: 'completed',
          checkOutTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Create a check-out record
        const checkOutData: Omit<CheckIn, 'id'> = {
          bookingId,
          userId: user.uid,
          type: 'check_out',
          method,
          timestamp: Timestamp.now(),
          assignedResources: booking.resources.map((r) => ({
            resourceId: r.resourceId,
            resourceName: r.resourceName,
          })),
          photoUrl: null,
        };

        await addDoc(collection(db, 'checkIns'), checkOutData);

        // Update local state optimistically
        setBooking((prev) =>
          prev ? { ...prev, status: 'completed' as const } : null
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Check-out failed.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [booking, bookingId, user]
  );

  return {
    checkIn,
    checkOut,
    isCheckedIn,
    loading,
    error,
    canCheckIn,
    canCheckOut,
    booking,
  };
}
