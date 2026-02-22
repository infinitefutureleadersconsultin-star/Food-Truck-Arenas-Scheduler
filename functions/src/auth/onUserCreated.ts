import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const ADMIN_EMAILS = [
  "Foodtruckarenas@gmail.com",
  "issiahmclean1999@gmail.com",
];

/**
 * Auth trigger: runs when a new user is created in Firebase Auth.
 * - If the user's email matches an admin email, set admin custom claims.
 * - Otherwise, set vendor custom claims with status 'pending'.
 * - Creates a user document in Firestore with basic profile info.
 */
export const onUserCreated = functions.auth.user().onCreate(
  async (user: admin.auth.UserRecord): Promise<void> => {
    const db = admin.firestore();
    const auth = admin.auth();

    const { uid, email, displayName, photoURL } = user;
    const isAdmin = !!email && ADMIN_EMAILS.includes(email);

    // Set custom claims based on role
    const customClaims: Record<string, unknown> = isAdmin
      ? { role: "admin", status: "approved" }
      : { role: "vendor", status: "pending" };

    try {
      await auth.setCustomUserClaims(uid, customClaims);

      functions.logger.info(
        `Custom claims set for user ${uid}: role=${customClaims.role}, status=${customClaims.status}`
      );

      // Create user document in Firestore
      const userDoc: Record<string, unknown> = {
        uid,
        email: email || null,
        displayName: displayName || null,
        photoURL: photoURL || null,
        role: customClaims.role,
        status: customClaims.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!isAdmin) {
        // Vendor-specific fields
        userDoc.businessName = null;
        userDoc.phone = null;
        userDoc.documents = [];
        userDoc.noShowCount = 0;
        userDoc.flaggedForReview = false;
      }

      await db.collection("users").doc(uid).set(userDoc);

      functions.logger.info(
        `User document created for ${uid} with role: ${customClaims.role}`
      );
    } catch (error) {
      functions.logger.error(
        `Error processing new user ${uid}:`,
        error
      );
      throw error;
    }
  }
);
