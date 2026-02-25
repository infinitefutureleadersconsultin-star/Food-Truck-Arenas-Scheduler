import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { AttendanceLog, AttendanceStatus } from '@/lib/types';

const ATTENDANCE_COLLECTION = 'attendance';
const BOOKINGS_COLLECTION = 'bookings';

/**
 * Log an attendance record for a booking.
 */
export async function logAttendance(
  bookingId: string,
  userId: string,
  data: {
    userName: string;
    businessName: string;
    date: string;
    scheduledStart: string;
    scheduledEnd: string;
    actualCheckIn?: Timestamp | null;
    actualCheckOut?: Timestamp | null;
    status: AttendanceStatus;
    lateMinutes?: number;
  }
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), {
      userId,
      bookingId,
      userName: data.userName,
      businessName: data.businessName,
      date: data.date,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      actualCheckIn: data.actualCheckIn || null,
      actualCheckOut: data.actualCheckOut || null,
      status: data.status,
      lateMinutes: data.lateMinutes || 0,
      createdAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error logging attendance:', error);
    throw error;
  }
}

/**
 * Get attendance records for a specific user, optionally within a date range.
 */
export async function getAttendanceByUser(
  userId: string,
  dateRange?: { start: string; end: string }
): Promise<AttendanceLog[]> {
  try {
    const constraints = [
      where('userId', '==', userId),
      orderBy('date', 'desc'),
    ];

    const q = query(collection(db, ATTENDANCE_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    let records = snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as AttendanceLog
    );

    // Filter by date range client-side
    if (dateRange) {
      records = records.filter(
        (r) => r.date >= dateRange.start && r.date <= dateRange.end
      );
    }

    return records;
  } catch (error) {
    console.error('Error getting attendance by user:', error);
    throw error;
  }
}

/**
 * Get all attendance records for a specific date.
 */
export async function getAttendanceByDate(
  date: string
): Promise<AttendanceLog[]> {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('date', '==', date),
      orderBy('scheduledStart', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as AttendanceLog
    );
  } catch (error) {
    console.error('Error getting attendance by date:', error);
    throw error;
  }
}

/**
 * Calculate attendance statistics for a user (or all users if no userId provided).
 * Returns percentages for on-time, late, no-show, etc.
 */
export async function getAttendanceStats(
  userId?: string
): Promise<{
  total: number;
  onTime: number;
  onTimePercent: number;
  late: number;
  latePercent: number;
  noShow: number;
  noShowPercent: number;
  earlyLeave: number;
  earlyLeavePercent: number;
  completed: number;
  completedPercent: number;
}> {
  try {
    let q;

    if (userId) {
      q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('userId', '==', userId)
      );
    } else {
      q = query(collection(db, ATTENDANCE_COLLECTION));
    }

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map((docSnap) => docSnap.data());

    const total = records.length;

    if (total === 0) {
      return {
        total: 0,
        onTime: 0,
        onTimePercent: 0,
        late: 0,
        latePercent: 0,
        noShow: 0,
        noShowPercent: 0,
        earlyLeave: 0,
        earlyLeavePercent: 0,
        completed: 0,
        completedPercent: 0,
      };
    }

    const onTime = records.filter((r) => r.status === 'on_time').length;
    const late = records.filter((r) => r.status === 'late').length;
    const noShow = records.filter((r) => r.status === 'no_show').length;
    const earlyLeave = records.filter(
      (r) => r.status === 'early_leave'
    ).length;
    const completed = records.filter(
      (r) => r.status === 'completed'
    ).length;

    return {
      total,
      onTime,
      onTimePercent: Math.round((onTime / total) * 100),
      late,
      latePercent: Math.round((late / total) * 100),
      noShow,
      noShowPercent: Math.round((noShow / total) * 100),
      earlyLeave,
      earlyLeavePercent: Math.round((earlyLeave / total) * 100),
      completed,
      completedPercent: Math.round((completed / total) * 100),
    };
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    throw error;
  }
}

/**
 * Mark a booking as a no-show.
 * Updates both the attendance log and the booking status.
 */
export async function markNoShow(bookingId: string): Promise<void> {
  try {
    // Update the booking status and create/update attendance log atomically
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const booking = bookingSnap.data();
    const now = Timestamp.now();

    // Check if an attendance log already exists for this booking
    const existingQuery = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('bookingId', '==', bookingId)
    );
    const existingSnap = await getDocs(existingQuery);

    // Use batch to make all writes atomic
    const batch = writeBatch(db);

    batch.update(bookingRef, {
      status: 'no_show',
      updatedAt: now,
    });

    if (existingSnap.empty) {
      // Create a new attendance log with no-show status
      const newLogRef = doc(collection(db, ATTENDANCE_COLLECTION));
      batch.set(newLogRef, {
        userId: booking.userId,
        userName: booking.userName,
        businessName: booking.businessName,
        bookingId,
        date: booking.date,
        scheduledStart: booking.startTime,
        scheduledEnd: booking.endTime,
        actualCheckIn: null,
        actualCheckOut: null,
        status: 'no_show',
        lateMinutes: 0,
        createdAt: now,
      });
    } else {
      // Update the existing attendance log
      batch.update(existingSnap.docs[0].ref, {
        status: 'no_show',
      });
    }

    await batch.commit();
  } catch (error) {
    console.error('Error marking no-show:', error);
    throw error;
  }
}

/**
 * Override an attendance record's status (admin action).
 */
export async function overrideAttendance(
  logId: string,
  status: AttendanceStatus
): Promise<void> {
  try {
    const docRef = doc(db, ATTENDANCE_COLLECTION, logId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Attendance log ${logId} not found`);
    }

    await updateDoc(docRef, {
      status,
    });
  } catch (error) {
    console.error('Error overriding attendance:', error);
    throw error;
  }
}
