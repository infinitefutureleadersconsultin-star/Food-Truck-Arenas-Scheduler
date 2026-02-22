import { Timestamp } from 'firebase/firestore';

export type AnnouncementType = 'general' | 'maintenance' | 'emergency' | 'policy';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageType = 'general' | 'issue_report' | 'booking_question' | 'maintenance';
export type IssueCategory = 'broken_equipment' | 'cleanliness' | 'safety' | 'other';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';
export type AttendanceStatus = 'on_time' | 'late' | 'early_leave' | 'no_show' | 'completed';

export interface OperatingHoursEntry {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface BookingRules {
  minBookingDuration: number;
  maxBookingDuration: number;
  bookingCutoffHours: number;
  cancellationCutoffHours: number;
  maxAdvanceBookingDays: number;
  maxVendorsPerSlot: number;
  autoConfirm: boolean;
  allowRecurring: boolean;
  maxRecurringWeeks: number;
}

export interface BlackoutDate {
  date: string;
  reason: string;
}

export interface MaintenanceBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface CommissarySettings {
  id: 'commissary';
  facilityName: string;
  address: string;
  phone: string;
  email: string;
  operatingHours: Record<string, OperatingHoursEntry>;
  bookingRules: BookingRules;
  blackoutDates: BlackoutDate[];
  maintenanceBlocks: MaintenanceBlock[];
  checkInWindow: number;
  noShowThreshold: number;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  targetAudience: 'all' | 'active_vendors' | string[];
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  readBy: string[];
}

export interface MessageAttachment {
  fileName: string;
  fileUrl: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  subject: string;
  body: string;
  type: MessageType;
  attachments: MessageAttachment[];
  isRead: boolean;
  createdAt: Timestamp;
}

export interface IssueReport {
  id: string;
  reportedBy: string;
  reportedByName: string;
  resourceId: string | null;
  resourceName: string | null;
  category: IssueCategory;
  description: string;
  photoUrls: string[];
  status: IssueStatus;
  adminResponse: string;
  resolvedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  businessName: string;
  bookingId: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualCheckIn: Timestamp | null;
  actualCheckOut: Timestamp | null;
  status: AttendanceStatus;
  lateMinutes: number;
  createdAt: Timestamp;
}
