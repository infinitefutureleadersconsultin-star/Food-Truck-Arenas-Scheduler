import { Timestamp } from 'firebase/firestore';

export type UserRole = 'vendor' | 'admin' | 'team_member';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type VehicleSize = 'small' | 'medium' | 'large' | 'trailer';
export type DocumentType = 'permit' | 'insurance' | 'license' | 'health_cert';
export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired';

export type TeamMemberRole = 'manager' | 'staff' | 'viewer';

export type TeamPermission =
  | 'view_bookings'
  | 'manage_bookings'
  | 'view_calendar'
  | 'check_in'
  | 'view_messages'
  | 'send_messages'
  | 'view_analytics'
  | 'manage_resources'
  | 'manage_vendors'
  | 'manage_settings'
  | 'manage_team';

export const ROLE_DEFAULT_PERMISSIONS: Record<TeamMemberRole, TeamPermission[]> = {
  manager: [
    'view_bookings', 'manage_bookings', 'view_calendar', 'check_in',
    'view_messages', 'send_messages', 'view_analytics', 'manage_resources',
    'manage_vendors',
  ],
  staff: [
    'view_bookings', 'view_calendar', 'check_in',
    'view_messages', 'send_messages',
  ],
  viewer: [
    'view_bookings', 'view_calendar', 'view_messages',
  ],
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: TeamMemberRole;
  permissions: TeamPermission[];
  isActive: boolean;
  invitedAt: Timestamp;
  joinedAt: Timestamp | null;
}

export interface UserDocument {
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: Timestamp;
  expiresAt: Timestamp;
  status: DocumentStatus;
}

export interface DefaultResources {
  tables: number;
  fridges: number;
  freezers: number;
  storage: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  businessName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  vehicleSize: VehicleSize;
  defaultResources: DefaultResources;
  teamMembers: TeamMember[];
  documents: UserDocument[];
  adminNotes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  profileImageUrl: string;
}
