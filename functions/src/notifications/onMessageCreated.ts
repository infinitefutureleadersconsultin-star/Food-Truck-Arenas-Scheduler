import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Firestore trigger: sends a push notification when a new direct message
 * is created. The receiver gets alerted even if they're not on the app.
 */
export const onMessageCreated = functions.firestore
  .document("messages/{messageId}")
  .onCreate(
    async (
      snapshot: functions.firestore.QueryDocumentSnapshot,
      context: functions.EventContext
    ): Promise<void> => {
      const messageId = context.params.messageId;
      const data = snapshot.data();

      const receiverId = data.receiverId as string;
      const senderName = data.senderName as string;
      const subject = data.subject as string;
      const body = data.body as string;

      if (!receiverId) {
        functions.logger.warn(
          `Message ${messageId} has no receiverId, skipping push.`
        );
        return;
      }

      functions.logger.info(
        `New message created: ${messageId}, sending push to ${receiverId}`
      );

      const db = admin.firestore();

      try {
        // Fetch FCM tokens for the receiver
        const tokensQuery = await db
          .collection("fcmTokens")
          .where("userId", "==", receiverId)
          .get();

        if (tokensQuery.empty) {
          functions.logger.info(
            `No FCM tokens for user ${receiverId} — push not sent.`
          );
          return;
        }

        const tokens = tokensQuery.docs.map(
          (d: admin.firestore.QueryDocumentSnapshot) => d.data().token as string
        );

        const truncatedBody =
          body.length > 150 ? body.substring(0, 147) + "..." : body;

        const message: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: `Message from ${senderName}: ${subject}`,
            body: truncatedBody,
          },
          data: {
            messageId,
            type: "direct_message",
            senderId: data.senderId || "",
          },
          webpush: {
            fcmOptions: {
              link: "/",
            },
          },
        };

        const response =
          await admin.messaging().sendEachForMulticast(message);

        functions.logger.info(
          `Message push: ${response.successCount} sent, ${response.failureCount} failed for message ${messageId}`
        );

        // Clean up stale tokens
        const staleTokens: string[] = [];
        response.responses.forEach((resp: admin.messaging.SendResponse, idx: number) => {
          if (
            resp.error &&
            (resp.error.code === "messaging/invalid-registration-token" ||
              resp.error.code ===
                "messaging/registration-token-not-registered")
          ) {
            staleTokens.push(tokens[idx]);
          }
        });

        if (staleTokens.length > 0) {
          const batch = db.batch();
          for (const token of staleTokens) {
            batch.delete(db.collection("fcmTokens").doc(token));
          }
          await batch.commit();
        }
      } catch (error) {
        functions.logger.error(
          `Error sending push for message ${messageId}:`,
          error
        );
      }
    }
  );
