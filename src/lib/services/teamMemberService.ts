import {
  doc,
  updateDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { TeamMember, TeamMemberRole, TeamPermission } from '@/lib/types';
import { ROLE_DEFAULT_PERMISSIONS } from '@/lib/types';

const USERS_COLLECTION = 'users';

let teamMemberIdCounter = 0;
function generateTeamMemberId(): string {
  teamMemberIdCounter += 1;
  return `tm-${Date.now()}-${teamMemberIdCounter}`;
}

export async function addTeamMember(
  userId: string,
  name: string,
  email: string,
  phone: string,
  role: TeamMemberRole
): Promise<TeamMember> {
  try {
    const newMember: TeamMember = {
      id: generateTeamMemberId(),
      name,
      email,
      phone,
      role,
      permissions: [...ROLE_DEFAULT_PERMISSIONS[role]],
      isActive: true,
      invitedAt: Timestamp.now(),
      joinedAt: null,
    };

    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      teamMembers: arrayUnion(newMember),
      updatedAt: Timestamp.now(),
    });

    return newMember;
  } catch (error) {
    console.error('Error adding team member:', error);
    throw error;
  }
}

export async function removeTeamMember(
  userId: string,
  member: TeamMember
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      teamMembers: arrayRemove(member),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
}

export async function updateTeamMember(
  userId: string,
  currentMembers: TeamMember[],
  memberId: string,
  updates: Partial<Pick<TeamMember, 'name' | 'email' | 'phone' | 'role' | 'permissions' | 'isActive'>>
): Promise<TeamMember[]> {
  try {
    const updatedMembers = currentMembers.map((m) => {
      if (m.id !== memberId) return m;

      const updated = { ...m, ...updates };
      // If role changed, reset permissions to role defaults unless custom permissions were provided
      if (updates.role && !updates.permissions) {
        updated.permissions = [...ROLE_DEFAULT_PERMISSIONS[updates.role]];
      }
      return updated;
    });

    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      teamMembers: updatedMembers,
      updatedAt: Timestamp.now(),
    });

    return updatedMembers;
  } catch (error) {
    console.error('Error updating team member:', error);
    throw error;
  }
}

export async function updateTeamMemberPermissions(
  userId: string,
  currentMembers: TeamMember[],
  memberId: string,
  permissions: TeamPermission[]
): Promise<TeamMember[]> {
  return updateTeamMember(userId, currentMembers, memberId, { permissions });
}
