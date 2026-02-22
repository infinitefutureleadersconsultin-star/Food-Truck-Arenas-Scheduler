'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatTime, timeToMinutes, minutesToTime } from '@/lib/utils/dateUtils';
import { formatDuration } from '@/lib/utils/formatters';
import type { Booking } from '@/lib/types';
import type { OperatingHoursMap, DayHours } from '@/lib/utils/constants';
import { Clock } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeSlotPickerProps {
  date: Date;
  startTime: string;
  endTime: string;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
  operatingHours: OperatingHoursMap;
  existingBookings: Booking[];
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  intervalMinutes?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDayKey(date: Date): string {
  return date
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();
}

/** Generate time strings from open to close at the given interval. */
function generateTimeOptions(
  openTime: string,
  closeTime: string,
  interval: number,
): string[] {
  const slots: string[] = [];
  const startMin = timeToMinutes(openTime);
  const endMin = timeToMinutes(closeTime);

  for (let m = startMin; m <= endMin; m += interval) {
    slots.push(minutesToTime(m));
  }

  return slots;
}

/** Check if a specific time slot is blocked by any existing booking. */
function isTimeBlocked(
  time: string,
  bookings: Booking[],
  dateStr: string,
): boolean {
  const tMin = timeToMinutes(time);
  return bookings.some((b) => {
    if (b.date !== dateStr) return false;
    if (b.status === 'cancelled' || b.status === 'no_show') return false;
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    return tMin >= bStart && tMin < bEnd;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeSlotPicker({
  date,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  operatingHours,
  existingBookings,
  minDurationMinutes = 60,
  maxDurationMinutes = 480,
  intervalMinutes = 30,
}: TimeSlotPickerProps) {
  const dayKey = getDayKey(date);
  const dayHours = operatingHours[dayKey as keyof OperatingHoursMap] as DayHours | undefined;

  const isClosed = !dayHours || dayHours.closed;
  const openTime = dayHours?.open ?? '06:00';
  const closeTime = dayHours?.close ?? '22:00';
  const dateStr = date.toISOString().split('T')[0];

  // All possible time options within operating hours
  const allTimes = useMemo(
    () => generateTimeOptions(openTime, closeTime, intervalMinutes),
    [openTime, closeTime, intervalMinutes],
  );

  // Available start times: not blocked
  const availableStartTimes = useMemo(
    () =>
      allTimes.filter(
        (t) =>
          t !== closeTime && !isTimeBlocked(t, existingBookings, dateStr),
      ),
    [allTimes, existingBookings, dateStr, closeTime],
  );

  // Available end times: after start, respects min/max duration, not overlapping
  const availableEndTimes = useMemo(() => {
    if (!startTime) return [];
    const startMin = timeToMinutes(startTime);

    return allTimes.filter((t) => {
      const tMin = timeToMinutes(t);
      const duration = tMin - startMin;

      if (duration < minDurationMinutes) return false;
      if (duration > maxDurationMinutes) return false;

      // Ensure no booking starts between startTime and this endTime
      const hasOverlap = existingBookings.some((b) => {
        if (b.date !== dateStr) return false;
        if (b.status === 'cancelled' || b.status === 'no_show') return false;
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        return startMin < bEnd && tMin > bStart;
      });

      return !hasOverlap;
    });
  }, [
    startTime,
    allTimes,
    existingBookings,
    dateStr,
    minDurationMinutes,
    maxDurationMinutes,
  ]);

  // Duration display
  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return timeToMinutes(endTime) - timeToMinutes(startTime);
  }, [startTime, endTime]);

  if (isClosed) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-500">
          The commissary is closed on this day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        <span>
          Operating hours: {formatTime(openTime)} - {formatTime(closeTime)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Start Time */}
        <div className="space-y-2">
          <Label htmlFor="start-time">Start Time</Label>
          <Select
            value={startTime}
            onValueChange={(value) => {
              onStartChange(value);
              // Reset end time if it is no longer valid
              if (endTime) {
                const newDuration =
                  timeToMinutes(endTime) - timeToMinutes(value);
                if (
                  newDuration < minDurationMinutes ||
                  newDuration > maxDurationMinutes
                ) {
                  onEndChange('');
                }
              }
            }}
          >
            <SelectTrigger id="start-time">
              <SelectValue placeholder="Select start time" />
            </SelectTrigger>
            <SelectContent>
              {availableStartTimes.length === 0 ? (
                <SelectItem value="__none" disabled>
                  No available times
                </SelectItem>
              ) : (
                availableStartTimes.map((time) => (
                  <SelectItem key={time} value={time}>
                    {formatTime(time)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* End Time */}
        <div className="space-y-2">
          <Label htmlFor="end-time">End Time</Label>
          <Select
            value={endTime}
            onValueChange={onEndChange}
            disabled={!startTime}
          >
            <SelectTrigger id="end-time">
              <SelectValue placeholder="Select end time" />
            </SelectTrigger>
            <SelectContent>
              {availableEndTimes.length === 0 ? (
                <SelectItem value="__none" disabled>
                  {startTime ? 'No available end times' : 'Select start time first'}
                </SelectItem>
              ) : (
                availableEndTimes.map((time) => (
                  <SelectItem key={time} value={time}>
                    {formatTime(time)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Duration display */}
      {durationMinutes > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <Clock className="h-4 w-4" />
          <span>Duration: {formatDuration(durationMinutes)}</span>
        </div>
      )}
    </div>
  );
}
