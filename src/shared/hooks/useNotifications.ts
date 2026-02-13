import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  taskUpdates: boolean;
  teamInvites: boolean;
  projectDeadlines: boolean;
  goalMilestones: boolean;
  systemUpdates: boolean;
}

const defaultSettings: NotificationSettings = {
  email: true,
  push: true,
  taskUpdates: true,
  teamInvites: true,
  projectDeadlines: true,
  goalMilestones: true,
  systemUpdates: false,
};

/**
 * Custom hook for managing notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useLocalStorage<NotificationSettings>(
    'notificationSettings',
    defaultSettings,
  );

  // Add a new notification
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Auto-remove success notifications after 5 seconds
      if (notification.type === 'success') {
        setTimeout(() => {
          removeNotification(newNotification.id);
        }, 5000);
      }

      return newNotification.id;
    },
    [removeNotification],
  );

  // Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update notification settings
  const updateSettings = useCallback(
    (key: keyof NotificationSettings, value: boolean) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [setSettings],
  );

  // Convenience methods for different notification types
  const showSuccess = useCallback(
    (
      title: string,
      message: string,
      actionUrl?: string,
      actionLabel?: string,
    ) => {
      return addNotification({
        title,
        message,
        type: 'success',
        actionUrl,
        actionLabel,
      });
    },
    [addNotification],
  );

  const showError = useCallback(
    (
      title: string,
      message: string,
      actionUrl?: string,
      actionLabel?: string,
    ) => {
      return addNotification({
        title,
        message,
        type: 'error',
        actionUrl,
        actionLabel,
      });
    },
    [addNotification],
  );

  const showWarning = useCallback(
    (
      title: string,
      message: string,
      actionUrl?: string,
      actionLabel?: string,
    ) => {
      return addNotification({
        title,
        message,
        type: 'warning',
        actionUrl,
        actionLabel,
      });
    },
    [addNotification],
  );

  const showInfo = useCallback(
    (
      title: string,
      message: string,
      actionUrl?: string,
      actionLabel?: string,
    ) => {
      return addNotification({
        title,
        message,
        type: 'info',
        actionUrl,
        actionLabel,
      });
    },
    [addNotification],
  );

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Get notifications by type
  const getByType = useCallback(
    (type: Notification['type']) =>
      notifications.filter((n) => n.type === type),
    [notifications],
  );

  // Request notification permission (for browser notifications)
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        return new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
      }
      return null;
    },
    [],
  );

  return {
    // State
    notifications,
    settings,
    unreadCount,

    // Actions
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    updateSettings,

    // Convenience methods
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Utilities
    getByType,
    requestPermission,
    showBrowserNotification,
  };
}
