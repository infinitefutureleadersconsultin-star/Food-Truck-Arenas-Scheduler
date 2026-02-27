import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Firestore trigger: automatically sends push notifications when a new
 * announcement is created. This ensures vendors get alerted even if
 * they're not currently using the app.
 */
export const onAnnouncementCreated = functions.firestore
  .document("announcements/{announcementId}")
  .onCreate(
    async (
      snapshot: functions.firestore.QueryDocumentSnapshot,
      context: functions.EventContext
    ): Promise<void> => {
      const announcementId = context.params.announcementId;
      const data = snapshot.data();

      const title = data.title as string;
      const body = data.body as string;
      const targetAudience = data.targetAudience as
        | "all"
        | "active_vendors"
        | string[];
      const priority = data.priority as string;

      functions.logger.info(
        `New announcement created: ${announcementId}, sending push notifications`,
        { title, targetAudience, priority }
      );

      const db = admin.firestore();

      try {
        // Determine target users
        let targetUserIds: string[] = [];

        if (Array.isArray(targetAudience)) {
          targetUserIds = targetAudience;
        } else {
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
          functions.logger.info("No target users for announcement push.");
          return;
        }

        // Fetch FCM tokens
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
            "No FCM tokens found — vendors have not enabled push notifications."
          );
          return;
        }

        // Build notification with priority-based urgency
        const urgency =
          priority === "urgent" || priority === "high" ? "high" : "normal";

        const staleTokens: string[] = [];

        for (let i = 0; i < allTokens.length; i += 500) {
          const tokenBatch = allTokens.slice(i, i + 500);

          const message: admin.messaging.MulticastMessage = {
            tokens: tokenBatch,
            notification: {
              title: `${priority === "urgent" ? "URGENT: " : ""}${title}`,
              body:
                body.length > 200 ? body.substring(0, 197) + "..." : body,
            },
            data: {
              announcementId,
              type: "announcement",
              priority,
            },
            webpush: {
              headers: {
                Urgency: urgency,
              },
              fcmOptions: {
                link: "/",
              },
            },
          };

          const response =
            await admin.messaging().sendEachForMulticast(message);

          functions.logger.info(
            `Announcement push batch: ${response.successCount} sent, ${response.failureCount} failed`
          );

          // Track stale tokens
          response.responses.forEach((resp: admin.messaging.SendResponse, idx: number) => {
            if (
              resp.error &&
              (resp.error.code ===
                "messaging/invalid-registration-token" ||
                resp.error.code ===
                  "messaging/registration-token-not-registered")
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
        }

        functions.logger.info(
          `Push notifications sent for announcement ${announcementId} to ${allTokens.length} device(s).`
        );
      } catch (error) {
        functions.logger.error(
          `Error sending push for announcement ${announcementId}:`,
          error
        );
        // Don't throw — the announcement was created successfully,
        // push failure shouldn't block the operation
      }
    }
  );
