import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { NavNotification } from '../components/layout/NotificationDropdown';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from '../stores/authStore';

interface NavNotificationContextType {
  notifications: NavNotification[];
  unreadCount: number;
  loading: boolean;  
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  refreshNotifications: () => Promise<void>;
}

const NavNotificationContext = createContext<NavNotificationContextType | undefined>(undefined);

export const useNavNotifications = () => {
  const context = useContext(NavNotificationContext);
  if (!context) {
    throw new Error('useNavNotifications must be used within a NavNotificationProvider');
  }
  return context;
};

interface NavNotificationProviderProps {
  children: ReactNode;
}

export const NavNotificationProvider: React.FC<NavNotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NavNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const { isAuthenticated, loginNotification, clearLoginNotification } = useAuthStore();

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      console.log('🔄 Refreshing notifications...');
      const response = await notificationService.getNotifications({ limit: 50 });
      console.log('📨 Notifications response:', response);
      
      const fetchedNotifications = response.data?.notifications || [];
      const fetchedUnreadCount = response.data?.unreadCount || 0;
      
      console.log('📊 Fetched notifications:', { 
        count: fetchedNotifications.length, 
        unreadCount: fetchedUnreadCount 
      });
      
      const mappedNotifications = fetchedNotifications.map(n => 
        notificationService.mapBackendNotification(n)
      );
      setNotifications(mappedNotifications);
      setUnreadCount(fetchedUnreadCount);
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      // Don't show error to user, just log and continue
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await notificationService.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      const wasUnread = notifications.find(n => n.id === id)?.read === false;
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [notifications]);

  // Effect to handle the login notification from the auth store
  useEffect(() => {
    if (loginNotification) {
      const newNotification = notificationService.mapBackendNotification(loginNotification);
      
      setNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)].slice(0, 50));
      
      const isAlreadyUnread = notifications.find(n => n.id === newNotification.id)?.read === false;
      if (!isAlreadyUnread) {
        setUnreadCount(prev => prev + 1);
      }
      
      clearLoginNotification();
    }
  }, [loginNotification, clearLoginNotification, notifications]);

  // Effect to fetch notifications when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, refreshNotifications]);

  // Effect for polling
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshNotifications]);

  const value: NavNotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    refreshNotifications
  };

  return (
    <NavNotificationContext.Provider value={value}>
      {children}
    </NavNotificationContext.Provider>
  );
};
