import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Message } from '@/lib/types';

const COLLECTION = 'messages';

export async function sendMessage(data: Omit<Message, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      isRead: false,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function getMessages(
  userId: string,
  type: 'sent' | 'received' = 'received'
): Promise<Message[]> {
  try {
    const field = type === 'sent' ? 'senderId' : 'receiverId';
    const q = query(
      collection(db, COLLECTION),
      where(field, '==', userId)
    );
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
    // Sort client-side to avoid requiring a composite index
    messages.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

export async function getMessage(id: string): Promise<Message | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Message;
  } catch (error) {
    console.error('Error getting message:', error);
    throw error;
  }
}

export async function markMessageRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), { isRead: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('receiverId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}
