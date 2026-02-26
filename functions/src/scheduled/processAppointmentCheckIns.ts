import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Scheduled function: runs daily at 10:15 AM.
 *
 * Processes all appointments for today where the vendor did NOT perform
 * their morning check-in by 10:00 AM. These appointments are auto-cancelled
 * and the vendor is notified that they need to reschedule.
 *
 * Flow:
 * 1. Vendor schedules an appointment (24-hour advance notice required)
 * 2. Morning of: vendor must tap "Check In" by 10:00 AM
 * 3. At 10:15 AM this function runs and cancels any unchecked appointments
 * 4. Admin and vendor both get notifications
 */
export const processAppointmentCheckIns = functions.pubsub
  .schedule("15 10 * * *")  // 10:15 AM daily
  .timeZone("America/New_York")
  .onRun(async (): Promise<void> => {
    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0];

    functions.logger.info(
      `Processing appointment morning check-ins for ${today}`
    );

    try {
      // Find all appointments for today that are pending or confirmed
      // but did NOT complete morning check-in
      const query = await db
        .collection("appointments")
        .where("date", "==", today)
        .where("checkedInMorningOf", "==", false)
        .get();

      // Filter to only pending/confirmed statuses
      const unchecked = query.docs.filter((doc) => {
        const status = doc.data().status;
        return status === "pending" || status === "confirmed";
      });

      if (unchecked.length === 0) {
        functions.logger.info(
          "All appointments have been checked in or no appointments today."
        );
        return;
      }

      functions.logger.info(
        `Found ${unchecked.length} appointment(s) without morning check-in.`
      );

      const batch = db.batch();
      const nowTimestamp = admin.firestore.FieldValue.serverTimestamp();
      const cancelledVendors: string[] = [];

      for (const apptDoc of unchecked) {
        const data = apptDoc.data();

        // Cancel the appointment
        batch.update(apptDoc.ref, {
          status: "cancelled",
          cancelReason:
            "Auto-cancelled: Morning check-in not completed by 10:00 AM",
          updatedAt: nowTimestamp,
        });

        // Notify the vendor
        const vendorNotifRef = db.collection("notifications").doc();
        batch.set(vendorNotifRef, {
          userId: data.userId,
          title: "Appointment Cancelled",
          message: `Your ${data.startTime} appointment was cancelled because morning check-in was not completed by 10:00 AM. Please reschedule with at least 24 hours notice.`,
          type: "error",
          read: false,
          createdAt: nowTimestamp,
        });

        cancelledVendors.push(
          `${data.userName || "Unknown"} (${data.startTime})`
        );

        functions.logger.info(
          `Cancelled appointment ${apptDoc.id} for user ${data.userId}`
        );
      }

      // Notify all admins
      const adminQuery = await db
        .collection("users")
        .where("role", "==", "admin")
        .get();

      for (const adminDoc of adminQuery.docs) {
        const adminNotifRef = db.collection("notifications").doc();
        batch.set(adminNotifRef, {
          userId: adminDoc.id,
          title: "Appointments Auto-Cancelled",
          message: `${unchecked.length} appointment(s) cancelled due to missed morning check-in: ${cancelledVendors.join(", ")}`,
          type: "warning",
          read: false,
          createdAt: nowTimestamp,
        });
      }

      await batch.commit();

      functions.logger.info(
        `Processed ${unchecked.length} missed morning check-ins.`
      );
    } catch (error) {
      functions.logger.error(
        "Error processing appointment check-ins:",
        error
      );
      throw error;
    }
  });
