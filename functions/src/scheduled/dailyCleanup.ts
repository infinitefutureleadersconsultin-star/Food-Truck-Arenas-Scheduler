import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Scheduled function: runs daily at midnight.
 *
 * Actions:
 * 1. Mark completed bookings: bookings whose end time has passed and
 *    have a check-in recorded are updated to status 'completed'.
 * 2. Clean up old waitlist entries: remove waitlist entries older than
 *    7 days or for dates that have already passed.
 */
export const dailyCleanup = functions.pubsub
  .schedule("every day 00:00")
  .timeZone("America/Chicago")
  .onRun(async (): Promise<void> => {
    const db = admin.firestore();

    const now = new Date();
    const nowTimestamp = admin.firestore.Timestamp.fromDate(now);

    functions.logger.info(
      `Running daily cleanup at ${now.toISOString()}`
    );

    try {
      await markCompletedBookings(db, nowTimestamp);
      await cleanUpOldWaitlistEntries(db, now);

      functions.logger.info("Daily cleanup completed successfully.");
    } catch (error) {
      functions.logger.error("Error during daily cleanup:", error);
      throw error;
    }
  });

/**
 * Find bookings whose end time has passed and that have a check-in recorded.
 * Update their status to 'completed'.
 */
async function markCompletedBookings(
  db: admin.firestore.Firestore,
  nowTimestamp: admin.firestore.Timestamp
): Promise<void> {
  functions.logger.info("Marking completed bookings...");

  // Query bookings where endTimestamp is in the past and status is still 'confirmed'
  const completedQuery = await db
    .collection("bookings")
    .where("status", "==", "confirmed")
    .where("endTimestamp", "<", nowTimestamp)
    .get();

  if (completedQuery.empty) {
    functions.logger.info("No bookings to mark as completed.");
    return;
  }

  const batch = db.batch();
  let completedCount = 0;
  const serverNow = admin.firestore.FieldValue.serverTimestamp();

  for (const doc of completedQuery.docs) {
    const bookingData = doc.data();

    // Only mark as completed if the vendor actually checked in
    if (bookingData.checkedInAt || bookingData.checkInTime) {
      batch.update(doc.ref, {
        status: "completed",
        completedAt: serverNow,
        updatedAt: serverNow,
      });
      completedCount++;
    }
  }

  if (completedCount > 0) {
    await batch.commit();
  }

  functions.logger.info(
    `Marked ${completedCount} booking(s) as completed.`
  );
}

/**
 * Remove old waitlist entries:
 * - Entries for dates that have already passed
 * - Entries older than 7 days regardless of status
 */
async function cleanUpOldWaitlistEntries(
  db: admin.firestore.Firestore,
  now: Date
): Promise<void> {
  functions.logger.info("Cleaning up old waitlist entries...");

  const sevenDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  );

  // Find waitlist entries created more than 7 days ago
  const oldEntriesQuery = await db
    .collection("waitlist")
    .where("createdAt", "<", sevenDaysAgo)
    .get();

  // Find waitlist entries for past dates
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const pastDateEntriesQuery = await db
    .collection("waitlist")
    .where("date", "<", todayStr)
    .where("status", "==", "waiting")
    .get();

  const docsToDelete = new Set<string>();

  oldEntriesQuery.docs.forEach((doc) => docsToDelete.add(doc.id));
  pastDateEntriesQuery.docs.forEach((doc) => docsToDelete.add(doc.id));

  if (docsToDelete.size === 0) {
    functions.logger.info("No old waitlist entries to clean up.");
    return;
  }

  // Batch delete in groups of 500 (Firestore batch limit)
  const allDocs = [
    ...oldEntriesQuery.docs,
    ...pastDateEntriesQuery.docs,
  ];
  const uniqueDocs = allDocs.filter(
    (doc, index, self) =>
      self.findIndex((d) => d.id === doc.id) === index
  );

  let deleteCount = 0;

  for (let i = 0; i < uniqueDocs.length; i += 500) {
    const chunk = uniqueDocs.slice(i, i + 500);
    const batch = db.batch();

    chunk.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    await batch.commit();
  }

  functions.logger.info(
    `Cleaned up ${deleteCount} old waitlist entry/entries.`
  );
}
