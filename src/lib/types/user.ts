import { Timestamp } from 'firebase/firestore';

export type UserRole = 'vendor' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type VehicleSize = 'small' | 'medium' | 'large' | 'trailer';
export type DocumentType = 'permit' | 'insurance' | 'license' | 'health_cert';
export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired';

export interface TeamMember {
  name: string;
  email: string;
  phone: string;
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
