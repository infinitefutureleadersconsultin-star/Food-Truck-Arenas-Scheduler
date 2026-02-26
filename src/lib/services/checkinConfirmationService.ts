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
import type { CheckInConfirmation, ConfirmationStatus } from '@/lib/types';
import { createNotification } from './notificationService';

const COLLECTION = 'checkInConfirmations';

/**
 * Create a check-in confirmation record for a booking.
 * This is called when a booking is confirmed for a given date.
 * The vendor must confirm attendance at 9 AM on the day of their appointment.
 */
export async function createCheckInConfirmation(
  bookingId: string,
  userId: string,
  userName: string,
  businessName: string,
  date: string,
  startTime: string,
  endTime: string,
  assignedTeamMemberId?: string,
  assignedTeamMemberName?: string
): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION), {
      bookingId,
      userId,
      userName,
      businessName,
      date,
      startTime,
      endTime,
      assignedTeamMemberId: assignedTeamMemberId || null,
      assignedTeamMemberName: assignedTeamMemberName || null,
      confirmationStatus: 'pending' as ConfirmationStatus,
      confirmedAt: null,
      forwardedToTeamAt: null,
      reminderSentAt: null,
      createdAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating check-in confirmation:', error);
    throw error;
  }
}

/**
 * Customer confirms their attendance for the day.
 * Automatically forwards the confirmation to the assigned team member.
 */
export async function confirmAttendance(
  confirmationId: string,
  assignedTeamMemberId?: string,
  assignedTeamMemberName?: string
): Promise<void> {
  try {
    const now = Timestamp.now();
    const updates: Record<string, unknown> = {
      confirmationStatus: 'confirmed' as ConfirmationStatus,
      confirmedAt: now,
    };

    // If a team member is assigned, mark that the confirmation was forwarded
    if (assignedTeamMemberId) {
      updates.forwardedToTeamAt = now;
      updates.assignedTeamMemberId = assignedTeamMemberId;
      updates.assignedTeamMemberName = assignedTeamMemberName || null;
    }

    await updateDoc(doc(db, COLLECTION, confirmationId), updates);

    // Send notification to the assigned team member (via admin notifications)
    if (assignedTeamMemberId) {
      await createNotification(
        assignedTeamMemberId,
        'Attendance Confirmed',
        `Customer has confirmed attendance for today's booking. Please prepare for their arrival.`,
        'success'
      );
    }
  } catch (error) {
    console.error('Error confirming attendance:', error);
    throw error;
  }
}

/**
 * Get all confirmations for a specific date.
 */
export async function getConfirmationsByDate(
  date: string
): Promise<CheckInConfirmation[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('date', '==', date),
      orderBy('startTime', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CheckInConfirmation
    );
  } catch (error) {
    console.error('Error getting confirmations by date:', error);
    throw error;
  }
}

/**
 * Get confirmations for a specific user on a specific date.
 */
export async function getUserConfirmations(
  userId: string,
  date: string
): Promise<CheckInConfirmation[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('date', '==', date)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CheckInConfirmation
    );
  } catch (error) {
    console.error('Error getting user confirmations:', error);
    throw error;
  }
}

/**
 * Get all pending (not confirmed) entries for a date.
 * Used by admin to see who hasn't confirmed.
 */
export async function getPendingConfirmations(
  date: string
): Promise<CheckInConfirmation[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('date', '==', date),
      where('confirmationStatus', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CheckInConfirmation
    );
  } catch (error) {
    console.error('Error getting pending confirmations:', error);
    throw error;
  }
}

/**
 * Mark a confirmation as not confirmed (admin action or timeout).
 */
export async function markNotConfirmed(
  confirmationId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, confirmationId), {
      confirmationStatus: 'not_confirmed' as ConfirmationStatus,
    });
  } catch (error) {
    console.error('Error marking not confirmed:', error);
    throw error;
  }
}

/**
 * Send a reminder notification to the user to confirm attendance.
 */
export async function sendConfirmationReminder(
  confirmationId: string,
  userId: string,
  date: string,
  startTime: string
): Promise<void> {
  try {
    await createNotification(
      userId,
      'Confirm Your Attendance',
      `Please confirm your attendance for today's booking at ${startTime}. Check in on the platform to confirm.`,
      'warning'
    );
    await updateDoc(doc(db, COLLECTION, confirmationId), {
      reminderSentAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error sending confirmation reminder:', error);
    throw error;
  }
}
