import { api } from './api';

export interface Notification {
  id: string;
  userId: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'deadline';
  category: 'authentication' | 'payment' | 'resume' | 'application' | 'interview' | 'cover_letter' | 'career_coach' | 'system';
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action?: {
    label: string;
    url: string;
    type: 'internal' | 'external';
  };
  metadata?: {
    entityType?: 'resume' | 'application' | 'interview' | 'payment' | 'user';
    entityId?: string;
    source?: string;
    additionalData?: Record<string, any>;
  };
  expiresAt?: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  deliveryAttempts: number;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
    totalCount: number;
    hasMore: boolean;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  enabled: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    browser: boolean;
    mobile: boolean;
  };
  categories: {
    [key: string]: {
      enabled: boolean;
      channels: string[];
      priority: 'low' | 'medium' | 'high';
    };
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  dailyLimit: {
    enabled: boolean;
    maxNotifications: number;
  };
  summaries: {
    daily: {
      enabled: boolean;
      time: string;
    };
    weekly: {
      enabled: boolean;
      day: number;
      time: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

class NotificationService {
  private baseURL = '/api/v1/notifications';

  /**
   * Get user notifications with pagination and filtering
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    category?: string;
    type?: string;
  }): Promise<NotificationResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) searchParams.append('unreadOnly', 'true');
    if (params?.category) searchParams.append('category', params.category);
    if (params?.type) searchParams.append('type', params.type);

    const response = await api.get(`${this.baseURL}?${searchParams.toString()}`);
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    const response = await api.get(`${this.baseURL}/unread-count`);
    return response.data.data;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`${this.baseURL}/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await api.put(`${this.baseURL}/mark-all-read`);
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`${this.baseURL}/${notificationId}`);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await api.delete(`${this.baseURL}`);
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<NotificationStats> {
    const response = await api.get(`${this.baseURL}/stats`);
    return response.data.data;
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get(`${this.baseURL}/preferences`);
    return response.data.data;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put(`${this.baseURL}/preferences`, preferences);
    return response.data.data;
  }

  /**
   * Update category-specific preferences
   */
  async updateCategoryPreferences(
    category: string,
    settings: {
      enabled?: boolean;
      channels?: string[];
      priority?: string;
    }
  ): Promise<NotificationPreferences> {
    const response = await api.put(`${this.baseURL}/preferences/${category}`, settings);
    return response.data.data;
  }

  /**
   * Get notifications by category
   */
  async getNotificationsByCategory(
    category: string,
    params?: { page?: number; limit?: number }
  ): Promise<NotificationResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await api.get(`${this.baseURL}/category/${category}?${searchParams.toString()}`);
    return response.data;
  }

  /**
   * Bulk mark notifications as read
   */
  async bulkMarkAsRead(notificationIds: string[]): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    const response = await api.put(`${this.baseURL}/bulk-mark-read`, { notificationIds });
    return response.data.data;
  }

  /**
   * Create a test notification (development only)
   */
  async sendTestNotification(notification: {
    type?: string;
    category?: string;
    title?: string;
    message?: string;
    priority?: string;
  }): Promise<Notification> {
    const response = await api.post(`${this.baseURL}/test`, notification);
    return response.data.data;
  }

  /**
   * Convert backend notification to frontend format
   */
  mapBackendNotification(backendNotification: Notification): import('../components/layout/NotificationDropdown').NavNotification {
    return {
      id: backendNotification.id,
      type: backendNotification.type === 'error' ? 'warning' : backendNotification.type,
      title: backendNotification.title,
      message: backendNotification.message,
      timestamp: backendNotification.createdAt,
      read: backendNotification.read,
      action: backendNotification.action ? {
        label: backendNotification.action.label,
        href: backendNotification.action.url
      } : undefined
    };
  }

  /**
   * Poll for new notifications (for real-time updates)
   */
  async pollNotifications(
    lastChecked?: string,
    onNewNotifications?: (notifications: Notification[]) => void
  ): Promise<void> {
    try {
      const params: any = { limit: 10 };
      if (lastChecked) {
        // In a real implementation, you might want to filter by timestamp
        params.unreadOnly = true;
      }

      const response = await this.getNotifications(params);
      
      if (response.data.notifications.length > 0 && onNewNotifications) {
        const newNotifications = lastChecked 
          ? response.data.notifications.filter(n => n.createdAt > lastChecked)
          : response.data.notifications;
          
        if (newNotifications.length > 0) {
          onNewNotifications(newNotifications);
        }
      }
    } catch (error) {
      console.error('Failed to poll notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();