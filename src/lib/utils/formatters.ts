// =============================================================================
// Display Formatting Utilities
// =============================================================================

import type { BookingStatus } from '@/lib/types/booking';
import type { ResourceStatus } from '@/lib/types/resource';
import type { UserStatus } from '@/lib/types/user';

// ---- Booking Status Formatting ----

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export function formatBookingStatus(status: BookingStatus): string {
  return BOOKING_STATUS_LABELS[status] ?? status;
}

// ---- Resource Status Formatting ----

const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  available: 'Available',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  broken: 'Broken',
  locked: 'Locked',
};

export function formatResourceStatus(status: ResourceStatus): string {
  return RESOURCE_STATUS_LABELS[status] ?? status;
}

// ---- User Status Formatting ----

const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
};

export function formatUserStatus(status: UserStatus): string {
  return USER_STATUS_LABELS[status] ?? status;
}

// ---- Duration Formatting ----

/**
 * Format a duration in minutes to a human-readable string.
 * Examples:
 *   60  -> "1 hour"
 *   90  -> "1 hour 30 minutes"
 *   120 -> "2 hours"
 *   45  -> "45 minutes"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 minutes';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }

  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`);
  }

  return parts.join(' ');
}

// ---- Currency Formatting ----

/**
 * Format a number as USD currency (e.g. 19.99 -> "$19.99").
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// ---- Text Truncation ----

/**
 * Truncate a string to `maxLength` characters, appending "..." if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}
