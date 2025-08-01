import { notificationAPI } from './api';
import { INotification } from '../types';

interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  category?: string;
  type?: string;
}

interface GetNotificationsResponse {
  notifications: INotification[];
  unreadCount: number;
  totalCount: number;
  hasMore: boolean;
}

class NotificationService {
  async getNotifications(params: GetNotificationsParams): Promise<GetNotificationsResponse> {
    const response = await notificationAPI.getNotifications(params);
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch notifications');
    }
    return response.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await notificationAPI.getUnreadCount();
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch unread count');
    }
    return response.data.unreadCount;
  }

  async markAsRead(id: string): Promise<void> {
    const response = await notificationAPI.markAsRead(id);
    if (!response.success) {
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAllAsRead(): Promise<void> {
    const response = await notificationAPI.markAllAsRead();
    if (!response.success) {
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async clearAllNotifications(): Promise<void> {
    const response = await notificationAPI.clearAllNotifications();
    if (!response.success) {
      throw new Error('Failed to clear notifications');
    }
  }

  async deleteNotification(id: string): Promise<void> {
    const response = await notificationAPI.deleteNotification(id);
    if (!response.success) {
      throw new Error('Failed to delete notification');
    }
  }

  async getNotificationStats(): Promise<{
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const response = await notificationAPI.getNotificationStats();
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch notification stats');
    }
    return response.data;
  }

  async getPreferences(): Promise<any> {
    const response = await notificationAPI.getPreferences();
    if (!response.success) {
      throw new Error('Failed to fetch notification preferences');
    }
    return response.data;
  }

  async updatePreferences(preferences: any): Promise<any> {
    const response = await notificationAPI.updatePreferences(preferences);
    if (!response.success) {
      throw new Error('Failed to update notification preferences');
    }
    return response.data;
  }

  async sendTestNotification(data?: {
    type?: string;
    category?: string;
    title?: string;
    message?: string;
    priority?: string;
  }): Promise<any> {
    const response = await notificationAPI.sendTestNotification(data);
    if (!response.success) {
      throw new Error('Failed to send test notification');
    }
    return response.data;
  }

  async getNotificationsByCategory(category: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<GetNotificationsResponse> {
    const response = await notificationAPI.getNotificationsByCategory(category, params);
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch notifications by category');
    }
    return response.data;
  }

  async bulkMarkAsRead(notificationIds: string[]): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    const response = await notificationAPI.bulkMarkAsRead(notificationIds);
    if (!response.success || !response.data) {
      throw new Error('Failed to bulk mark notifications as read');
    }
    return response.data;
  }
}

export const notificationService = new NotificationService();
