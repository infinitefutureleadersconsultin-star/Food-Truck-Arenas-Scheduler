/**
 * Push Notification Service
 *
 * Uses the browser Notification API to send push notifications.
 * Integrates with the existing notification system to provide
 * real-time alerts for important events.
 */

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting push notification permission:', error);
    return 'denied';
  }
}

export function sendPushNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    onClick?: () => void;
  }
): void {
  if (!isPushSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag,
      requireInteraction: options?.requireInteraction ?? false,
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

export function sendBookingConfirmationPush(
  businessName: string,
  date: string,
  startTime: string
): void {
  sendPushNotification('Booking Confirmed', {
    body: `${businessName} - ${date} at ${startTime}`,
    tag: 'booking-confirmation',
  });
}

export function sendCheckInReminderPush(
  date: string,
  startTime: string
): void {
  sendPushNotification('Check-In Reminder', {
    body: `Please confirm your attendance for today's booking at ${startTime}`,
    tag: 'checkin-reminder',
    requireInteraction: true,
  });
}

export function sendAttendanceConfirmedPush(
  customerName: string,
  startTime: string
): void {
  sendPushNotification('Attendance Confirmed', {
    body: `${customerName} has confirmed attendance for the ${startTime} booking`,
    tag: 'attendance-confirmed',
  });
}

export function sendTeamAssignmentPush(
  bookingDetails: string
): void {
  sendPushNotification('New Assignment', {
    body: `You've been assigned to: ${bookingDetails}`,
    tag: 'team-assignment',
    requireInteraction: true,
  });
}

export function sendNewFeedbackPush(): void {
  sendPushNotification('New Feedback Received', {
    body: 'A customer has submitted new feedback. Review it in the admin panel.',
    tag: 'new-feedback',
  });
}

export function sendAnnouncementPush(title: string, body: string): void {
  sendPushNotification(title, {
    body,
    tag: 'announcement',
    requireInteraction: true,
  });
}
