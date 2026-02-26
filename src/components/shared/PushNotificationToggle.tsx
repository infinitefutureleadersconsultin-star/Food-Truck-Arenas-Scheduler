'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  isPushSupported,
  getPushPermission,
  requestPushPermission,
} from '@/lib/services/pushNotificationService';

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const isSupported = isPushSupported();
    setSupported(isSupported);
    if (isSupported) {
      setPermission(getPushPermission());
    }
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    const result = await requestPushPermission();
    setPermission(result);
    setRequesting(false);
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <BellOff className="h-5 w-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-700">Push Notifications</p>
          <p className="text-xs text-gray-500">
            Not supported in this browser.
          </p>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <BellOff className="h-5 w-5 text-red-400" />
        <div>
          <p className="text-sm font-medium text-red-700">Push Notifications Blocked</p>
          <p className="text-xs text-red-600">
            Notifications have been blocked. Enable them in your browser settings.
          </p>
        </div>
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <Bell className="h-5 w-5 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-700">Push Notifications Enabled</p>
          <p className="text-xs text-green-600">
            You will receive browser notifications for important updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={true} disabled />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <Bell className="h-5 w-5 text-gray-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">Push Notifications</p>
        <p className="text-xs text-gray-500">
          Enable browser notifications for booking updates, reminders, and alerts.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleEnable}
        disabled={requesting}
      >
        {requesting ? 'Enabling...' : 'Enable'}
      </Button>
    </div>
  );
}

export function NotificationPreferencesPanel() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  useEffect(() => {
    const isSupported = isPushSupported();
    setSupported(isSupported);
    if (isSupported) {
      setPermission(getPushPermission());
    }
  }, []);

  const enabled = supported && permission === 'granted';

  const preferences = [
    { key: 'bookingConfirmations', label: 'Booking Confirmations', description: 'When your booking is confirmed or updated' },
    { key: 'checkInReminders', label: 'Check-in Reminders', description: 'Reminders to confirm attendance on booking day' },
    { key: 'announcements', label: 'Announcements', description: 'Important commissary announcements' },
    { key: 'messages', label: 'Messages', description: 'When you receive new messages' },
    { key: 'teamUpdates', label: 'Team Updates', description: 'Assignments and team-related notifications' },
  ];

  return (
    <div className="space-y-4">
      <PushNotificationToggle />

      {enabled && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Notification Types
          </p>
          {preferences.map((pref) => (
            <div
              key={pref.key}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div>
                <Label className="text-sm font-medium">{pref.label}</Label>
                <p className="text-xs text-gray-500">{pref.description}</p>
              </div>
              <Switch defaultChecked={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
