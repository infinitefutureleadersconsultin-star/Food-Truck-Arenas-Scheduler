// User types
export type {
  UserRole,
  UserStatus,
  VehicleSize,
  DocumentType,
  DocumentStatus,
  TeamMemberRole,
  TeamPermission,
  TeamMember,
  UserDocument,
  DefaultResources,
  User,
} from './user';
export { ROLE_DEFAULT_PERMISSIONS } from './user';

// Resource types
export type {
  ResourceStatus,
  ResourcePosition,
  MaintenanceSchedule,
  ResourceType,
  Resource,
} from './resource';

// Booking types
export type {
  BookingStatus,
  RecurringFrequency,
  CheckInMethod,
  CheckInType,
  WaitlistStatus,
  BookingResource,
  RecurringPattern,
  Booking,
  WaitlistEntry,
  AssignedResource,
  CheckIn,
  ResourceAllocation,
  AvailabilityResult,
} from './booking';

// Settings and communication types
export type {
  AnnouncementType,
  AnnouncementPriority,
  MessageType,
  IssueCategory,
  IssueStatus,
  AttendanceStatus,
  OperatingHoursEntry,
  BookingRules,
  BlackoutDate,
  MaintenanceBlock,
  CommissarySettings,
  Announcement,
  MessageAttachment,
  Message,
  IssueReport,
  AttendanceLog,
  FeedbackCategory,
  FeedbackStatus,
  Feedback,
  FeatureStatus,
  PlatformFeature,
  ConfirmationStatus,
  CheckInConfirmation,
  NotificationPreferences,
} from './settings';
