import { Timestamp } from 'firebase/firestore';

export type ResourceStatus = 'available' | 'in_use' | 'maintenance' | 'broken' | 'locked';

export interface ResourcePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface MaintenanceSchedule {
  lastMaintenance: Timestamp;
  nextMaintenance: Timestamp;
  notes: string;
}

export interface ResourceType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  totalQuantity: number;
  trackIndividually: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Resource {
  id: string;
  typeId: string;
  typeName: string;
  name: string;
  label: string;
  status: ResourceStatus;
  locationDescription: string;
  notes: string;
  position: ResourcePosition;
  maintenanceSchedule: MaintenanceSchedule;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
