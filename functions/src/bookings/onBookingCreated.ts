import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface BookingData {
  vendorId: string;
  vendorName?: string;
  vendorEmail?: string;
  bayId: string;
  bayName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
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

      functions.logger.info(
        `New booking created: ${bookingId}`,
        {
          vendorId: bookingData.vendorId,
          bayId: bookingData.bayId,
          date: bookingData.date,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          status: bookingData.status,
        }
      );

      // Stub: Send confirmation email to vendor
      // In production, integrate with an email service (SendGrid, Mailgun, etc.)
      try {
        if (bookingData.vendorEmail) {
          console.log(
            `[EMAIL STUB] Sending booking confirmation to ${bookingData.vendorEmail}`,
            {
              bookingId,
              bayName: bookingData.bayName || bookingData.bayId,
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
