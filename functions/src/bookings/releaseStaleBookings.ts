import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const STALE_THRESHOLD_MINUTES = 30;

/**
 * Scheduled function: runs every 15 minutes.
 * Finds bookings with status 'pending' that were created more than
 * 30 minutes ago and updates them to 'cancelled' to free up the slot.
 */
export const releaseStaleBookings = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async (): Promise<void> => {
    const db = admin.firestore();

    const thresholdTime = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000)
    );

    functions.logger.info(
      `Running stale booking cleanup. Threshold: ${thresholdTime.toDate().toISOString()}`
    );

    try {
      // Query for pending bookings older than the threshold
      const staleBookingsQuery = await db
        .collection("bookings")
        .where("status", "==", "pending")
        .where("createdAt", "<", thresholdTime)
        .get();

      if (staleBookingsQuery.empty) {
        functions.logger.info("No stale bookings found.");
        return;
      }

      functions.logger.info(
        `Found ${staleBookingsQuery.size} stale booking(s) to release.`
      );

      // Batch update all stale bookings to 'cancelled'
      const batch = db.batch();
      const now = admin.firestore.FieldValue.serverTimestamp();

      staleBookingsQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          cancelledAt: now,
          cancelReason: "auto_expired",
          updatedAt: now,
        });
      });

      await batch.commit();

      functions.logger.info(
        `Successfully released ${staleBookingsQuery.size} stale booking(s).`
      );
    } catch (error) {
      functions.logger.error("Error releasing stale bookings:", error);
      throw error;
    }
  });
