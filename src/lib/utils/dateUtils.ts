// =============================================================================
// Date & Time Utility Functions (powered by date-fns)
// =============================================================================

import {
  format,
  parse,
  isToday as dfIsToday,
  isFuture,
  isPast,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';

/**
 * Format a Date object (or ISO string) using date-fns format tokens.
 * Defaults to "MMM d, yyyy" (e.g. "Jan 5, 2026").
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'MMM d, yyyy',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

/**
 * Convert a 24-hour time string ("08:00", "14:30") to a readable 12-hour
 * format ("8:00 AM", "2:30 PM").
 */
export function formatTime(time24: string): string {
  const { hours, minutes } = parseTime(time24);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a');
}

/**
 * Parse a "HH:MM" string into its numeric hours and minutes components.
 */
export function parseTime(time24: string): { hours: number; minutes: number } {
  const [hoursStr, minutesStr] = time24.split(':');
  return {
    hours: parseInt(hoursStr, 10),
    minutes: parseInt(minutesStr, 10),
  };
}

/**
 * Convert a "HH:MM" time string to total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

/**
 * Convert total minutes since midnight to a "HH:MM" 24-hour string.
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Check whether a given "HH:MM" time falls within the range [start, end).
 * All parameters are "HH:MM" strings.
 */
export function isTimeInRange(time: string, start: string, end: string): boolean {
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return t >= s && t < e;
}

/**
 * Return an array of Date objects for every day in [startDate, endDate] inclusive.
 */
export function getDateRange(startDate: Date | string, endDate: Date | string): Date[] {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return eachDayOfInterval({ start, end });
}

/**
 * Get the lowercase day-of-week name for a Date (e.g. "monday", "sunday").
 */
export function getDayOfWeek(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE').toLowerCase();
}

/**
 * Check if the given date is today.
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return dfIsToday(d);
}

/**
 * Check if the given date is strictly in the future (not today).
 */
export function isFutureDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isFuture(d);
}

/**
 * Check if the given date is strictly in the past (not today).
 */
export function isPastDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isPast(d);
}

/**
 * Format a date range as a human-readable string.
 * If both dates are the same, returns a single formatted date.
 * Otherwise returns "Jan 5 - Jan 12, 2026" (or across months/years).
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;

  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  if (sameDay) {
    return format(s, 'MMM d, yyyy');
  }

  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();

  if (sameMonth) {
    return `${format(s, 'MMM d')} - ${format(e, 'd, yyyy')}`;
  }

  if (sameYear) {
    return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')}`;
  }

  return `${format(s, 'MMM d, yyyy')} - ${format(e, 'MMM d, yyyy')}`;
}

/**
 * Get all seven dates (Sunday through Saturday) of the week that contains
 * the given date.
 */
export function getWeekDates(date: Date | string): Date[] {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const weekStart = startOfWeek(d, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(d, { weekStartsOn: 0 });      // Saturday
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}
