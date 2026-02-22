import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { User, UserStatus } from '@/lib/types';

const USERS_COLLECTION = 'users';

/**
 * Create a new user document in Firestore.
 * Uses setDoc with the Firebase Auth UID as the document ID.
 */
export async function createUser(
  userData: Omit<User, 'createdAt' | 'updatedAt' | 'lastLoginAt'>
): Promise<void> {
  try {
    const now = Timestamp.now();
    const userRef = doc(db, USERS_COLLECTION, userData.id);

    await setDoc(userRef, {
      ...userData,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get a single user by ID.
 */
export async function getUser(id: string): Promise<User | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as User;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Update a user document.
 */
export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Get all vendor users, optionally filtered by status.
 */
export async function getAllVendors(status?: UserStatus): Promise<User[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('role', '==', 'vendor'),
      orderBy('businessName', 'asc'),
    ];

    if (status) {
      constraints.push(where('status', '==', status));
    }

    const q = query(collection(db, USERS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as User
    );
  } catch (error) {
    console.error('Error getting all vendors:', error);
    throw error;
  }
}

/**
 * Update a vendor's status (admin action).
 */
export async function updateVendorStatus(
  userId: string,
  status: UserStatus
): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating vendor status:', error);
    throw error;
  }
}

/**
 * Search vendors by display name or business name.
 * Performs a client-side filter after fetching all vendors
 * since Firestore does not natively support full-text search.
 */
export async function searchVendors(searchTerm: string): Promise<User[]> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('role', '==', 'vendor')
    );
    const snapshot = await getDocs(q);

    const lowerSearch = searchTerm.toLowerCase();

    return snapshot.docs
      .map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as User
      )
      .filter(
        (user) =>
          user.displayName.toLowerCase().includes(lowerSearch) ||
          user.businessName.toLowerCase().includes(lowerSearch)
      );
  } catch (error) {
    console.error('Error searching vendors:', error);
    throw error;
  }
}

/**
 * Delete a user document from Firestore.
 */
export async function deleteUser(id: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Update the last login timestamp for a user.
 */
export async function updateLastLogin(id: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await updateDoc(docRef, {
      lastLoginAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
}
