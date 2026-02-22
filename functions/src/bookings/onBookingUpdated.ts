import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface BookingData {
  vendorId: string;
  vendorName?: string;
  bayId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  checkedInAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

/**
 * Firestore trigger: runs when a booking document is updated.
 * - If status changed to 'cancelled': check the waitlist for that slot
 *   and offer it to the next vendor in line.
 * - If status changed to 'no_show': create an attendance log entry
 *   in the attendanceLogs collection.
 */
export const onBookingUpdated = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(
    async (
      change: functions.Change<functions.firestore.QueryDocumentSnapshot>,
      context: functions.EventContext
    ): Promise<void> => {
      const bookingId = context.params.bookingId;
      const beforeData = change.before.data() as BookingData;
      const afterData = change.after.data() as BookingData;

      // Only proceed if the status actually changed
      if (beforeData.status === afterData.status) {
        return;
      }

      const db = admin.firestore();

      functions.logger.info(
        `Booking ${bookingId} status changed: ${beforeData.status} -> ${afterData.status}`
      );

      try {
        // Handle cancellation: check the waitlist for the freed slot
        if (afterData.status === "cancelled") {
          await handleCancellation(db, bookingId, afterData);
        }

        // Handle no-show: create attendance log
        if (afterData.status === "no_show") {
          await handleNoShow(db, bookingId, afterData);
        }
      } catch (error) {
        functions.logger.error(
          `Error processing booking update for ${bookingId}:`,
          error
        );
        throw error;
      }
    }
  );

/**
 * When a booking is cancelled, check the waitlist for that bay/date/time slot.
 * If a waitlisted vendor exists, notify them (stub) and optionally create
 * a pending booking for them.
 */
async function handleCancellation(
  db: admin.firestore.Firestore,
  bookingId: string,
  bookingData: BookingData
): Promise<void> {
  functions.logger.info(
    `Checking waitlist for cancelled booking ${bookingId}`,
    {
      bayId: bookingData.bayId,
      date: bookingData.date,
      startTime: bookingData.startTime,
    }
  );

  // Query the waitlist for matching bay, date, and time slot
  const waitlistQuery = await db
    .collection("waitlist")
    .where("bayId", "==", bookingData.bayId)
    .where("date", "==", bookingData.date)
    .where("startTime", "==", bookingData.startTime)
    .where("status", "==", "waiting")
    .orderBy("createdAt", "asc")
    .limit(1)
    .get();

  if (waitlistQuery.empty) {
    functions.logger.info(
      `No waitlisted vendors for slot: bay=${bookingData.bayId}, date=${bookingData.date}, time=${bookingData.startTime}`
    );
    return;
  }

  const waitlistEntry = waitlistQuery.docs[0];
  const waitlistData = waitlistEntry.data();

  // Update waitlist entry status to 'offered'
  await waitlistEntry.ref.update({
    status: "offered",
    offeredAt: admin.firestore.FieldValue.serverTimestamp(),
    offeredBookingId: bookingId,
  });

  // Stub: Send notification to the waitlisted vendor
  console.log(
    `[NOTIFICATION STUB] Slot available for vendor ${waitlistData.vendorId}`,
    {
      bayId: bookingData.bayId,
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
    }
  );

  functions.logger.info(
    `Waitlist entry ${waitlistEntry.id} offered to vendor ${waitlistData.vendorId}`
  );
}

/**
 * When a booking is marked as no-show, create an attendance log entry
 * to track the vendor's attendance record.
 */
async function handleNoShow(
  db: admin.firestore.Firestore,
  bookingId: string,
  bookingData: BookingData
): Promise<void> {
  const attendanceLog = {
    bookingId,
    vendorId: bookingData.vendorId,
    vendorName: bookingData.vendorName || null,
    bayId: bookingData.bayId,
    date: bookingData.date,
    startTime: bookingData.startTime,
    endTime: bookingData.endTime,
    type: "no_show",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("attendanceLogs").add(attendanceLog);

  functions.logger.info(
    `Attendance log (no_show) created for booking ${bookingId}, vendor ${bookingData.vendorId}`
  );
}
