'use client';

import React from 'react';
import { CheckCheck, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: Date;
  read: boolean;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationList({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationListProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
                {unreadCount}
              </span>
            )}
          </h3>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="text-xs"
          >
            <CheckCheck className="mr-1 h-3 w-3" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Bell className="h-8 w-8 mb-2" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
            />
          ))
        )}
      </div>
    </div>
  );
}
