import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import NotificationContainer from './NotificationContainer';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 for persistent
  action?: {
    label: string;
    handler: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  maxNotifications = 5 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === 'error' ? 0 : 5000)
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the latest notifications
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [maxNotifications, removeNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({ type: 'error', title, message, duration });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Hook for handling async operations with notifications
export const useAsyncOperation = () => {
  const notifications = useNotifications();

  const executeWithNotification = useCallback(async (
    operation: () => Promise<any>,
    options: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (result: any) => void;
      onError?: (error: any) => void;
    } = {}
  ): Promise<any | null> => {
    let loadingId: string | undefined;

    try {
      // Show loading notification
      if (options.loadingMessage) {
        loadingId = notifications.info(options.loadingMessage);
      }

      const result = await operation();

      // Remove loading notification
      if (loadingId) {
        notifications.removeNotification(loadingId);
      }

      // Show success notification
      if (options.successMessage) {
        notifications.success(options.successMessage);
      }

      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      // Remove loading notification
      if (loadingId) {
        notifications.removeNotification(loadingId);
      }

      // Show error notification
      const errorMessage = options.errorMessage || 'An error occurred';
      notifications.error(errorMessage, error instanceof Error ? error.message : undefined);

      // Call error callback
      if (options.onError) {
        options.onError(error);
      }

      return null;
    }
  }, [notifications]);

  return { executeWithNotification };
};