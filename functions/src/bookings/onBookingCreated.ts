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
  createdAt: admin.firestore.Timestamp;
}

/**
 * Firestore trigger: runs when a new booking document is created.
 * - Logs the booking creation details.
 * - Stubs a confirmation email notification (console.log for now).
 */
export const onBookingCreated = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(
    async (
      snapshot: functions.firestore.QueryDocumentSnapshot,
      context: functions.EventContext
    ): Promise<void> => {
      const bookingId = context.params.bookingId;
      const bookingData = snapshot.data() as BookingData;

      const resourceSummary = (bookingData.resources || [])
        .map((r) => r.resourceTypeName)
        .join(', ');

      functions.logger.info(
        `New booking created: ${bookingId}`,
        {
          userId: bookingData.userId,
          resources: resourceSummary,
          date: bookingData.date,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          status: bookingData.status,
        }
      );

      // Stub: Send confirmation email to vendor
      // In production, integrate with an email service (SendGrid, Mailgun, etc.)
      try {
        if (bookingData.userName) {
          console.log(
            `[EMAIL STUB] Sending booking confirmation for user ${bookingData.userName}`,
            {
              bookingId,
              resources: resourceSummary,
              date: bookingData.date,
              startTime: bookingData.startTime,
              endTime: bookingData.endTime,
            }
          );
        }

        // Update the booking with a confirmedAt timestamp if status is confirmed
        if (bookingData.status === "confirmed") {
          await snapshot.ref.update({
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        functions.logger.info(
          `Booking ${bookingId} processed successfully`
        );
      } catch (error) {
        functions.logger.error(
          `Error processing booking ${bookingId}:`,
          error
        );
        throw error;
      }
    }
  );
