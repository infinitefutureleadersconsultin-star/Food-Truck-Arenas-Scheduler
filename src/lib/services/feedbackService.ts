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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '@/lib/types';

const COLLECTION = 'feedback';

export async function submitFeedback(
  userId: string,
  userName: string,
  userEmail: string,
  category: FeedbackCategory,
  subject: string,
  description: string
): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION), {
      userId,
      userName,
      userEmail,
      category,
      subject,
      description,
      status: 'new' as FeedbackStatus,
      adminResponse: '',
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
}

export async function getAllFeedback(
  status?: FeedbackStatus
): Promise<Feedback[]> {
  try {
    const constraints = [orderBy('createdAt', 'desc')];
    if (status) {
      constraints.unshift(where('status', '==', status));
    }
    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Feedback
    );
  } catch (error) {
    console.error('Error getting feedback:', error);
    throw error;
  }
}

export async function getUserFeedback(userId: string): Promise<Feedback[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Feedback
    );
  } catch (error) {
    console.error('Error getting user feedback:', error);
    throw error;
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
  adminResponse?: string
): Promise<void> {
  try {
    const updates: Record<string, unknown> = {
      status,
      updatedAt: Timestamp.now(),
    };
    if (adminResponse !== undefined) {
      updates.adminResponse = adminResponse;
    }
    await updateDoc(doc(db, COLLECTION, feedbackId), updates);
  } catch (error) {
    console.error('Error updating feedback status:', error);
    throw error;
  }
}
