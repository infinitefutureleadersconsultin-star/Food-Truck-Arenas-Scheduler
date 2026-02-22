'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createBooking } from '@/lib/services/bookingService';
import { formatDate, formatTime, timeToMinutes } from '@/lib/utils/dateUtils';
import { formatDuration } from '@/lib/utils/formatters';
import {
  DEFAULT_BOOKING_RULES,
} from '@/lib/utils/constants';
import type { Booking } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import {
  Repeat,
  Calendar,
  Clock,
  Package,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuickRebookProps {
  lastBooking: Booking;
  onRebooked?: (bookingId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickRebook({ lastBooking, onRebooked }: QuickRebookProps) {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationMinutes =
    timeToMinutes(lastBooking.endTime) -
    timeToMinutes(lastBooking.startTime);

  const resourceCount = Object.values(lastBooking.resourceRequests).reduce(
    (sum, v) => sum + v,
    0,
  );

  const handleRebook = async () => {
    setError(null);

    // Validate date
    const now = new Date();
    const bookDate = new Date(date + 'T00:00:00');
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (bookDate < today) {
      setError('Cannot book a date in the past.');
      return;
    }

    // Check if the time is still in the future for today
    if (bookDate.getTime() === today.getTime()) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (timeToMinutes(lastBooking.startTime) <= nowMinutes) {
        setError('Start time must be in the future for today.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const startTimestamp = Timestamp.fromDate(
        new Date(`${date}T${lastBooking.startTime}:00`),
      );
      const endTimestamp = Timestamp.fromDate(
        new Date(`${date}T${lastBooking.endTime}:00`),
      );

      const bookingId = await createBooking({
        userId: lastBooking.userId,
        userName: lastBooking.userName,
        businessName: lastBooking.businessName,
        date,
        startTime: lastBooking.startTime,
        endTime: lastBooking.endTime,
        startTimestamp,
        endTimestamp,
        status: DEFAULT_BOOKING_RULES.autoConfirm ? 'confirmed' : 'pending',
        resources: [],
        resourceRequests: { ...lastBooking.resourceRequests },
        isRecurring: false,
        recurringId: null,
        recurringPattern: null,
        checkInTime: null,
        checkOutTime: null,
        checkInMethod: null,
        notes: lastBooking.notes,
        adminNotes: '',
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: '',
      });

      setSubmitted(true);
      onRebooked?.(bookingId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create booking.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Booking created for {formatDate(date)}!
            </p>
            <p className="text-xs text-green-600">
              {formatTime(lastBooking.startTime)} -{' '}
              {formatTime(lastBooking.endTime)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Repeat className="h-4.5 w-4.5 text-primary" />
          Book Same as Last Time
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Last booking config summary */}
        <div className="rounded-lg bg-gray-50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>
              {formatTime(lastBooking.startTime)} -{' '}
              {formatTime(lastBooking.endTime)}
            </span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {formatDuration(durationMinutes)}
            </Badge>
          </div>

          {resourceCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(lastBooking.resourceRequests).map(
                ([typeId, count]) => (
                  <div
                    key={typeId}
                    className="flex items-center gap-1 text-xs text-gray-600"
                  >
                    <Package className="h-3 w-3" />
                    <span>
                      {count}x {typeId}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {lastBooking.notes && (
            <p className="text-xs text-gray-500 truncate">
              Note: {lastBooking.notes}
            </p>
          )}
        </div>

        {/* Date picker */}
        <div className="space-y-2">
          <Label htmlFor="rebook-date">New Date</Label>
          <Input
            id="rebook-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Rebook button */}
        <Button
          onClick={handleRebook}
          disabled={submitting}
          className="w-full gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Rebook for {formatDate(date)}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
