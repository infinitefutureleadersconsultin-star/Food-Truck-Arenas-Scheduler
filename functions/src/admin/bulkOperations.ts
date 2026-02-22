import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

type BulkAction = "bulk_approve" | "bulk_suspend";

interface BulkOperationsData {
  action: BulkAction;
  userIds: string[];
}

interface BulkResult {
  userId: string;
  success: boolean;
  error?: string;
}

/**
 * Callable function: allows admins to perform bulk operations on vendors.
 *
 * - Verifies the caller has admin custom claims.
 * - Supports: bulk_approve, bulk_suspend.
 * - Processes each user and returns individual results.
 */
export const bulkOperations = functions.https.onCall(
  async (
    data: BulkOperationsData,
    context: functions.https.CallableContext
  ): Promise<{
    success: boolean;
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    results: BulkResult[];
  }> => {
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
        "Only admins can perform bulk operations."
      );
    }

    // Validate input
    const { action, userIds } = data;

    const validActions: BulkAction[] = [
      "bulk_approve",
      "bulk_suspend",
    ];
    if (!action || !validActions.includes(action)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Action must be one of: ${validActions.join(", ")}`
      );
    }

    if (
      !userIds ||
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "userIds must be a non-empty array of user IDs."
      );
    }

    if (userIds.length > 100) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cannot process more than 100 users at a time."
      );
    }

    functions.logger.info(
      `Bulk operation '${action}' requested for ${userIds.length} user(s) by admin ${context.auth.uid}`
    );

    const db = admin.firestore();
    const auth = admin.auth();
    const results: BulkResult[] = [];

    // Determine the target status based on action
    const targetStatus = action === "bulk_approve" ? "approved" : "suspended";

    for (const userId of userIds) {
      try {
        // Validate userId
        if (!userId || typeof userId !== "string") {
          results.push({
            userId: userId || "unknown",
            success: false,
            error: "Invalid user ID.",
          });
          continue;
        }

        // Prevent admins from modifying their own account in bulk
        if (userId === context.auth.uid) {
          results.push({
            userId,
            success: false,
            error: "Cannot modify your own account in a bulk operation.",
          });
          continue;
        }

        // Get current user to preserve existing claims
        const targetUser = await auth.getUser(userId);
        const currentClaims =
          (targetUser.customClaims as Record<string, unknown>) || {};

        // Update custom claims
        const updatedClaims: Record<string, unknown> = {
          ...currentClaims,
          status: targetStatus,
        };

        await auth.setCustomUserClaims(userId, updatedClaims);

        // Update Firestore user document
        const updateData: Record<string, unknown> = {
          status: targetStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastStatusChangeBy: context.auth.uid,
          lastStatusChangeAt:
            admin.firestore.FieldValue.serverTimestamp(),
          bulkOperationAction: action,
        };

        // If approving, clear review flags
        if (action === "bulk_approve") {
          updateData.flaggedForReview = false;
          updateData.flagReason = null;
        }

        // If suspending, add suspension metadata
        if (action === "bulk_suspend") {
          updateData.suspendedAt =
            admin.firestore.FieldValue.serverTimestamp();
          updateData.suspendedBy = context.auth.uid;
        }

        await db.collection("users").doc(userId).update(updateData);

        results.push({ userId, success: true });

        functions.logger.info(
          `Bulk ${action}: user ${userId} updated to status '${targetStatus}'`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error occurred.";

        results.push({
          userId,
          success: false,
          error: errorMessage,
        });

        functions.logger.error(
          `Bulk ${action}: failed for user ${userId}:`,
          error
        );
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    functions.logger.info(
      `Bulk operation '${action}' completed. Success: ${successCount}, Failures: ${failureCount}`
    );

    return {
      success: failureCount === 0,
      totalProcessed: results.length,
      successCount,
      failureCount,
      results,
    };
  }
);
