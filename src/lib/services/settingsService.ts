import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CommissarySettings } from '@/lib/types';

const SETTINGS_DOC = 'commissary';
const COLLECTION = 'settings';

export async function getSettings(): Promise<CommissarySettings | null> {
  try {
    const docRef = doc(db, COLLECTION, SETTINGS_DOC);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: 'commissary', ...snapshot.data() } as CommissarySettings;
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
}

export async function updateSettings(
  updates: Partial<CommissarySettings>,
  updatedBy: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, SETTINGS_DOC);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

export async function initializeSettings(settings: CommissarySettings): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, SETTINGS_DOC);
    await setDoc(docRef, {
      ...settings,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error initializing settings:', error);
    throw error;
  }
}

export async function addBlackoutDate(date: string, reason: string, updatedBy: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, SETTINGS_DOC);
    await updateDoc(docRef, {
      blackoutDates: arrayUnion({ date, reason }),
      updatedAt: Timestamp.now(),
      updatedBy,
    });
  } catch (error) {
    console.error('Error adding blackout date:', error);
    throw error;
  }
}

export async function removeBlackoutDate(date: string, reason: string, updatedBy: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, SETTINGS_DOC);
    await updateDoc(docRef, {
      blackoutDates: arrayRemove({ date, reason }),
      updatedAt: Timestamp.now(),
      updatedBy,
    });
  } catch (error) {
    console.error('Error removing blackout date:', error);
    throw error;
  }
}

export async function addMaintenanceBlock(
  block: { dayOfWeek: number; startTime: string; endTime: string; reason: string },
  updatedBy: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, SETTINGS_DOC);
    await updateDoc(docRef, {
      maintenanceBlocks: arrayUnion(block),
      updatedAt: Timestamp.now(),
      updatedBy,
    });
  } catch (error) {
    console.error('Error adding maintenance block:', error);
    throw error;
  }
}

export async function removeMaintenanceBlock(
  block: { dayOfWeek: number; startTime: string; endTime: string; reason: string },
  updatedBy: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, SETTINGS_DOC);
    await updateDoc(docRef, {
      maintenanceBlocks: arrayRemove(block),
      updatedAt: Timestamp.now(),
      updatedBy,
    });
  } catch (error) {
    console.error('Error removing maintenance block:', error);
    throw error;
  }
}
