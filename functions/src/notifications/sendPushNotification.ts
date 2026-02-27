import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Callable function: sends push notifications to vendors via FCM.
 *
 * Called by the admin when sending announcements or direct messages.
 * Looks up all FCM tokens for the target audience and sends the notification.
 */
export const sendPushNotification = functions.https.onCall(
  async (
    data: {
      title: string;
      body: string;
      targetAudience: "all" | "active_vendors" | string[];
      data?: Record<string, string>;
    },
    context: functions.https.CallableContext
  ): Promise<{ success: boolean; sentCount: number; failedCount: number }> => {
    // Verify admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in."
      );
    }
    if (context.auth.token.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can send push notifications."
      );
    }

    const { title, body, targetAudience } = data;

    if (!title || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Title and body are required."
      );
    }

    const db = admin.firestore();

    try {
      // Determine which user IDs to target
      let targetUserIds: string[] = [];

      if (Array.isArray(targetAudience)) {
        // Specific user IDs
        targetUserIds = targetAudience;
      } else {
        // Fetch vendors based on audience
        let usersQuery = db
          .collection("users")
          .where("role", "==", "vendor");

        if (targetAudience === "active_vendors") {
          usersQuery = usersQuery.where("status", "==", "approved");
        }

        const usersSnapshot = await usersQuery.get();
        targetUserIds = usersSnapshot.docs.map(
          (d: admin.firestore.QueryDocumentSnapshot) => d.id
        );
      }

      if (targetUserIds.length === 0) {
        functions.logger.info("No target users found for push notification.");
        return { success: true, sentCount: 0, failedCount: 0 };
      }

      // Fetch FCM tokens for target users (batch in groups of 30 for Firestore 'in' limit)
      const allTokens: string[] = [];
      for (let i = 0; i < targetUserIds.length; i += 30) {
        const chunk = targetUserIds.slice(i, i + 30);
        const tokensQuery = await db
          .collection("fcmTokens")
          .where("userId", "in", chunk)
          .get();
        tokensQuery.docs.forEach(
          (d: admin.firestore.QueryDocumentSnapshot) => {
            const tokenData = d.data();
            if (tokenData.token) {
              allTokens.push(tokenData.token as string);
            }
          }
        );
      }

      if (allTokens.length === 0) {
        functions.logger.info(
          "No FCM tokens found for target users. They may not have enabled push notifications."
        );
        return { success: true, sentCount: 0, failedCount: 0 };
      }

      // Send notifications in batches of 500 (FCM limit)
      let sentCount = 0;
      let failedCount = 0;
      const staleTokens: string[] = [];

      for (let i = 0; i < allTokens.length; i += 500) {
        const tokenBatch = allTokens.slice(i, i + 500);

        const message: admin.messaging.MulticastMessage = {
          tokens: tokenBatch,
          notification: { title, body },
          data: data.data || {},
          webpush: {
            fcmOptions: {
              link: "/",
            },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        sentCount += response.successCount;
        failedCount += response.failureCount;

        // Track stale tokens for cleanup
        response.responses.forEach((resp: admin.messaging.SendResponse, idx: number) => {
          if (
            resp.error &&
            (resp.error.code === "messaging/invalid-registration-token" ||
              resp.error.code === "messaging/registration-token-not-registered")
          ) {
            staleTokens.push(tokenBatch[idx]);
          }
        });
      }

      // Clean up stale tokens
      if (staleTokens.length > 0) {
        const batch = db.batch();
        for (const token of staleTokens) {
          batch.delete(db.collection("fcmTokens").doc(token));
        }
        await batch.commit();
        functions.logger.info(
          `Cleaned up ${staleTokens.length} stale FCM token(s).`
        );
      }

      functions.logger.info(
        `Push notification sent: ${sentCount} success, ${failedCount} failed out of ${allTokens.length} tokens.`
      );

      return { success: true, sentCount, failedCount };
    } catch (error) {
      functions.logger.error("Error sending push notification:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send push notification."
      );
    }
  }
);
