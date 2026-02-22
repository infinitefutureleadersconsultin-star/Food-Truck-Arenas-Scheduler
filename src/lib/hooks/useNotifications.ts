'use client';

import { useNotificationContext } from '@/contexts/NotificationContext';

export function useNotifications() {
  return useNotificationContext();
}

export function useUnreadCount() {
  const { unreadCount } = useNotificationContext();
  return unreadCount;
}
