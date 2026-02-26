import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Scheduled function: runs daily at 8:30 AM.
 *
 * Generates check-in confirmation records for all confirmed bookings today.
 * Sends a notification to each vendor asking them to confirm attendance by 9 AM.
 *
 * This is the backbone of the no-show reduction system:
 * 1. At 8:30 AM, confirmations are generated for all today's bookings
 * 2. Vendors receive a notification to confirm attendance
 * 3. At 9:30 AM (via processUnconfirmedBookings), unconfirmed vendors are flagged
 * 4. Admin can see which vendors confirmed and which didn't
 * 5. Confirmed attendance is forwarded to the assigned team member
 */
export const generateCheckInConfirmations = functions.pubsub
  .schedule("30 8 * * *")  // 8:30 AM daily
  .timeZone("America/New_York")
  .onRun(async (): Promise<void> => {
    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0];

    functions.logger.info(
      `Generating check-in confirmations for date: ${today}`
    );

    try {
      // Get all confirmed bookings for today
      const bookingsQuery = await db
        .collection("bookings")
        .where("date", "==", today)
        .where("status", "in", ["confirmed", "pending"])
        .get();

      if (bookingsQuery.empty) {
        functions.logger.info("No bookings for today. Skipping.");
        return;
      }

      functions.logger.info(
        `Found ${bookingsQuery.size} booking(s) for today.`
      );

      const batch = db.batch();
      const nowTimestamp = admin.firestore.FieldValue.serverTimestamp();

      for (const bookingDoc of bookingsQuery.docs) {
        const bookingData = bookingDoc.data();

        // Check if a confirmation already exists for this booking
        const existingQuery = await db
          .collection("checkInConfirmations")
          .where("bookingId", "==", bookingDoc.id)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (!existingQuery.empty) {
          continue; // Already has a confirmation record
        }

        // Get the user's team members to find an assigned team member
        const userDoc = await db
          .collection("users")
          .doc(bookingData.userId)
          .get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const teamMembers = userData?.teamMembers || [];
        const activeTeamMember = teamMembers.find(
          (m: { isActive?: boolean }) => m.isActive !== false
        );

        // Create the confirmation record
        const confirmationRef = db.collection("checkInConfirmations").doc();
        batch.set(confirmationRef, {
          bookingId: bookingDoc.id,
          userId: bookingData.userId,
          userName: bookingData.userName || "",
          businessName: bookingData.businessName || "",
          date: today,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          assignedTeamMemberId: activeTeamMember?.id || null,
          assignedTeamMemberName: activeTeamMember?.name || null,
          confirmationStatus: "pending",
          confirmedAt: null,
          forwardedToTeamAt: null,
          reminderSentAt: null,
          createdAt: nowTimestamp,
        });

        // Create a notification for the vendor
        const notificationRef = db.collection("notifications").doc();
        batch.set(notificationRef, {
          userId: bookingData.userId,
          title: "Confirm Your Attendance",
          message: `Please confirm your attendance for today's booking at ${bookingData.startTime}. Go to Check-In to confirm.`,
          type: "warning",
          read: false,
          createdAt: nowTimestamp,
        });

        functions.logger.info(
          `Created confirmation for booking ${bookingDoc.id}, user ${bookingData.userId}`
        );
      }

      await batch.commit();

      functions.logger.info(
        "Check-in confirmations generated successfully."
      );
    } catch (error) {
      functions.logger.error(
        "Error generating check-in confirmations:",
        error
      );
      throw error;
    }
  });

/**
 * Scheduled function: runs daily at 9:30 AM.
 *
 * Processes bookings where the vendor has NOT confirmed attendance by 9:30 AM.
 * Creates a notification for admin about potential no-shows.
 */
export const processUnconfirmedBookings = functions.pubsub
  .schedule("30 9 * * *")  // 9:30 AM daily
  .timeZone("America/New_York")
  .onRun(async (): Promise<void> => {
    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0];

    functions.logger.info(
      `Processing unconfirmed bookings for date: ${today}`
    );

    try {
      // Find all pending (unconfirmed) confirmations for today
      const pendingQuery = await db
        .collection("checkInConfirmations")
        .where("date", "==", today)
        .where("confirmationStatus", "==", "pending")
        .get();

      if (pendingQuery.empty) {
        functions.logger.info(
          "All vendors confirmed or no bookings. No action needed."
        );
        return;
      }

      functions.logger.info(
        `Found ${pendingQuery.size} unconfirmed booking(s).`
      );

      const batch = db.batch();
      const nowTimestamp = admin.firestore.FieldValue.serverTimestamp();
      const unconfirmedVendors: string[] = [];

      for (const confirmDoc of pendingQuery.docs) {
        const confirmData = confirmDoc.data();

        // Mark as not confirmed
        batch.update(confirmDoc.ref, {
          confirmationStatus: "not_confirmed",
        });

        unconfirmedVendors.push(
          `${confirmData.userName || "Unknown"} (${confirmData.startTime})`
        );

        // Send a final reminder to the vendor
        const reminderRef = db.collection("notifications").doc();
        batch.set(reminderRef, {
          userId: confirmData.userId,
          title: "Attendance Not Confirmed",
          message: `You did not confirm attendance for today's ${confirmData.startTime} booking. Please check in on arrival or contact the facility.`,
          type: "error",
          read: false,
          createdAt: nowTimestamp,
        });
      }

      // Notify admin about unconfirmed vendors
      const adminUsersQuery = await db
        .collection("users")
        .where("role", "==", "admin")
        .get();

      for (const adminDoc of adminUsersQuery.docs) {
        const adminNotifRef = db.collection("notifications").doc();
        batch.set(adminNotifRef, {
          userId: adminDoc.id,
          title: "Unconfirmed Attendance Alert",
          message: `${pendingQuery.size} vendor(s) did not confirm attendance: ${unconfirmedVendors.join(", ")}. These may be potential no-shows.`,
          type: "warning",
          read: false,
          createdAt: nowTimestamp,
        });
      }

      await batch.commit();

      functions.logger.info(
        `Processed ${pendingQuery.size} unconfirmed booking(s). Admins notified.`
      );
    } catch (error) {
      functions.logger.error(
        "Error processing unconfirmed bookings:",
        error
      );
      throw error;
    }
  });
