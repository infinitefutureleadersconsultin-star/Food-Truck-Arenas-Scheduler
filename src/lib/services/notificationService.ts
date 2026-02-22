import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Timestamp;
}

const COLLECTION = 'notifications';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { read: true });
}

export async function markAllRead(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}
