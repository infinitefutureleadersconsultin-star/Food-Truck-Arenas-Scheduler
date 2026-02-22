'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

let notificationIdCounter = 0;

function generateNotificationId(): string {
  notificationIdCounter += 1;
  return `notification-${Date.now()}-${notificationIdCounter}`;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: generateNotificationId(),
        createdAt: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
    }),
    [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}
