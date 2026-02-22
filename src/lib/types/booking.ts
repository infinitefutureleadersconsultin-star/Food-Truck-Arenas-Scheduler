import { Timestamp } from 'firebase/firestore';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type CheckInMethod = 'qr' | 'button' | 'admin';
export type CheckInType = 'check_in' | 'check_out';
export type WaitlistStatus = 'waiting' | 'notified' | 'expired' | 'booked';

export interface BookingResource {
  resourceId: string;
  resourceTypeId: string;
  resourceName: string;
  resourceTypeName: string;
}

export interface RecurringPattern {
  frequency: RecurringFrequency;
  daysOfWeek: number[];
  endDate: string;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  businessName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "08:00"
  endTime: string;
  startTimestamp: Timestamp;
  endTimestamp: Timestamp;
  status: BookingStatus;
  resources: BookingResource[];
  resourceRequests: Record<string, number>;
  isRecurring: boolean;
  recurringId: string | null;
  recurringPattern: RecurringPattern | null;
  checkInTime: Timestamp | null;
  checkOutTime: Timestamp | null;
  checkInMethod: CheckInMethod | null;
  notes: string;
  adminNotes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  cancelledAt: Timestamp | null;
  cancelledBy: string | null;
  cancelReason: string;
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  userName: string;
  businessName: string;
  date: string;
  preferredStartTime: string;
  preferredEndTime: string;
  resourceRequests: Record<string, number>;
  status: WaitlistStatus;
  notifiedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface AssignedResource {
  resourceId: string;
  resourceName: string;
}

export interface CheckIn {
  id: string;
  bookingId: string;
  userId: string;
  type: CheckInType;
  method: CheckInMethod;
  timestamp: Timestamp;
  assignedResources: AssignedResource[];
  photoUrl: string | null;
}

export interface ResourceAllocation {
  resourceTypeId: string;
  resourceTypeName: string;
  totalAvailable: number;
  totalBooked: number;
  remaining: number;
  individualResources?: {
    resourceId: string;
    resourceName: string;
    isAvailable: boolean;
  }[];
}

export interface AvailabilityResult {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  allocations: ResourceAllocation[];
  conflicts: {
    resourceTypeId: string;
    resourceTypeName: string;
    requested: number;
    available: number;
  }[];
}
