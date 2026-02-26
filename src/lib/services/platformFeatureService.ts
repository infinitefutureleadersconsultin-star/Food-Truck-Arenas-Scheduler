import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { PlatformFeature, FeatureStatus } from '@/lib/types';

const COLLECTION = 'platformFeatures';

export async function createPlatformFeature(
  name: string,
  description: string,
  status: FeatureStatus = 'planned'
): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION), {
      name,
      description,
      status,
      releaseDate: null,
      isEnabled: status === 'released',
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating platform feature:', error);
    throw error;
  }
}

export async function getAllPlatformFeatures(): Promise<PlatformFeature[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as PlatformFeature
    );
  } catch (error) {
    console.error('Error getting platform features:', error);
    throw error;
  }
}

export async function updatePlatformFeature(
  id: string,
  updates: Partial<Pick<PlatformFeature, 'name' | 'description' | 'status' | 'isEnabled'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating platform feature:', error);
    throw error;
  }
}

export async function deletePlatformFeature(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Error deleting platform feature:', error);
    throw error;
  }
}
