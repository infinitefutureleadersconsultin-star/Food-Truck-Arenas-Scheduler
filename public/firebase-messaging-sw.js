/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker
 *
 * This service worker runs in the background and handles push notifications
 * when the app is not in the foreground. Vendors will receive alerts even
 * if their browser tab is closed or they are on a different page.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config is injected at registration time via the query string,
// but for the compat SDK we can also hard-code the public keys here.
// These are *public* keys — they do NOT need to be secret.
firebase.initializeApp({
  apiKey: self.__FIREBASE_CONFIG__?.apiKey ?? '',
  authDomain: self.__FIREBASE_CONFIG__?.authDomain ?? '',
  projectId: self.__FIREBASE_CONFIG__?.projectId ?? '',
  storageBucket: self.__FIREBASE_CONFIG__?.storageBucket ?? '',
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId ?? '',
  appId: self.__FIREBASE_CONFIG__?.appId ?? '',
});

const messaging = firebase.messaging();

// Handle background messages (when app is not in foreground)
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: payload.data?.tag || 'default',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — navigate to the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});
