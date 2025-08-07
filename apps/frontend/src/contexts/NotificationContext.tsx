import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { INotification } from '../types';
import { useAuthStore } from '../stores/authStore';

interface NotificationContextType {
  notifications: INotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  refreshNotifications: () => void;
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
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const result = await notificationService.getNotifications({ limit: 100 });
        console.log('🔔 Notifications fetched:', result);
        return result;
      } catch (error) {
        console.error('❌ Failed to fetch notifications:', error);
        throw error;
      }
    },
    // Only enable the query if the user is authenticated
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
    retry: 3,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationService.clearAllNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const clearAll = () => {
    clearAllMutation.mutate();
  };

  const refreshNotifications = useCallback(() => {
    if (isAuthenticated) {
      refetch();
    }
  }, [refetch, isAuthenticated]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
