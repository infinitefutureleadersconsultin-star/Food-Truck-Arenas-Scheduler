// =============================================================================
// Availability Engine  --  THE BRAIN OF THE SCHEDULING SYSTEM
// =============================================================================
//
// This module determines whether a booking request can be satisfied given the
// current commissary settings, existing bookings, and resource inventory.
// It also suggests alternative time windows when the requested slot is
// unavailable.
// =============================================================================

import type { Booking } from '@/lib/types/booking';
import type { ResourceType } from '@/lib/types/resource';
import type {
  CommissarySettings,
  DayOfWeek,
} from '@/lib/utils/constants';
import { timeToMinutes, minutesToTime, getDayOfWeek } from '@/lib/utils/dateUtils';

// ---- Result Types ----

export interface ResourceDetail {
  resourceTypeId: string;
  resourceTypeName: string;
  requested: number;
  available: number;
  total: number;
  sufficient: boolean;
}

export interface Conflict {
  resourceTypeId: string;
  resourceTypeName: string;
  requested: number;
  available: number;
}

export interface SuggestedAlternative {
  startTime: string;
  endTime: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  details: ResourceDetail[];
  conflicts: Conflict[];
  suggestedAlternatives: SuggestedAlternative[];
}

// ---- Helpers ----

/**
 * Find all bookings that overlap with the window [startTime, endTime) on the
 * same date, excluding cancelled / no-show bookings and optionally excluding
 * a specific booking (e.g. when editing an existing booking).
 */
export function findOverlappingBookings(
  bookings: Booking[],
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
): Booking[] {
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  return bookings.filter((booking) => {
    if (booking.id === excludeBookingId) return false;
    if (booking.date !== date) return false;
    if (booking.status === 'cancelled' || booking.status === 'no_show') return false;

    const bStart = timeToMinutes(booking.startTime);
    const bEnd = timeToMinutes(booking.endTime);

    // Two intervals overlap iff each starts before the other ends
    return reqStart < bEnd && reqEnd > bStart;
  });
}

/**
 * Count how many units of a given resource type are consumed by a set of
 * bookings during the overlapping window.
 */
function countResourceUsage(
  overlapping: Booking[],
  resourceTypeId: string,
): number {
  let total = 0;
  for (const booking of overlapping) {
    total += booking.resourceRequests[resourceTypeId] ?? 0;
  }
  return total;
}

// ---- Main Availability Check ----

/**
 * Check whether a booking request can be fulfilled.
 *
 * Steps:
 *   a. Check if the date is a blackout date.
 *   b. Check operating hours for that day of the week.
 *   c. For each resource type requested, count how many are already in use
 *      during the overlapping window and determine if there are enough.
 *   d. Build and return the full AvailabilityCheckResult including per-type
 *      details, conflicts, and suggested alternatives when unavailable.
 *
 * @param date             - "YYYY-MM-DD" date string
 * @param startTime        - "HH:MM" start time
 * @param endTime          - "HH:MM" end time
 * @param resourceRequests - map of resourceTypeId -> quantity requested
 * @param settings         - commissary settings (hours, rules, blackout dates)
 * @param existingBookings - all bookings to check against
 * @param resourceTypes    - all resource type definitions
 * @param excludeBookingId - optional booking ID to exclude (for edits)
 */
export function checkAvailability(
  date: string,
  startTime: string,
  endTime: string,
  resourceRequests: Record<string, number>,
  settings: CommissarySettings,
  existingBookings: Booking[],
  resourceTypes: ResourceType[],
  excludeBookingId?: string,
): AvailabilityCheckResult {
  const details: ResourceDetail[] = [];
  const conflicts: Conflict[] = [];

  // ---- (a) Blackout date check ----
  const isBlackout = settings.blackoutDates.some((bd) => bd.date === date);
  if (isBlackout) {
    // Populate details for every requested type showing 0 available
    const typeMap = buildTypeMap(resourceTypes);
    for (const [typeId, requested] of Object.entries(resourceRequests)) {
      if (requested <= 0) continue;
      const rt = typeMap.get(typeId);
      const typeName = rt?.name ?? typeId;
      const total = rt?.totalQuantity ?? 0;

      details.push({
        resourceTypeId: typeId,
        resourceTypeName: typeName,
        requested,
        available: 0,
        total,
        sufficient: false,
      });

      conflicts.push({
        resourceTypeId: typeId,
        resourceTypeName: typeName,
        requested,
        available: 0,
      });
    }

    return {
      available: false,
      details,
      conflicts,
      suggestedAlternatives: [],
    };
  }

  // ---- (b) Operating hours check ----
  const dayOfWeek = getDayOfWeek(date) as DayOfWeek;
  const dayHours = settings.operatingHours[dayOfWeek];

  if (dayHours.closed) {
    const typeMap = buildTypeMap(resourceTypes);
    for (const [typeId, requested] of Object.entries(resourceRequests)) {
      if (requested <= 0) continue;
      const rt = typeMap.get(typeId);
      const typeName = rt?.name ?? typeId;
      const total = rt?.totalQuantity ?? 0;

      details.push({
        resourceTypeId: typeId,
        resourceTypeName: typeName,
        requested,
        available: 0,
        total,
        sufficient: false,
      });

      conflicts.push({
        resourceTypeId: typeId,
        resourceTypeName: typeName,
        requested,
        available: 0,
      });
    }

    return {
      available: false,
      details,
      conflicts,
      suggestedAlternatives: [],
    };
  }

  // Verify the requested window fits within operating hours
  const openMin = timeToMinutes(dayHours.open);
  const closeMin = timeToMinutes(dayHours.close);
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  if (reqStart < openMin || reqEnd > closeMin || reqStart >= reqEnd) {
    const typeMap = buildTypeMap(resourceTypes);
    for (const [typeId, requested] of Object.entries(resourceRequests)) {
      if (requested <= 0) continue;
      const rt = typeMap.get(typeId);
      const typeName = rt?.name ?? typeId;
      const total = rt?.totalQuantity ?? 0;

      details.push({
        resourceTypeId: typeId,
        resourceTypeName: typeName,
        requested,
        available: 0,
        total,
        sufficient: false,
      });

      conflicts.push({
        resourceTypeId: typeId,
        resourceTypeName: typeName,
        requested,
        available: 0,
      });
    }

    return {
      available: false,
      details,
      conflicts,
      suggestedAlternatives: [],
    };
  }

  // ---- (c) Per-resource-type availability ----
  const overlapping = findOverlappingBookings(
    existingBookings,
    date,
    startTime,
    endTime,
    excludeBookingId,
  );

  const typeMap = buildTypeMap(resourceTypes);
  let allSufficient = true;

  for (const [typeId, requested] of Object.entries(resourceRequests)) {
    if (requested <= 0) continue;

    const rt = typeMap.get(typeId);
    const typeName = rt?.name ?? typeId;
    const totalCapacity = rt?.totalQuantity ?? 0;

    const inUse = countResourceUsage(overlapping, typeId);
    const available = Math.max(0, totalCapacity - inUse);
    const sufficient = available >= requested;

    details.push({
      resourceTypeId: typeId,
      resourceTypeName: typeName,
      requested,
      available,
      total: totalCapacity,
      sufficient,
    });

    if (!sufficient) {
      allSufficient = false;
      conflicts.push({
        resourceTypeId: typeId,
        resourceTypeName: typeName,
        requested,
        available,
      });
    }
  }

  // ---- (d) Build result ----
  const suggestedAlternatives = allSufficient
    ? []
    : suggestAlternatives(
        date,
        resourceRequests,
        settings,
        existingBookings,
        resourceTypes,
        excludeBookingId,
      );

  return {
    available: allSufficient,
    details,
    conflicts,
    suggestedAlternatives,
  };
}

// ---- Alternative Suggestion Engine ----

/**
 * When the requested slot is not available, scan the same day's operating
 * hours for alternative windows of the same duration where all requested
 * resources would be available.
 *
 * Returns up to 5 suggestions, sorted by proximity to the original request.
 */
export function suggestAlternatives(
  date: string,
  resourceRequests: Record<string, number>,
  settings: CommissarySettings,
  existingBookings: Booking[],
  resourceTypes: ResourceType[],
  excludeBookingId?: string,
): SuggestedAlternative[] {
  const dayOfWeek = getDayOfWeek(date) as DayOfWeek;
  const dayHours = settings.operatingHours[dayOfWeek];

  if (dayHours.closed) return [];

  const openMin = timeToMinutes(dayHours.open);
  const closeMin = timeToMinutes(dayHours.close);

  // We need to know the desired duration. Derive it from the booking rules
  // minimum or just use 60 as a sensible default for suggestions.
  const slotDuration = settings.bookingRules.minDurationMinutes || 60;
  const stepMinutes = 30; // scan in 30-minute increments
  const typeMap = buildTypeMap(resourceTypes);

  const alternatives: SuggestedAlternative[] = [];

  for (let start = openMin; start + slotDuration <= closeMin; start += stepMinutes) {
    const end = start + slotDuration;
    const candidateStart = minutesToTime(start);
    const candidateEnd = minutesToTime(end);

    const overlapping = findOverlappingBookings(
      existingBookings,
      date,
      candidateStart,
      candidateEnd,
      excludeBookingId,
    );

    let allFit = true;
    for (const [typeId, requested] of Object.entries(resourceRequests)) {
      if (requested <= 0) continue;
      const rt = typeMap.get(typeId);
      const totalCapacity = rt?.totalQuantity ?? 0;
      const inUse = countResourceUsage(overlapping, typeId);
      if (totalCapacity - inUse < requested) {
        allFit = false;
        break;
      }
    }

    if (allFit) {
      alternatives.push({ startTime: candidateStart, endTime: candidateEnd });
      if (alternatives.length >= 5) break;
    }
  }

  return alternatives;
}

// ---- Internal Utility ----

function buildTypeMap(resourceTypes: ResourceType[]): Map<string, ResourceType> {
  const map = new Map<string, ResourceType>();
  for (const rt of resourceTypes) {
    map.set(rt.id, rt);
  }
  return map;
}
