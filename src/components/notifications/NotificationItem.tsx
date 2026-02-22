'use client';

import React from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: Date;
  read: boolean;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const typeStyles: Record<string, string> = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const Icon = typeIcons[notification.type] || Bell;
  const iconStyle = typeStyles[notification.type] || 'text-gray-500';

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors',
        notification.read
          ? 'bg-white hover:bg-gray-50'
          : 'bg-blue-50 hover:bg-blue-100'
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        <Icon className={cn('h-5 w-5', iconStyle)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm',
              notification.read ? 'font-normal' : 'font-semibold'
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {getTimeAgo(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}
