// =============================================================================
// Time Slot Generation & Availability Helpers
// =============================================================================

import type { Booking } from '@/lib/types/booking';
import type { DayOfWeek, OperatingHoursMap } from '@/lib/utils/constants';
import { timeToMinutes, minutesToTime, getDayOfWeek } from '@/lib/utils/dateUtils';

/**
 * Generate an array of "HH:MM" time strings from `startTime` to `endTime`
 * (inclusive of start, exclusive of end) at the given interval.
 *
 * Example: generateTimeSlots("06:00", "10:00", 30)
 *   => ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30"]
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number,
): string[] {
  const slots: string[] = [];
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  for (let m = startMin; m < endMin; m += intervalMinutes) {
    slots.push(minutesToTime(m));
  }

  return slots;
}

/**
 * Given a date, operating hours, and existing bookings, compute the list of
 * available time windows that are at least `minDuration` minutes long.
 *
 * Each window is represented as { start: string, end: string } in "HH:MM" format.
 *
 * The algorithm:
 *  1. Determine the operating hours for the day.
 *  2. Collect all booked intervals that overlap with the operating hours.
 *  3. Merge overlapping/adjacent booked intervals.
 *  4. Compute gaps between merged intervals within the operating window.
 *  5. Filter gaps that are shorter than `minDuration`.
 */
export function getAvailableTimeSlots(
  date: Date | string,
  operatingHours: OperatingHoursMap,
  existingBookings: Booking[],
  minDuration: number = 60,
): { start: string; end: string }[] {
  const day = getDayOfWeek(date) as DayOfWeek;
  const dayHours = operatingHours[day];

  // If the commissary is closed that day, no slots available
  if (dayHours.closed) {
    return [];
  }

  const openMin = timeToMinutes(dayHours.open);
  const closeMin = timeToMinutes(dayHours.close);

  // Collect booked intervals as [startMin, endMin]
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const bookedIntervals: [number, number][] = existingBookings
    .filter(
      (b) =>
        b.date === dateStr &&
        b.status !== 'cancelled' &&
        b.status !== 'no_show',
    )
    .map((b) => [timeToMinutes(b.startTime), timeToMinutes(b.endTime)] as [number, number])
    .filter(([s, e]) => s < closeMin && e > openMin) // overlap with operating hours
    .map(([s, e]) => [Math.max(s, openMin), Math.min(e, closeMin)] as [number, number]);

  // Sort by start time
  bookedIntervals.sort((a, b) => a[0] - b[0]);

  // Merge overlapping / adjacent intervals
  const merged: [number, number][] = [];
  for (const interval of bookedIntervals) {
    if (merged.length === 0 || merged[merged.length - 1][1] < interval[0]) {
      merged.push([...interval]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], interval[1]);
    }
  }

  // Compute available gaps
  const available: { start: string; end: string }[] = [];
  let cursor = openMin;

  for (const [busyStart, busyEnd] of merged) {
    if (cursor < busyStart) {
      const gapDuration = busyStart - cursor;
      if (gapDuration >= minDuration) {
        available.push({
          start: minutesToTime(cursor),
          end: minutesToTime(busyStart),
        });
      }
    }
    cursor = Math.max(cursor, busyEnd);
  }

  // Gap after the last booked interval
  if (cursor < closeMin) {
    const gapDuration = closeMin - cursor;
    if (gapDuration >= minDuration) {
      available.push({
        start: minutesToTime(cursor),
        end: minutesToTime(closeMin),
      });
    }
  }

  return available;
}

/**
 * Check whether a specific time slot [startTime, endTime) is free of
 * conflicting bookings on the given date.
 */
export function isSlotAvailable(
  date: string,
  startTime: string,
  endTime: string,
  existingBookings: Booking[],
): boolean {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  return !existingBookings.some((booking) => {
    if (booking.date !== date) return false;
    if (booking.status === 'cancelled' || booking.status === 'no_show') return false;

    const bStart = timeToMinutes(booking.startTime);
    const bEnd = timeToMinutes(booking.endTime);

    // Two intervals overlap if one starts before the other ends and vice versa
    return startMin < bEnd && endMin > bStart;
  });
}

/**
 * Calculate the duration of a time slot in minutes.
 */
export function getSlotDuration(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}
