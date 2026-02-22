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
  const docRef = doc(db, COLLECTION, SETTINGS_DOC);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: 'commissary', ...snapshot.data() } as CommissarySettings;
}

export async function updateSettings(
  updates: Partial<CommissarySettings>,
  updatedBy: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, SETTINGS_DOC);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
    updatedBy,
  });
}

export async function initializeSettings(settings: CommissarySettings): Promise<void> {
  const docRef = doc(db, COLLECTION, SETTINGS_DOC);
  await setDoc(docRef, {
    ...settings,
    updatedAt: Timestamp.now(),
  });
}

export async function addBlackoutDate(date: string, reason: string, updatedBy: string): Promise<void> {
  const docRef = doc(db, COLLECTION, SETTINGS_DOC);
  await updateDoc(docRef, {
    blackoutDates: arrayUnion({ date, reason }),
    updatedAt: Timestamp.now(),
    updatedBy,
  });
}

export async function removeBlackoutDate(date: string, reason: string, updatedBy: string): Promise<void> {
  const docRef = doc(db, COLLECTION, SETTINGS_DOC);
  await updateDoc(docRef, {
    blackoutDates: arrayRemove({ date, reason }),
    updatedAt: Timestamp.now(),
    updatedBy,
  });
}

export async function addMaintenanceBlock(
  block: { dayOfWeek: number; startTime: string; endTime: string; reason: string },
  updatedBy: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, SETTINGS_DOC);
  await updateDoc(docRef, {
    maintenanceBlocks: arrayUnion(block),
    updatedAt: Timestamp.now(),
    updatedBy,
  });
}

export async function removeMaintenanceBlock(
  block: { dayOfWeek: number; startTime: string; endTime: string; reason: string },
  updatedBy: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, SETTINGS_DOC);
  await updateDoc(docRef, {
    maintenanceBlocks: arrayRemove(block),
    updatedAt: Timestamp.now(),
    updatedBy,
  });
}
