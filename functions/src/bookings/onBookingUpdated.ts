import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface BookingData {
  userId: string;
  userName?: string;
  businessName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  resources: { resourceId: string; resourceTypeId: string; resourceName: string; resourceTypeName: string }[];
  resourceRequests: Record<string, number>;
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
      date: bookingData.date,
      startTime: bookingData.startTime,
    }
  );

  // Query the waitlist for matching date and overlapping time slot
  const waitlistQuery = await db
    .collection("waitlist")
    .where("date", "==", bookingData.date)
    .where("status", "==", "waiting")
    .orderBy("createdAt", "asc")
    .limit(10)
    .get();

  if (waitlistQuery.empty) {
    functions.logger.info(
      `No waitlisted vendors for date=${bookingData.date}`
    );
    return;
  }

  // Find the first waitlist entry whose preferred time overlaps with the cancelled slot
  const matchingEntry = waitlistQuery.docs.find((doc) => {
    const data = doc.data();
    return (
      data.preferredStartTime < bookingData.endTime &&
      data.preferredEndTime > bookingData.startTime
    );
  });

  if (!matchingEntry) {
    functions.logger.info(
      `No waitlisted vendors match the time slot for date=${bookingData.date}, time=${bookingData.startTime}-${bookingData.endTime}`
    );
    return;
  }

  const waitlistData = matchingEntry.data();

  // Update waitlist entry status to 'notified'
  await matchingEntry.ref.update({
    status: "notified",
    notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    offeredBookingId: bookingId,
  });

  // Stub: Send notification to the waitlisted vendor
  console.log(
    `[NOTIFICATION STUB] Slot available for vendor ${waitlistData.userId}`,
    {
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
    }
  );

  functions.logger.info(
    `Waitlist entry ${matchingEntry.id} notified for vendor ${waitlistData.userId}`
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
    userId: bookingData.userId,
    userName: bookingData.userName || null,
    businessName: bookingData.businessName || null,
    date: bookingData.date,
    startTime: bookingData.startTime,
    endTime: bookingData.endTime,
    status: "no_show",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("attendanceLogs").add(attendanceLog);

  functions.logger.info(
    `Attendance log (no_show) created for booking ${bookingId}, user ${bookingData.userId}`
  );
}
