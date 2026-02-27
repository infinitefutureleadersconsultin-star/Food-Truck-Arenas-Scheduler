import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Scheduled function: runs every 15 minutes during operating hours.
 *
 * FIXES THE INTRA-DAY GAP:
 * Previously, if a vendor checked in but didn't check out, the table
 * stayed as "checked_in" until midnight when dailyCleanup ran.
 * This function closes that gap by checking every 15 minutes for
 * bookings whose end time has passed and auto-completing them.
 *
 * Actions:
 * 1. Find `checked_in` bookings where endTimestamp < now
 *    → Mark as `completed` (vendor was there, just didn't press check out)
 *
 * 2. Find `confirmed` bookings where endTimestamp < now AND had a check-in
 *    → Mark as `completed` (belt-and-suspenders with dailyCleanup)
 *
 * This ensures the floor plan updates in near real-time (within 15 min)
 * instead of waiting until midnight.
 */
export const completeExpiredBookings = functions.pubsub
  .schedule("every 15 minutes")
  .timeZone("America/Chicago")
  .onRun(async (): Promise<void> => {
    const db = admin.firestore();
    const now = new Date();
    const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    functions.logger.info(
      `Running intra-day booking completion check at ${now.toISOString()}`
    );

    try {
      let totalCompleted = 0;

      // 1. Auto-complete checked_in bookings whose end time has passed
      const checkedInExpired = await db
        .collection("bookings")
        .where("status", "==", "checked_in")
        .where("endTimestamp", "<", nowTimestamp)
        .get();

      if (!checkedInExpired.empty) {
        // Process in batches of 500
        for (let i = 0; i < checkedInExpired.docs.length; i += 500) {
          const chunk = checkedInExpired.docs.slice(i, i + 500);
          const batch = db.batch();

          for (const doc of chunk) {
            batch.update(doc.ref, {
              status: "completed",
              completedAt: serverNow,
              autoCompletedBy: "scheduled_intraday",
              updatedAt: serverNow,
            });
            totalCompleted++;
          }

          await batch.commit();
        }

        functions.logger.info(
          `Auto-completed ${checkedInExpired.size} checked-in booking(s) whose end time passed.`
        );
      }

      // 2. Also catch confirmed bookings with check-in that endTimestamp passed
      //    (handles edge case where status wasn't updated to checked_in properly)
      const confirmedExpired = await db
        .collection("bookings")
        .where("status", "==", "confirmed")
        .where("endTimestamp", "<", nowTimestamp)
        .get();

      if (!confirmedExpired.empty) {
        for (let i = 0; i < confirmedExpired.docs.length; i += 500) {
          const chunk = confirmedExpired.docs.slice(i, i + 500);
          const batch = db.batch();

          for (const doc of chunk) {
            const data = doc.data();

            // Only complete if there was a check-in recorded
            if (data.checkedInAt || data.checkInTime) {
              batch.update(doc.ref, {
                status: "completed",
                completedAt: serverNow,
                autoCompletedBy: "scheduled_intraday",
                updatedAt: serverNow,
              });
              totalCompleted++;
            }
          }

          await batch.commit();
        }
      }

      if (totalCompleted === 0) {
        functions.logger.info("No expired bookings to complete.");
      } else {
        functions.logger.info(
          `Intra-day completion: ${totalCompleted} booking(s) auto-completed.`
        );
      }
    } catch (error) {
      functions.logger.error(
        "Error during intra-day booking completion:",
        error
      );
      throw error;
    }
  });
