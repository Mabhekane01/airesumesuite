import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { NotificationPreferences } from '../models';
import { handleControllerError } from '../utils/errorUtils';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

export class NotificationController {
  
  /**
   * Get user notifications with pagination and filtering
   */
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        page = '1',
        limit = '20',
        unreadOnly = 'false',
        category,
        type
      } = req.query;

      const options = {
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100), // Max 100 notifications per request
        unreadOnly: unreadOnly === 'true',
        category: category as string,
        type: type as string
      };

      const result = await notificationService.getUserNotifications(userId, options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to fetch notifications');
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const result = await notificationService.getUserNotifications(userId, { 
        limit: 0,
        unreadOnly: true 
      });

      res.json({
        success: true,
        data: {
          unreadCount: result.unreadCount
        }
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to fetch unread count');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!notificationId) {
        res.status(400).json({ error: 'Notification ID is required' });
        return;
      }

      const success = await notificationService.markAsRead(notificationId, userId);
      
      if (!success) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const success = await notificationService.markAllAsRead(userId);
      
      if (!success) {
        res.status(500).json({ error: 'Failed to mark notifications as read' });
        return;
      }

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to mark all notifications as read');
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!notificationId) {
        res.status(400).json({ error: 'Notification ID is required' });
        return;
      }

      const success = await notificationService.deleteNotification(notificationId, userId);
      
      if (!success) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to delete notification');
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const success = await notificationService.clearAllNotifications(userId);
      
      if (!success) {
        res.status(500).json({ error: 'Failed to clear notifications' });
        return;
      }

      res.json({
        success: true,
        message: 'All notifications cleared'
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to clear notifications');
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const stats = await notificationService.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to fetch notification statistics');
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const preferences = await NotificationPreferences.getOrCreateForUser(userId);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to fetch notification preferences');
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const updates = req.body;
      
      // Validate the updates object
      if (!updates || typeof updates !== 'object') {
        res.status(400).json({ error: 'Invalid preferences data' });
        return;
      }

      const preferences = await NotificationPreferences.getOrCreateForUser(userId);
      
      // Update the preferences
      Object.assign(preferences, updates);
      preferences.markModified('categories');
      preferences.markModified('channels');
      
      await preferences.save();

      res.json({
        success: true,
        data: preferences,
        message: 'Notification preferences updated'
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to update notification preferences');
    }
  }

  /**
   * Update category-specific preferences
   */
  async updateCategoryPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { category } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!category) {
        res.status(400).json({ error: 'Category is required' });
        return;
      }

      const { enabled, channels, priority } = req.body;

      const preferences = await NotificationPreferences.getOrCreateForUser(userId);
      
      await preferences.updateCategory(category, {
        enabled,
        channels,
        priority
      });

      res.json({
        success: true,
        data: preferences,
        message: `${category} notification preferences updated`
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to update category preferences');
    }
  }

  /**
   * Test notification (for development/debugging)
   */
  async sendTestNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        type = 'info',
        category = 'system',
        title = 'Test Notification',
        message = 'This is a test notification',
        priority = 'medium'
      } = req.body;

      const notification = await notificationService.createNotification({
        userId,
        type,
        category,
        title,
        message,
        priority,
        metadata: {
          source: 'testController'
        }
      });

      res.json({
        success: true,
        data: notification,
        message: 'Test notification sent'
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to send test notification');
    }
  }

  /**
   * Create a custom notification (for admin use or special cases)
   */
  async createNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        type,
        category,
        title,
        message,
        priority,
        action,
        metadata,
        expiresAt,
        channels
      } = req.body;

      // Validate required fields
      if (!type || !category || !title || !message) {
        res.status(400).json({ 
          error: 'Missing required fields: type, category, title, message' 
        });
        return;
      }

      const notification = await notificationService.createNotification({
        userId,
        type,
        category,
        title,
        message,
        priority,
        action,
        metadata,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        channels
      });

      res.status(201).json({
        success: true,
        data: notification,
        message: 'Notification created successfully'
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to create notification');
    }
  }

  /**
   * Get notifications by category
   */
  async getNotificationsByCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { category } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!category) {
        res.status(400).json({ error: 'Category is required' });
        return;
      }

      const {
        page = '1',
        limit = '20'
      } = req.query;

      const result = await notificationService.getUserNotifications(userId, {
        category,
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100)
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to fetch notifications by category');
    }
  }

  /**
   * Bulk mark notifications as read
   */
  async bulkMarkAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { notificationIds } = req.body;
      
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        res.status(400).json({ error: 'notification IDs array is required' });
        return;
      }

      const results = await Promise.allSettled(
        notificationIds.map(id => notificationService.markAsRead(id, userId))
      );

      const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value
      ).length;

      res.json({
        success: true,
        data: {
          total: notificationIds.length,
          successful: successCount,
          failed: notificationIds.length - successCount
        },
        message: `${successCount} notifications marked as read`
      });
    } catch (error) {
      handleControllerError(res, error, 'Failed to bulk mark notifications as read');
    }
  }
}

export const notificationController = new NotificationController();