'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeSlotPicker } from './TimeSlotPicker';
import { ResourceSelector } from './ResourceSelector';
import { useAuth } from '@/lib/hooks/useAuth';
import { createBooking } from '@/lib/services/bookingService';
import {
  getResourceTypes,
  getResources,
} from '@/lib/services/resourceService';
import { getBookingsByDate } from '@/lib/services/bookingService';
import { bookingSchema } from '@/lib/utils/validation';
import {
  DEFAULT_OPERATING_HOURS,
  DEFAULT_BOOKING_RULES,
} from '@/lib/utils/constants';
import { formatDate, formatTime, timeToMinutes } from '@/lib/utils/dateUtils';
import { formatDuration } from '@/lib/utils/formatters';
import type { ResourceType, Booking } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import {
  Calendar,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingFormProps {
  initialDate?: Date;
  initialTableId?: string;
  onSuccess?: (bookingId: string) => void;
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingForm({
  initialDate,
  initialTableId,
  onSuccess,
  onCancel,
}: BookingFormProps) {
  const { userData } = useAuth();

  // ---- Form state ----
  const [date, setDate] = useState(
    (initialDate ?? new Date()).toISOString().split('T')[0],
  );
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedResources, setSelectedResources] = useState<
    Record<string, number>
  >(() => {
    if (initialTableId) {
      return { [initialTableId]: 1 };
    }
    return {};
  });
  const [notes, setNotes] = useState('');

  // ---- Data state ----
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // ---- UI state ----
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const dateObj = useMemo(() => new Date(date + 'T00:00:00'), [date]);

  // ---- Load resource types + bookings on date change ----
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoadingData(true);
      try {
        const [types, bookings] = await Promise.all([
          getResourceTypes(),
          getBookingsByDate(date, ['pending', 'confirmed', 'checked_in']),
        ]);

        if (cancelled) return;
        setResourceTypes(types);
        setExistingBookings(bookings);

        // Compute availability
        const avail: Record<string, number> = {};
        for (const t of types) {
          if (startTime && endTime) {
            const bookedCount = bookings
              .filter(
                (b) => b.startTime < endTime && b.endTime > startTime,
              )
              .reduce(
                (sum, b) => sum + (b.resourceRequests[t.id] ?? 0),
                0,
              );
            avail[t.id] = Math.max(0, t.totalQuantity - bookedCount);
          } else {
            avail[t.id] = t.totalQuantity;
          }
        }
        setAvailabilityMap(avail);
      } catch {
        // Best-effort
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [date, startTime, endTime]);

  // ---- Validation ----
  const validate = useCallback((): boolean => {
    setErrors({});
    setGeneralError(null);

    try {
      bookingSchema.parse({
        date,
        startTime,
        endTime,
        resourceRequests: selectedResources,
        notes,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          fieldErrors[path] = issue.message;
        }
        setErrors(fieldErrors);
        return false;
      }
    }

    // Additional validation
    const now = new Date();
    const bookDate = new Date(date + 'T00:00:00');
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (bookDate < today) {
      setGeneralError('Cannot book a date in the past.');
      return false;
    }

    if (bookDate.getTime() === today.getTime()) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (timeToMinutes(startTime) <= nowMinutes) {
        setGeneralError('Start time must be in the future.');
        return false;
      }
    }

    // Duration limits
    const dur = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (dur < DEFAULT_BOOKING_RULES.minDurationMinutes) {
      setGeneralError(
        `Minimum booking duration is ${formatDuration(DEFAULT_BOOKING_RULES.minDurationMinutes)}.`,
      );
      return false;
    }
    if (dur > DEFAULT_BOOKING_RULES.maxDurationMinutes) {
      setGeneralError(
        `Maximum booking duration is ${formatDuration(DEFAULT_BOOKING_RULES.maxDurationMinutes)}.`,
      );
      return false;
    }

    return true;
  }, [date, startTime, endTime, selectedResources, notes]);

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!userData) {
      setGeneralError('You must be logged in to create a booking.');
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      const startTimestamp = Timestamp.fromDate(
        new Date(`${date}T${startTime}:00`),
      );
      const endTimestamp = Timestamp.fromDate(
        new Date(`${date}T${endTime}:00`),
      );

      const bookingId = await createBooking({
        userId: userData.id,
        userName: userData.displayName,
        businessName: userData.businessName,
        date,
        startTime,
        endTime,
        startTimestamp,
        endTimestamp,
        status: DEFAULT_BOOKING_RULES.autoConfirm ? 'confirmed' : 'pending',
        resources: [],
        resourceRequests: selectedResources,
        isRecurring: false,
        recurringId: null,
        recurringPattern: null,
        checkInTime: null,
        checkOutTime: null,
        checkInMethod: null,
        notes,
        adminNotes: '',
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: '',
      });

      setSubmitted(true);
      onSuccess?.(bookingId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create booking.';
      setGeneralError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success state ----
  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Booking Created!
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(date)}, {formatTime(startTime)} -{' '}
              {formatTime(endTime)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Loading state ----
  if (loadingData && resourceTypes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5" />
            New Booking
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="booking-date">Date</Label>
            <Input
              id="booking-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.date && (
              <p className="text-xs text-red-600">{errors.date}</p>
            )}
          </div>

          <Separator />

          {/* Time */}
          <TimeSlotPicker
            date={dateObj}
            startTime={startTime}
            endTime={endTime}
            onStartChange={setStartTime}
            onEndChange={setEndTime}
            operatingHours={DEFAULT_OPERATING_HOURS}
            existingBookings={existingBookings}
            minDurationMinutes={DEFAULT_BOOKING_RULES.minDurationMinutes}
            maxDurationMinutes={DEFAULT_BOOKING_RULES.maxDurationMinutes}
          />
          {errors.startTime && (
            <p className="text-xs text-red-600">{errors.startTime}</p>
          )}
          {errors.endTime && (
            <p className="text-xs text-red-600">{errors.endTime}</p>
          )}

          <Separator />

          {/* Resources */}
          <ResourceSelector
            resourceTypes={resourceTypes}
            selectedResources={selectedResources}
            onChange={setSelectedResources}
            date={date}
            startTime={startTime}
            endTime={endTime}
            availabilityMap={availabilityMap}
            loading={loadingData}
          />
          {errors.resourceRequests && (
            <p className="text-xs text-red-600">{errors.resourceRequests}</p>
          )}

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="form-notes">Notes</Label>
            <Textarea
              id="form-notes"
              placeholder="Any special requirements or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            {errors.notes && (
              <p className="text-xs text-red-600">{errors.notes}</p>
            )}
          </div>

          {/* General error */}
          {generalError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {generalError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Booking'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
