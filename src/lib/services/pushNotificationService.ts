import { getMessaging, getToken, onMessage, isSupported, MessagePayload } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase/config';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';
const FCM_TOKENS_COLLECTION = 'fcmTokens';

/**
 * Check if the browser supports push notifications and the FCM SDK.
 */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Request permission and register for push notifications.
 * Stores the FCM token in Firestore under fcmTokens/{tokenId}.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      console.warn('Push notifications are not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return null;
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn('Failed to get FCM token.');
      return null;
    }

    // Store the token in Firestore linked to the user
    await setDoc(doc(db, FCM_TOKENS_COLLECTION, token), {
      userId,
      token,
      createdAt: Timestamp.now(),
      userAgent: navigator.userAgent,
    });

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Unregister a push notification token.
 */
export async function unregisterPushNotifications(token: string): Promise<void> {
  try {
    await deleteDoc(doc(db, FCM_TOKENS_COLLECTION, token));
  } catch (error) {
    console.error('Error unregistering push notifications:', error);
  }
}

/**
 * Listen for foreground messages and invoke a callback.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void
): (() => void) | null {
  try {
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
      callback({
        title: payload.notification?.title || 'Notification',
        body: payload.notification?.body || '',
        data: payload.data as Record<string, string> | undefined,
      });
    });
    return unsubscribe;
  } catch {
    return null;
  }
}
