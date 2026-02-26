import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Auth triggers
export { onUserCreated } from "./auth/onUserCreated";

// Booking triggers
export { onBookingCreated } from "./bookings/onBookingCreated";
export { onBookingUpdated } from "./bookings/onBookingUpdated";
export { releaseStaleBookings } from "./bookings/releaseStaleBookings";

// Scheduled functions
export { detectNoShows } from "./scheduled/detectNoShows";
export { checkDocumentExpiry } from "./scheduled/checkDocumentExpiry";
export { dailyCleanup } from "./scheduled/dailyCleanup";
export {
  generateCheckInConfirmations,
  processUnconfirmedBookings,
} from "./scheduled/generateCheckInConfirmations";
export { processAppointmentCheckIns } from "./scheduled/processAppointmentCheckIns";

// Admin callable functions
export { updateUserStatus } from "./admin/updateUserStatus";
export { bulkOperations } from "./admin/bulkOperations";
