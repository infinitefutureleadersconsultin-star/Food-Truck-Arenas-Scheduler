// =============================================================================
// Resource Allocation Engine
// =============================================================================

import type { Booking, BookingResource } from '@/lib/types/booking';
import type { Resource, ResourceType } from '@/lib/types/resource';
import { timeToMinutes } from '@/lib/utils/dateUtils';

// ---- Types ----

export interface ResourceAssignment {
  resourceId: string;
  resourceTypeId: string;
  resourceName: string;
  resourceTypeName: string;
}

export interface FailedAllocation {
  resourceTypeId: string;
  resourceTypeName: string;
  requested: number;
  available: number;
  reason: string;
}

export interface AllocationResult {
  success: boolean;
  assignments: ResourceAssignment[];
  failedAllocations: FailedAllocation[];
}

// ---- Helpers ----

/**
 * Find all bookings that overlap with the given time range on the same date.
 */
function getOverlappingBookings(
  bookings: Booking[],
  date: string,
  startTime: string,
  endTime: string,
): Booking[] {
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  return bookings.filter((booking) => {
    if (booking.date !== date) return false;
    if (booking.status === 'cancelled' || booking.status === 'no_show') return false;

    const bStart = timeToMinutes(booking.startTime);
    const bEnd = timeToMinutes(booking.endTime);

    return reqStart < bEnd && reqEnd > bStart;
  });
}

/**
 * Collect all individual resource IDs that are already assigned to
 * overlapping bookings for a given resource type.
 */
function getAssignedResourceIds(
  overlapping: Booking[],
  resourceTypeId: string,
): Set<string> {
  const assigned = new Set<string>();
  for (const booking of overlapping) {
    for (const res of booking.resources) {
      if (res.resourceTypeId === resourceTypeId) {
        assigned.add(res.resourceId);
      }
    }
  }
  return assigned;
}

// ---- Main Allocation Function ----

/**
 * Allocate individual resources for a booking request.
 *
 * For each resource type requested:
 *   1. Filter out resources in maintenance, broken, or locked status.
 *   2. Filter out resources already assigned to overlapping bookings.
 *   3. Sort remaining by name (stable, deterministic ordering;
 *      a "least recently used" sort could be added if usage tracking exists).
 *   4. Assign the first N available resources.
 *
 * Returns an AllocationResult with overall success, individual assignments,
 * and details on any types that could not be fully allocated.
 */
export function allocateResources(
  date: string,
  startTime: string,
  endTime: string,
  resourceRequests: Record<string, number>,
  availableResources: Resource[],
  existingBookings: Booking[],
  resourceTypes: ResourceType[],
): AllocationResult {
  const assignments: ResourceAssignment[] = [];
  const failedAllocations: FailedAllocation[] = [];

  // Find all bookings that overlap with the requested time window
  const overlapping = getOverlappingBookings(existingBookings, date, startTime, endTime);

  // Build a lookup for resource types
  const typeMap = new Map<string, ResourceType>();
  for (const rt of resourceTypes) {
    typeMap.set(rt.id, rt);
  }

  for (const [resourceTypeId, requestedCount] of Object.entries(resourceRequests)) {
    if (requestedCount <= 0) continue;

    const resourceType = typeMap.get(resourceTypeId);
    const typeName = resourceType?.name ?? resourceTypeId;

    // If this type is not tracked individually, we cannot assign individual
    // resources, but we can still check quantity limits. For now we skip
    // individual assignment for non-tracked types.
    if (resourceType && !resourceType.trackIndividually) {
      // Just check count against totalQuantity via overlapping bookings
      let totalInUse = 0;
      for (const booking of overlapping) {
        totalInUse += booking.resourceRequests[resourceTypeId] ?? 0;
      }
      const remaining = resourceType.totalQuantity - totalInUse;

      if (remaining >= requestedCount) {
        // No individual resource IDs to assign for non-tracked types
        continue;
      } else {
        failedAllocations.push({
          resourceTypeId,
          resourceTypeName: typeName,
          requested: requestedCount,
          available: Math.max(0, remaining),
          reason: `Only ${Math.max(0, remaining)} ${typeName} available (${totalInUse} already booked)`,
        });
        continue;
      }
    }

    // Get IDs already assigned during this window
    const alreadyAssigned = getAssignedResourceIds(overlapping, resourceTypeId);

    // Filter available individual resources for this type
    const candidates = availableResources
      .filter((r) => {
        if (r.typeId !== resourceTypeId) return false;
        // Exclude unavailable statuses
        if (r.status === 'maintenance' || r.status === 'broken' || r.status === 'locked') {
          return false;
        }
        // Exclude already assigned during overlapping window
        if (alreadyAssigned.has(r.id)) return false;
        return true;
      })
      // Sort alphabetically by name for deterministic allocation
      .sort((a, b) => a.name.localeCompare(b.name));

    if (candidates.length >= requestedCount) {
      // Assign the first N candidates
      for (let i = 0; i < requestedCount; i++) {
        const resource = candidates[i];
        assignments.push({
          resourceId: resource.id,
          resourceTypeId: resource.typeId,
          resourceName: resource.name,
          resourceTypeName: typeName,
        });
      }
    } else {
      // Partial or no allocation possible
      // Still assign whatever we can
      for (const resource of candidates) {
        assignments.push({
          resourceId: resource.id,
          resourceTypeId: resource.typeId,
          resourceName: resource.name,
          resourceTypeName: typeName,
        });
      }
      failedAllocations.push({
        resourceTypeId,
        resourceTypeName: typeName,
        requested: requestedCount,
        available: candidates.length,
        reason: `Only ${candidates.length} of ${requestedCount} ${typeName} available`,
      });
    }
  }

  return {
    success: failedAllocations.length === 0,
    assignments,
    failedAllocations,
  };
}
