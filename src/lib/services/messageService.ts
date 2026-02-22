import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Message } from '@/lib/types';

const COLLECTION = 'messages';

export async function sendMessage(data: Omit<Message, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    isRead: false,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getMessages(
  userId: string,
  type: 'sent' | 'received' = 'received'
): Promise<Message[]> {
  const field = type === 'sent' ? 'senderId' : 'receiverId';
  const q = query(
    collection(db, COLLECTION),
    where(field, '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
}

export async function getMessage(id: string): Promise<Message | null> {
  const docRef = doc(db, COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Message;
}

export async function markMessageRead(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { isRead: true });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('receiverId', '==', userId),
    where('isRead', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}
