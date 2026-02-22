'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  LogOut,
  Clock,
  MapPin,
  QrCode,
  CalendarX,
  Timer,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBookings } from '@/lib/hooks/useBookings';
import { updateBooking } from '@/lib/services/bookingService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import { formatDate, formatTime, parseTime } from '@/lib/utils/dateUtils';
import type { Booking, BookingStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// useCheckin hook
// ---------------------------------------------------------------------------

function useCheckin(booking: Booking | null) {
  const { user } = useAuthContext();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkIn = useCallback(async () => {
    if (!booking || !user) return;
    setChecking(true);
    setError(null);
    try {
      await updateBooking(booking.id, {
        status: 'checked_in' as BookingStatus,
        checkInTime: Timestamp.now(),
        checkInMethod: 'button',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in.');
    } finally {
      setChecking(false);
    }
  }, [booking, user]);

  const checkOut = useCallback(async () => {
    if (!booking || !user) return;
    setChecking(true);
    setError(null);
    try {
      await updateBooking(booking.id, {
        status: 'completed' as BookingStatus,
        checkOutTime: Timestamp.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check out.');
    } finally {
      setChecking(false);
    }
  }, [booking, user]);

  return { checkIn, checkOut, checking, error };
}

// ---------------------------------------------------------------------------
// Countdown timer
// ---------------------------------------------------------------------------

function useCountdown(endTimeStr: string, dateStr: string) {
  const [remaining, setRemaining] = useState<string>('');

  useEffect(() => {
    function calc() {
      const now = new Date();
      const { hours, minutes } = parseTime(endTimeStr);
      const end = new Date(dateStr + 'T00:00:00');
      end.setHours(hours, minutes, 0, 0);

      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setRemaining('Booking ended');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setRemaining(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
      );
    }

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endTimeStr, dateStr]);

  return remaining;
}

// ---------------------------------------------------------------------------
// QR Code component (uses qrcode.react when available, falls back to placeholder)
// ---------------------------------------------------------------------------

function BookingQRCode({ bookingId }: { bookingId: string }) {
  const [QRCodeComponent, setQRCodeComponent] = useState<React.ComponentType<{
    value: string;
    size: number;
    level: string;
  }> | null>(null);

  useEffect(() => {
    import('qrcode.react')
      .then((mod) => {
        // qrcode.react exports QRCodeSVG and QRCodeCanvas
        const Comp = (mod as any).QRCodeSVG ?? (mod as any).QRCodeCanvas ?? (mod as any).default;
        if (Comp) setQRCodeComponent(() => Comp);
      })
      .catch(() => {
        // Not installed -- keep null
      });
  }, []);

  const qrValue = `commissary://check-in/${bookingId}`;

  if (QRCodeComponent) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-6">
        <QRCodeComponent value={qrValue} size={200} level="H" />
      </div>
    );
  }

  // Fallback when qrcode.react is not installed
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-8 py-12">
      <QrCode className="mb-3 h-16 w-16 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">QR Code</p>
      <p className="mt-1 max-w-[200px] break-all text-center text-xs text-gray-400">
        {qrValue}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Check-In Page
// ---------------------------------------------------------------------------

export default function CheckInPage() {
  const { user } = useAuthContext();
  const today = new Date().toISOString().split('T')[0];

  const { bookings, loading, error: fetchError, refetch } = useBookings(
    user ? { userId: user.uid, date: today } : undefined,
  );

  // Find the most relevant booking for today
  const todaysBooking = useMemo(() => {
    const active = bookings.filter(
      (b) =>
        b.status === 'confirmed' ||
        b.status === 'checked_in' ||
        b.status === 'pending',
    );
    // Prefer checked-in, then confirmed, then pending
    const checkedIn = active.find((b) => b.status === 'checked_in');
    if (checkedIn) return checkedIn;
    const confirmed = active.find((b) => b.status === 'confirmed');
    if (confirmed) return confirmed;
    return active[0] ?? null;
  }, [bookings]);

  const { checkIn, checkOut, checking, error: checkinError } = useCheckin(todaysBooking);
  const countdown = useCountdown(
    todaysBooking?.endTime ?? '00:00',
    todaysBooking?.date ?? today,
  );

  // Check-in window logic
  const isWithinCheckInWindow = useMemo(() => {
    if (!todaysBooking) return false;
    const now = new Date();
    const { hours, minutes } = parseTime(todaysBooking.startTime);
    const bookingStart = new Date();
    bookingStart.setHours(hours, minutes, 0, 0);
    // Allow check-in 30 minutes before start
    const windowStart = new Date(bookingStart.getTime() - 30 * 60 * 1000);
    return now >= windowStart;
  }, [todaysBooking]);

  // Handle successful actions by refetching
  const handleCheckIn = useCallback(async () => {
    await checkIn();
    refetch();
  }, [checkIn, refetch]);

  const handleCheckOut = useCallback(async () => {
    await checkOut();
    refetch();
  }, [checkOut, refetch]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{fetchError}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No booking for today
  if (!todaysBooking) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Check In</h1>
        <EmptyState
          icon={CalendarX}
          title="No booking for today"
          description="You do not have any bookings scheduled for today."
          action={{
            label: 'Book a Table',
            onClick: () => {
              window.location.href = '/book';
            },
          }}
        />
      </div>
    );
  }

  const isCheckedIn = todaysBooking.status === 'checked_in';

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check In</h1>
        <p className="mt-1 text-sm text-gray-500">
          {formatDate(todaysBooking.date, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Booking Details</CardTitle>
            <StatusBadge status={todaysBooking.status} type="booking" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {formatTime(todaysBooking.startTime)} -{' '}
                {formatTime(todaysBooking.endTime)}
              </p>
              <p className="text-xs text-gray-500">Scheduled time</p>
            </div>
          </div>

          <Separator />

          {/* Assigned Resources */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Assigned Resources
            </h3>
            {todaysBooking.resources.length === 0 ? (
              <p className="text-sm text-gray-500">No resources assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {todaysBooking.resources.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {r.resourceName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.resourceTypeName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <BookingQRCode bookingId={todaysBooking.id} />
        </CardContent>
      </Card>

      {/* Action area */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          {checkinError && (
            <p className="text-sm text-red-600">{checkinError}</p>
          )}

          {isCheckedIn ? (
            <>
              {/* Countdown timer */}
              <div className="flex items-center gap-2 text-gray-600">
                <Timer className="h-5 w-5" />
                <span className="text-sm">Time remaining:</span>
                <span className="font-mono text-lg font-bold text-gray-900">
                  {countdown}
                </span>
              </div>

              <Button
                size="lg"
                variant="destructive"
                className="h-16 w-full max-w-xs text-lg"
                onClick={handleCheckOut}
                disabled={checking}
              >
                <LogOut className="mr-2 h-6 w-6" />
                {checking ? 'Checking Out...' : 'Check Out'}
              </Button>
            </>
          ) : !isWithinCheckInWindow ? (
            <div className="text-center">
              <Clock className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-600">
                Check-in available at{' '}
                <span className="font-semibold">
                  {formatTime(todaysBooking.startTime)}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                (30 minutes before your booking start)
              </p>
            </div>
          ) : (
            <Button
              size="lg"
              className="h-16 w-full max-w-xs bg-green-600 text-lg hover:bg-green-700"
              onClick={handleCheckIn}
              disabled={checking}
            >
              <CheckCircle2 className="mr-2 h-6 w-6" />
              {checking ? 'Checking In...' : 'Check In'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
