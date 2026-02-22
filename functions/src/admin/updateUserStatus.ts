import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface UpdateUserStatusData {
  userId: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  role?: "admin" | "vendor";
}

/**
 * Callable function: allows admins to update a user's status and role.
 *
 * - Verifies the caller has admin custom claims.
 * - Accepts: userId, status, and optionally role.
 * - Updates the user's custom claims in Firebase Auth.
 * - Updates the user's Firestore document.
 */
export const updateUserStatus = functions.https.onCall(
  async (
    data: UpdateUserStatusData,
    context: functions.https.CallableContext
  ): Promise<{ success: boolean; message: string }> => {
    // Verify the caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to perform this action."
      );
    }

    // Verify the caller has admin role
    if (context.auth.token.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can update user status."
      );
    }

    // Validate required fields
    const { userId, status, role } = data;

    if (!userId || typeof userId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid userId is required."
      );
    }

    const validStatuses = ["pending", "approved", "suspended", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Status must be one of: ${validStatuses.join(", ")}`
      );
    }

    const validRoles = ["admin", "vendor"];
    if (role && !validRoles.includes(role)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Role must be one of: ${validRoles.join(", ")}`
      );
    }

    const db = admin.firestore();
    const auth = admin.auth();

    try {
      // Verify the target user exists
      const targetUser = await auth.getUser(userId);

      if (!targetUser) {
        throw new functions.https.HttpsError(
          "not-found",
          `User ${userId} not found.`
        );
      }

      // Build updated custom claims
      const currentClaims =
        (targetUser.customClaims as Record<string, unknown>) || {};
      const updatedClaims: Record<string, unknown> = {
        ...currentClaims,
        status,
      };

      if (role) {
        updatedClaims.role = role;
      }

      // Update custom claims in Firebase Auth
      await auth.setCustomUserClaims(userId, updatedClaims);

      // Update the Firestore user document
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastStatusChangeBy: context.auth.uid,
        lastStatusChangeAt:
          admin.firestore.FieldValue.serverTimestamp(),
      };

      if (role) {
        updateData.role = role;
      }

      // If approving, clear any review flags
      if (status === "approved") {
        updateData.flaggedForReview = false;
        updateData.flagReason = null;
      }

      await db.collection("users").doc(userId).update(updateData);

      const message = role
        ? `User ${userId} updated: status=${status}, role=${role}`
        : `User ${userId} updated: status=${status}`;

      functions.logger.info(message, {
        performedBy: context.auth.uid,
      });

      return { success: true, message };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      functions.logger.error(
        `Error updating user ${userId}:`,
        error
      );
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while updating the user."
      );
    }
  }
);
