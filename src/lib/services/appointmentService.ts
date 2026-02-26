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
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { createNotification } from './notificationService';
import type { Appointment, AppointmentType, AppointmentStatus } from '@/lib/types';

const COLLECTION = 'appointments';

/**
 * Check if a time slot is already taken on a given date.
 * Returns conflicting appointments so we can prevent double-booking.
 */
export async function getConflictingAppointments(
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<Appointment[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('date', '==', date),
      where('status', 'in', ['pending', 'confirmed', 'checked_in'])
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Appointment)
      .filter((appt) => {
        if (excludeId && appt.id === excludeId) return false;
        // Check time overlap
        return appt.startTime < endTime && appt.endTime > startTime;
      });
  } catch (error) {
    console.error('Error checking appointment conflicts:', error);
    throw error;
  }
}

/**
 * Schedule a new appointment (walk-through, meeting, etc.).
 * Validates no time conflict exists before creating.
 */
export async function scheduleAppointment(
  userId: string,
  userName: string,
  userEmail: string,
  userPhone: string,
  businessName: string,
  type: AppointmentType,
  purpose: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<string> {
  try {
    // Check for conflicts
    const conflicts = await getConflictingAppointments(date, startTime, endTime);
    if (conflicts.length > 0) {
      throw new Error(
        `This time slot is already booked. Please choose a different time or date.`
      );
    }

    // Enforce 24-hour advance notice
    const now = new Date();
    const appointmentDate = new Date(date + 'T' + startTime + ':00');
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      throw new Error('Appointments must be scheduled at least 24 hours in advance.');
    }

    const nowTs = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION), {
      userId,
      userName,
      userEmail,
      userPhone,
      businessName,
      type,
      purpose,
      date,
      startTime,
      endTime,
      status: 'pending' as AppointmentStatus,
      checkedInAt: null,
      checkedInMorningOf: false,
      morningCheckInAt: null,
      assignedTeamMemberId: null,
      assignedTeamMemberName: null,
      adminNotes: '',
      cancelReason: '',
      createdAt: nowTs,
      updatedAt: nowTs,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    throw error;
  }
}

/**
 * Get a single appointment by ID.
 */
export async function getAppointment(id: string): Promise<Appointment | null> {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Appointment;
  } catch (error) {
    console.error('Error getting appointment:', error);
    throw error;
  }
}

/**
 * Get all appointments for a user.
 */
export async function getUserAppointments(userId: string): Promise<Appointment[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Appointment
    );
  } catch (error) {
    console.error('Error getting user appointments:', error);
    throw error;
  }
}

/**
 * Get all appointments for a specific date (admin view).
 */
export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('date', '==', date),
      orderBy('startTime', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Appointment
    );
  } catch (error) {
    console.error('Error getting appointments by date:', error);
    throw error;
  }
}

/**
 * Get all appointments (admin), optionally filtered by status.
 */
export async function getAllAppointments(
  status?: AppointmentStatus
): Promise<Appointment[]> {
  try {
    const constraints: QueryConstraint[] = [orderBy('date', 'desc')];
    if (status) {
      constraints.unshift(where('status', '==', status));
    }
    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Appointment
    );
  } catch (error) {
    console.error('Error getting all appointments:', error);
    throw error;
  }
}

/**
 * Morning-of check-in: customer confirms they're coming (by 10 AM).
 * If they don't check in by 10 AM, the appointment is auto-cancelled.
 */
export async function morningCheckIn(appointmentId: string): Promise<void> {
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, COLLECTION, appointmentId), {
      checkedInMorningOf: true,
      morningCheckInAt: now,
      status: 'confirmed' as AppointmentStatus,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error performing morning check-in:', error);
    throw error;
  }
}

/**
 * Admin confirms/approves a pending appointment and optionally assigns a team member.
 */
export async function confirmAppointment(
  appointmentId: string,
  teamMemberId?: string,
  teamMemberName?: string
): Promise<void> {
  try {
    const now = Timestamp.now();
    const updates: Record<string, unknown> = {
      status: 'confirmed' as AppointmentStatus,
      updatedAt: now,
    };
    if (teamMemberId) {
      updates.assignedTeamMemberId = teamMemberId;
      updates.assignedTeamMemberName = teamMemberName || null;
    }
    await updateDoc(doc(db, COLLECTION, appointmentId), updates);
  } catch (error) {
    console.error('Error confirming appointment:', error);
    throw error;
  }
}

/**
 * Cancel an appointment. Requires a reason.
 */
export async function cancelAppointment(
  appointmentId: string,
  reason: string
): Promise<void> {
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, COLLECTION, appointmentId), {
      status: 'cancelled' as AppointmentStatus,
      cancelReason: reason,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw error;
  }
}

/**
 * Mark appointment as no-show (admin, or auto by scheduled function).
 */
export async function markAppointmentNoShow(appointmentId: string): Promise<void> {
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, COLLECTION, appointmentId), {
      status: 'no_show' as AppointmentStatus,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error marking appointment as no-show:', error);
    throw error;
  }
}

/**
 * Complete an appointment (admin marks it done after the visit).
 */
export async function completeAppointment(appointmentId: string): Promise<void> {
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, COLLECTION, appointmentId), {
      status: 'completed' as AppointmentStatus,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error completing appointment:', error);
    throw error;
  }
}

/**
 * Admin adds notes to an appointment.
 */
export async function updateAppointmentNotes(
  appointmentId: string,
  adminNotes: string
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, appointmentId), {
      adminNotes,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating appointment notes:', error);
    throw error;
  }
}

/**
 * Get available time slots for a given date.
 * Returns which hours are already booked.
 */
export async function getBookedSlotsForDate(
  date: string
): Promise<{ startTime: string; endTime: string }[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('date', '==', date),
      where('status', 'in', ['pending', 'confirmed', 'checked_in'])
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return { startTime: data.startTime, endTime: data.endTime };
    });
  } catch (error) {
    console.error('Error getting booked slots:', error);
    throw error;
  }
}
