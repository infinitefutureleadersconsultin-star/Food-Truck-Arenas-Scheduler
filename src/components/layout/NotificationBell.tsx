'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotificationContext, type Notification } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils/cn';

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

const typeColorMap: Record<Notification['type'], string> = {
  info: 'bg-blue-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationContext();
  const [open, setOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              <p className="text-sm text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <ul>
              {recentNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={cn(
                    'flex cursor-pointer gap-3 border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50',
                    !notification.read && 'bg-blue-50/50'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      typeColorMap[notification.type]
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-gray-500">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
