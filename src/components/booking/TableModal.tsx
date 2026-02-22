'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimeSlotPicker } from './TimeSlotPicker';
import { ResourceSelector } from './ResourceSelector';
import { WaitlistButton } from './WaitlistButton';
import { createBooking } from '@/lib/services/bookingService';
import { getResourceTypes, getResources } from '@/lib/services/resourceService';
import { formatTime, formatDate, timeToMinutes, minutesToTime } from '@/lib/utils/dateUtils';
import { formatDuration } from '@/lib/utils/formatters';
import {
  DEFAULT_OPERATING_HOURS,
  DEFAULT_BOOKING_RULES,
} from '@/lib/utils/constants';
import type { Resource, Booking, User, ResourceType } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import {
  Calendar,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Refrigerator,
  Snowflake,
  Package,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TableModalProps {
  open: boolean;
  onClose: () => void;
  resource: Resource | null;
  selectedDate: Date;
  currentUser: User | null;
  bookings?: Booking[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OPERATING_OPEN = '06:00';
const OPERATING_CLOSE = '22:00';

function getTimeSlots(): string[] {
  const slots: string[] = [];
  for (let m = timeToMinutes(OPERATING_OPEN); m <= timeToMinutes(OPERATING_CLOSE); m += 30) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

type SlotStatus = 'available' | 'booked' | 'closed';

interface TimelineSlot {
  time: string;
  endTime: string;
  status: SlotStatus;
  booking?: Booking;
}

function buildTimeline(bookings: Booking[], dateStr: string): TimelineSlot[] {
  const allSlots = getTimeSlots();
  const activeBookings = bookings.filter(
    (b) =>
      b.date === dateStr &&
      b.status !== 'cancelled' &&
      b.status !== 'no_show',
  );

  return allSlots
    .filter((_, idx) => idx < allSlots.length - 1)
    .map((time, idx) => {
      const endTime = allSlots[idx + 1];
      const tMin = timeToMinutes(time);

      const booking = activeBookings.find((b) => {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        return tMin >= bStart && tMin < bEnd;
      });

      return {
        time,
        endTime,
        status: booking ? 'booked' : 'available',
        booking,
      } as TimelineSlot;
    });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TableModal({
  open,
  onClose,
  resource,
  selectedDate,
  currentUser,
  bookings = [],
}: TableModalProps) {
  // ---- State ----
  const [bookingDate, setBookingDate] = useState(
    selectedDate.toISOString().split('T')[0],
  );
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedResources, setSelectedResources] = useState<
    Record<string, number>
  >({});
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, number>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);

  // ---- Derived ----
  const dateStr = bookingDate;
  const dateObj = useMemo(() => new Date(bookingDate + 'T00:00:00'), [bookingDate]);

  const tableBookings = useMemo(
    () =>
      bookings.filter((b) =>
        b.resources.some((r) => r.resourceId === resource?.id),
      ),
    [bookings, resource],
  );

  const timeline = useMemo(
    () => buildTimeline(tableBookings, dateStr),
    [tableBookings, dateStr],
  );

  const isFullyBooked = useMemo(
    () => timeline.every((s) => s.status === 'booked'),
    [timeline],
  );

  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return timeToMinutes(endTime) - timeToMinutes(startTime);
  }, [startTime, endTime]);

  // ---- Load resource types ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingResources(true);
      try {
        const types = await getResourceTypes();
        if (!cancelled) {
          // Filter out the table type itself (tables are selected via the floor plan)
          const nonTableTypes = types.filter(
            (t) => t.slug !== 'tables',
          );
          setResourceTypes(nonTableTypes);

          // Build a simple availability map from totalQuantity minus booked
          const avail: Record<string, number> = {};
          for (const t of nonTableTypes) {
            const bookedCount = bookings
              .filter(
                (b) =>
                  b.date === dateStr &&
                  b.status !== 'cancelled' &&
                  b.status !== 'no_show' &&
                  startTime &&
                  endTime &&
                  b.startTime < endTime &&
                  b.endTime > startTime,
              )
              .reduce(
                (sum, b) => sum + (b.resourceRequests[t.id] ?? 0),
                0,
              );
            avail[t.id] = Math.max(0, t.totalQuantity - bookedCount);
          }
          if (!cancelled) setAvailabilityMap(avail);
        }
      } catch {
        // Resource types loading is best-effort
      } finally {
        if (!cancelled) setLoadingResources(false);
      }
    }
    if (open) load();
    return () => {
      cancelled = true;
    };
  }, [open, bookings, dateStr, startTime, endTime]);

  // ---- Reset on open ----
  useEffect(() => {
    if (open) {
      setBookingDate(selectedDate.toISOString().split('T')[0]);
      setStartTime('');
      setEndTime('');
      setNotes('');
      setSelectedResources({});
      setSubmitted(false);
      setError(null);
    }
  }, [open, selectedDate]);

  // ---- Validation ----
  const validate = useCallback((): string | null => {
    if (!startTime) return 'Please select a start time.';
    if (!endTime) return 'Please select an end time.';

    const now = new Date();
    const bookDate = new Date(bookingDate + 'T00:00:00');
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    if (bookDate < today) return 'Cannot book a date in the past.';

    if (bookDate.getTime() === today.getTime()) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (timeToMinutes(startTime) <= nowMinutes) {
        return 'Start time must be in the future.';
      }
    }

    const dur = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (dur < DEFAULT_BOOKING_RULES.minDurationMinutes) {
      return `Minimum booking duration is ${formatDuration(DEFAULT_BOOKING_RULES.minDurationMinutes)}.`;
    }
    if (dur > DEFAULT_BOOKING_RULES.maxDurationMinutes) {
      return `Maximum booking duration is ${formatDuration(DEFAULT_BOOKING_RULES.maxDurationMinutes)}.`;
    }

    // Check overlap
    const hasOverlap = tableBookings.some((b) => {
      if (b.date !== dateStr) return false;
      if (b.status === 'cancelled' || b.status === 'no_show') return false;
      return b.startTime < endTime && b.endTime > startTime;
    });
    if (hasOverlap) return 'This time overlaps with an existing booking.';

    return null;
  }, [startTime, endTime, bookingDate, dateStr, tableBookings]);

  // ---- Submit ----
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!currentUser || !resource) return;

    setSubmitting(true);
    setError(null);

    try {
      // Build resource requests including the table
      const requests: Record<string, number> = { ...selectedResources };
      if (resource.typeId) {
        requests[resource.typeId] = (requests[resource.typeId] ?? 0) + 1;
      }

      const startTimestamp = Timestamp.fromDate(
        new Date(`${bookingDate}T${startTime}:00`),
      );
      const endTimestamp = Timestamp.fromDate(
        new Date(`${bookingDate}T${endTime}:00`),
      );

      await createBooking({
        userId: currentUser.id,
        userName: currentUser.displayName,
        businessName: currentUser.businessName,
        date: bookingDate,
        startTime,
        endTime,
        startTimestamp,
        endTimestamp,
        status: DEFAULT_BOOKING_RULES.autoConfirm ? 'confirmed' : 'pending',
        resources: [],
        resourceRequests: requests,
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create booking.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Timeline click handler ----
  const handleTimelineClick = (slot: TimelineSlot) => {
    if (slot.status !== 'available') return;
    setStartTime(slot.time);

    // Find the end of the contiguous available block
    const slotIdx = timeline.findIndex((s) => s.time === slot.time);
    let blockEnd = slot.endTime;
    for (let i = slotIdx + 1; i < timeline.length; i++) {
      if (timeline[i].status === 'available') {
        blockEnd = timeline[i].endTime;
      } else {
        break;
      }
    }

    // Default to 1 hour or the max available block
    const oneHourEnd = minutesToTime(timeToMinutes(slot.time) + 60);
    if (timeToMinutes(oneHourEnd) <= timeToMinutes(blockEnd)) {
      setEndTime(oneHourEnd);
    } else {
      setEndTime(blockEnd);
    }
  };

  if (!resource) return null;

  // ---- Render ----
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {resource.name}
            <Badge
              variant={
                resource.status === 'available'
                  ? 'success'
                  : resource.status === 'maintenance'
                    ? 'warning'
                    : 'secondary'
              }
            >
              {resource.status === 'available'
                ? 'Available'
                : resource.status === 'maintenance'
                  ? 'Maintenance'
                  : resource.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {resource.locationDescription || 'Commissary prep table'}
          </DialogDescription>
        </DialogHeader>

        {/* Success state */}
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Booking Confirmed!
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {resource.name} on {formatDate(bookingDate)},{' '}
                {formatTime(startTime)} - {formatTime(endTime)}
              </p>
            </div>
            <Button onClick={onClose} className="mt-2">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ---- TODAY'S SCHEDULE ---- */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Today&apos;s Schedule
              </h4>
              <div className="rounded-lg border border-gray-200 p-3">
                {/* Time axis labels */}
                <div className="flex justify-between text-[10px] text-gray-400 mb-1 px-0.5">
                  <span>6 AM</span>
                  <span>10 AM</span>
                  <span>2 PM</span>
                  <span>6 PM</span>
                  <span>10 PM</span>
                </div>

                {/* Timeline bars */}
                <div className="flex gap-px h-10 rounded-md overflow-hidden">
                  {timeline.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => handleTimelineClick(slot)}
                      disabled={slot.status !== 'available'}
                      title={
                        slot.status === 'booked' && slot.booking
                          ? `${formatTime(slot.time)} - ${slot.booking.businessName}`
                          : `${formatTime(slot.time)} - Available`
                      }
                      className={cn(
                        'flex-1 transition-all relative group',
                        slot.status === 'available' &&
                          'bg-green-400 hover:bg-green-500 cursor-pointer',
                        slot.status === 'booked' &&
                          'bg-red-400 cursor-not-allowed',
                        slot.status === 'closed' &&
                          'bg-gray-300 cursor-not-allowed',
                      )}
                    >
                      {/* Tooltip on hover */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        {formatTime(slot.time)}
                        {slot.booking && ` - ${slot.booking.businessName}`}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-400" />
                    Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400" />
                    Booked
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* ---- BOOK THIS TABLE ---- */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Book This Table
              </h4>

              <div className="space-y-4">
                {/* Date picker */}
                <div className="space-y-2">
                  <Label htmlFor="booking-date">Date</Label>
                  <Input
                    id="booking-date"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Time slot picker */}
                <TimeSlotPicker
                  date={dateObj}
                  startTime={startTime}
                  endTime={endTime}
                  onStartChange={setStartTime}
                  onEndChange={setEndTime}
                  operatingHours={DEFAULT_OPERATING_HOURS}
                  existingBookings={tableBookings.filter(
                    (b) => b.date === dateStr,
                  )}
                  minDurationMinutes={DEFAULT_BOOKING_RULES.minDurationMinutes}
                  maxDurationMinutes={DEFAULT_BOOKING_RULES.maxDurationMinutes}
                />

                {/* User name (pre-filled) */}
                {currentUser && (
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={`${currentUser.displayName} (${currentUser.businessName})`}
                      disabled
                    />
                  </div>
                )}

                {/* Duration display */}
                {durationMinutes > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    Duration: {formatDuration(durationMinutes)}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* ---- ADDITIONAL RESOURCES ---- */}
            <ResourceSelector
              resourceTypes={resourceTypes}
              selectedResources={selectedResources}
              onChange={setSelectedResources}
              date={dateStr}
              startTime={startTime}
              endTime={endTime}
              availabilityMap={availabilityMap}
              loading={loadingResources}
            />

            <Separator />

            {/* ---- NOTES ---- */}
            <div className="space-y-2">
              <Label htmlFor="booking-notes">Notes</Label>
              <Textarea
                id="booking-notes"
                placeholder="Any special requirements or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* ---- ERROR ---- */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* ---- ACTION BUTTONS ---- */}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !startTime || !endTime}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Book Table'
                )}
              </Button>
            </DialogFooter>

            {/* ---- WAITLIST ---- */}
            {isFullyBooked && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Fully Booked
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    This table is fully booked for the day. Join the waitlist
                    to get notified when a slot opens up.
                  </p>
                  <WaitlistButton
                    date={dateStr}
                    startTime={startTime || OPERATING_OPEN}
                    endTime={endTime || OPERATING_CLOSE}
                    resourceRequests={selectedResources}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
