import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const EXPIRY_WARNING_DAYS = 30;

interface UserDocument {
  name: string;
  type: string;
  status: string;
  expiresAt: admin.firestore.Timestamp;
  url?: string;
}

/**
 * Scheduled function: runs daily at 6:00 AM.
 * Queries all users with uploaded documents and checks expiration dates.
 *
 * Actions:
 * - If a document expires within 30 days: mark as 'expiring_soon'
 * - If a document is already expired: mark as 'expired'
 * - Updates the user's overall document compliance status
 */
export const checkDocumentExpiry = functions.pubsub
  .schedule("every day 06:00")
  .timeZone("America/Chicago")
  .onRun(async (): Promise<void> => {
    const db = admin.firestore();

    const now = new Date();
    const warningDate = new Date(
      now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000
    );

    functions.logger.info(
      `Running document expiry check. Now: ${now.toISOString()}, Warning threshold: ${warningDate.toISOString()}`
    );

    try {
      // Query all users who have documents
      const usersQuery = await db
        .collection("users")
        .where("role", "==", "vendor")
        .get();

      if (usersQuery.empty) {
        functions.logger.info("No vendor users found.");
        return;
      }

      let expiredCount = 0;
      let expiringSoonCount = 0;
      let processedUsers = 0;

      for (const userDoc of usersQuery.docs) {
        const userData = userDoc.data();
        const documents: UserDocument[] = userData.documents || [];

        if (documents.length === 0) {
          continue;
        }

        let userHasExpired = false;
        let userHasExpiringSoon = false;
        let documentsUpdated = false;

        const updatedDocuments = documents.map(
          (doc: UserDocument): UserDocument => {
            if (!doc.expiresAt) {
              return doc;
            }

            const expiresAtDate = doc.expiresAt.toDate();

            // Check if document is expired
            if (expiresAtDate <= now) {
              if (doc.status !== "expired") {
                documentsUpdated = true;
                expiredCount++;
              }
              userHasExpired = true;
              return { ...doc, status: "expired" };
            }

            // Check if document is expiring soon (within 30 days)
            if (expiresAtDate <= warningDate) {
              if (
                doc.status !== "expiring_soon" &&
                doc.status !== "expired"
              ) {
                documentsUpdated = true;
                expiringSoonCount++;
              }
              userHasExpiringSoon = true;
              return { ...doc, status: "expiring_soon" };
            }

            return doc;
          }
        );

        // Update user document if any document statuses changed
        if (documentsUpdated || userHasExpired || userHasExpiringSoon) {
          const updateData: Record<string, unknown> = {
            documents: updatedDocuments,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // Set overall compliance status
          if (userHasExpired) {
            updateData.documentComplianceStatus = "non_compliant";
          } else if (userHasExpiringSoon) {
            updateData.documentComplianceStatus = "warning";
          } else {
            updateData.documentComplianceStatus = "compliant";
          }

          await userDoc.ref.update(updateData);
          processedUsers++;

          functions.logger.info(
            `Updated documents for user ${userDoc.id}: compliance=${updateData.documentComplianceStatus}`
          );
        }
      }

      functions.logger.info(
        `Document expiry check complete. Users processed: ${processedUsers}, ` +
          `Expired: ${expiredCount}, Expiring soon: ${expiringSoonCount}`
      );
    } catch (error) {
      functions.logger.error(
        "Error checking document expiry:",
        error
      );
      throw error;
    }
  });
