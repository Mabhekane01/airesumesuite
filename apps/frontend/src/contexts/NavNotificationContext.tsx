import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { NavNotification } from '../components/layout/NotificationDropdown';

interface NavNotificationContextType {
  notifications: NavNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<NavNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
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

  const addNotification = useCallback((notification: Omit<NavNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NavNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Demo notifications - Add some sample notifications on mount
  useEffect(() => {
    const demoNotifications = [
      {
        type: 'success' as const,
        title: 'Resume Generated',
        message: 'Your ATS-optimized resume has been successfully created and is ready for download.'
      },
      {
        type: 'warning' as const,
        title: 'Application Deadline',
        message: 'Your application for Software Engineer at Tech Corp is due in 2 days.',
        action: { label: 'View Application', href: '/job-tracker' }
      },
      {
        type: 'info' as const,
        title: 'Cover Letter Ready',
        message: 'Your personalized cover letter has been generated and optimized for the position.'
      }
    ];

    // Add demo notifications after a short delay
    setTimeout(() => {
      demoNotifications.forEach((notif, index) => {
        setTimeout(() => addNotification(notif), index * 500);
      });
    }, 1000);
  }, [addNotification]);

  const value: NavNotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification
  };

  return (
    <NavNotificationContext.Provider value={value}>
      {children}
    </NavNotificationContext.Provider>
  );
};