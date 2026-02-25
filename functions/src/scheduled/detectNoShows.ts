import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const NO_SHOW_THRESHOLD_MINUTES = 30;
const NO_SHOW_FLAG_THRESHOLD = 3;

/**
 * Scheduled function: runs every 30 minutes.
 * Detects no-show bookings by finding confirmed bookings whose start time
 * has passed by more than the no-show threshold (30 min) with no check-in.
 *
 * Actions:
 * - Update booking status to 'no_show'
 * - Create an attendance log entry
 * - Check if the vendor has 3+ no-shows and flag for admin review
 */
export const detectNoShows = functions.pubsub
  .schedule("every 30 minutes")
  .onRun(async (): Promise<void> => {
    const db = admin.firestore();

    const now = new Date();
    const thresholdTime = new Date(
      now.getTime() - NO_SHOW_THRESHOLD_MINUTES * 60 * 1000
    );
    const thresholdTimestamp =
      admin.firestore.Timestamp.fromDate(thresholdTime);

    functions.logger.info(
      `Running no-show detection. Checking confirmed bookings with startTimestamp before ${thresholdTime.toISOString()}`
    );

    try {
      // Find confirmed bookings that started more than 30 min ago without check-in
      const noShowQuery = await db
        .collection("bookings")
        .where("status", "==", "confirmed")
        .where("startTimestamp", "<", thresholdTimestamp)
        .get();

      if (noShowQuery.empty) {
        functions.logger.info("No no-show bookings detected.");
        return;
      }

      functions.logger.info(
        `Found ${noShowQuery.size} potential no-show booking(s).`
      );

      const batch = db.batch();
      const vendorNoShowCounts: Record<string, number> = {};
      const nowTimestamp = admin.firestore.FieldValue.serverTimestamp();

      for (const doc of noShowQuery.docs) {
        const bookingData = doc.data();

        // Skip bookings that already have a check-in recorded
        if (bookingData.checkedInAt || bookingData.checkInTime) {
          continue;
        }

        // Update booking status to no_show
        batch.update(doc.ref, {
          status: "no_show",
          markedNoShowAt: nowTimestamp,
          updatedAt: nowTimestamp,
        });

        // Create attendance log entry
        const logRef = db.collection("attendanceLogs").doc();
        batch.set(logRef, {
          bookingId: doc.id,
          userId: bookingData.userId,
          userName: bookingData.userName || null,
          businessName: bookingData.businessName || null,
          date: bookingData.date,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          status: "no_show",
          detectedBy: "scheduled_function",
          createdAt: nowTimestamp,
        });

        // Track no-show counts per vendor
        const userId = bookingData.userId as string;
        vendorNoShowCounts[userId] =
          (vendorNoShowCounts[userId] || 0) + 1;

        functions.logger.info(
          `Booking ${doc.id} marked as no_show for user ${userId}`
        );
      }

      await batch.commit();

      // Check each affected vendor's total no-show count
      for (const vendorId of Object.keys(vendorNoShowCounts)) {
        await checkVendorNoShowHistory(db, vendorId);
      }

      functions.logger.info("No-show detection completed successfully.");
    } catch (error) {
      functions.logger.error("Error detecting no-shows:", error);
      throw error;
    }
  });

/**
 * Check if a vendor has accumulated 3 or more no-shows.
 * If so, flag the vendor for admin review in the users collection.
 */
async function checkVendorNoShowHistory(
  db: admin.firestore.Firestore,
  vendorId: string
): Promise<void> {
  const noShowLogsQuery = await db
    .collection("attendanceLogs")
    .where("userId", "==", vendorId)
    .where("status", "==", "no_show")
    .get();

  const totalNoShows = noShowLogsQuery.size;

  functions.logger.info(
    `Vendor ${vendorId} total no-shows: ${totalNoShows}`
  );

  if (totalNoShows >= NO_SHOW_FLAG_THRESHOLD) {
    await db.collection("users").doc(vendorId).update({
      flaggedForReview: true,
      noShowCount: totalNoShows,
      flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
      flagReason: `Accumulated ${totalNoShows} no-show(s) (threshold: ${NO_SHOW_FLAG_THRESHOLD})`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.warn(
      `Vendor ${vendorId} flagged for admin review with ${totalNoShows} no-shows.`
    );
  }
}
