'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  isPushSupported,
  registerForPushNotifications,
  onForegroundMessage,
} from '@/lib/services/pushNotificationService';

/**
 * A toggle button that lets vendors enable/disable push notifications.
 * When enabled, the browser will prompt for notification permission
 * and register a service worker to receive background alerts.
 */
export function PushNotificationToggle() {
  const { user } = useAuthContext();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isPushSupported().then((result) => {
      setSupported(result);
      // Check if already granted
      if (result && Notification.permission === 'granted') {
        setEnabled(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const unsub = onForegroundMessage((payload) => {
      // Show a browser notification for foreground messages too
      if (Notification.permission === 'granted') {
        new Notification(payload.title, { body: payload.body });
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [enabled]);

  const handleEnable = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await registerForPushNotifications(user.uid);
      if (token) {
        setEnabled(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <Button
      variant={enabled ? 'outline' : 'default'}
      size="sm"
      onClick={handleEnable}
      disabled={loading || enabled}
    >
      {enabled ? (
        <>
          <Bell className="mr-2 h-4 w-4 text-green-600" />
          Push Notifications On
        </>
      ) : (
        <>
          <BellOff className="mr-2 h-4 w-4" />
          {loading ? 'Enabling...' : 'Enable Push Notifications'}
        </>
      )}
    </Button>
  );
}
