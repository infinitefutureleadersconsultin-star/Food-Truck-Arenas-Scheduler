'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { formatTime } from '@/lib/utils/dateUtils';
import type { Resource } from '@/lib/types';
import type { Booking } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TableAvailability = 'available' | 'partially_booked' | 'fully_booked' | 'maintenance' | 'user_booked';

export interface TableCardProps {
  resource: Resource;
  bookings: Booking[];
  currentUserId?: string;
  selectedDate: Date;
  onClick: (resource: Resource) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Operating hours for availability calculation (06:00-22:00 = 16 hours). */
const OPERATING_MINUTES = 16 * 60;

function getAvailabilityStatus(
  resource: Resource,
  bookings: Booking[],
  currentUserId?: string,
): TableAvailability {
  if (resource.status === 'maintenance' || resource.status === 'broken') {
    return 'maintenance';
  }

  const activeBookings = bookings.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'no_show',
  );

  if (activeBookings.length === 0) return 'available';

  // Check if the current user has a booking on this table
  if (currentUserId && activeBookings.some((b) => b.userId === currentUserId)) {
    return 'user_booked';
  }

  // Calculate total booked minutes
  const bookedMinutes = activeBookings.reduce((total, b) => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    return total + (eh * 60 + em) - (sh * 60 + sm);
  }, 0);

  if (bookedMinutes >= OPERATING_MINUTES) return 'fully_booked';
  return 'partially_booked';
}

function getNextAvailableTime(bookings: Booking[]): string | null {
  const activeBookings = bookings
    .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (activeBookings.length === 0) return null;

  // Find the first booking that hasn't ended yet based on current time
  const now = new Date();
  const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  for (const booking of activeBookings) {
    if (booking.endTime > nowStr) {
      return booking.endTime;
    }
  }

  return null;
}

function getCurrentOccupant(bookings: Booking[]): string | null {
  const now = new Date();
  const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const current = bookings.find(
    (b) =>
      b.status !== 'cancelled' &&
      b.status !== 'no_show' &&
      b.startTime <= nowStr &&
      b.endTime > nowStr,
  );

  return current?.businessName ?? null;
}

// ---------------------------------------------------------------------------
// Style mappings
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<TableAvailability, string> = {
  available: 'bg-green-500 text-white hover:bg-green-600',
  partially_booked: 'bg-yellow-500 text-white hover:bg-yellow-600',
  fully_booked: 'bg-red-500 text-white hover:bg-red-600',
  maintenance: 'bg-gray-400 text-white',
  user_booked: 'bg-blue-500 text-white ring-4 ring-blue-300 hover:bg-blue-600',
};

const STATUS_LABELS: Record<TableAvailability, string> = {
  available: 'Available',
  partially_booked: 'Partially Booked',
  fully_booked: 'Fully Booked',
  maintenance: 'Maintenance',
  user_booked: 'Your Booking',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TableCard({
  resource,
  bookings,
  currentUserId,
  selectedDate,
  onClick,
}: TableCardProps) {
  const availability = useMemo(
    () => getAvailabilityStatus(resource, bookings, currentUserId),
    [resource, bookings, currentUserId],
  );

  const nextAvailable = useMemo(
    () => (availability === 'fully_booked' || availability === 'partially_booked'
      ? getNextAvailableTime(bookings)
      : null),
    [availability, bookings],
  );

  const occupant = useMemo(
    () => getCurrentOccupant(bookings),
    [bookings],
  );

  const isMaintenance = availability === 'maintenance';

  return (
    <button
      type="button"
      onClick={() => !isMaintenance && onClick(resource)}
      disabled={isMaintenance}
      className={cn(
        'relative w-40 h-30 rounded-xl flex flex-col items-center justify-center gap-1 p-3',
        'transition-all duration-200 ease-in-out cursor-pointer select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50',
        !isMaintenance && 'hover:scale-105 hover:shadow-lg',
        isMaintenance && 'cursor-not-allowed',
        STATUS_STYLES[availability],
      )}
      aria-label={`${resource.name} - ${STATUS_LABELS[availability]}`}
    >
      {/* Diagonal stripes overlay for maintenance */}
      {isMaintenance && (
        <div
          className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.4) 6px, rgba(255,255,255,0.4) 12px)',
          }}
        />
      )}

      {/* Table name */}
      <span className="font-bold text-sm leading-tight text-center z-10">
        {resource.name}
      </span>

      {/* Status label */}
      <span className="text-xs opacity-90 z-10">
        {STATUS_LABELS[availability]}
      </span>

      {/* Occupant name */}
      {occupant && (
        <span className="text-[10px] opacity-80 truncate max-w-full z-10">
          {occupant}
        </span>
      )}

      {/* Next available time */}
      {nextAvailable && (
        <span className="text-[10px] opacity-80 z-10">
          Free at {formatTime(nextAvailable)}
        </span>
      )}
    </button>
  );
}
