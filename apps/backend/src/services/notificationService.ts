import mongoose from 'mongoose';
import { Notification, INotification, NotificationPreferences } from '../models';
import { emailService } from './emailService';

export interface CreateNotificationData {
  userId: string | mongoose.Types.ObjectId;
  type: 'success' | 'info' | 'warning' | 'error' | 'deadline';
  category: 'authentication' | 'payment' | 'resume' | 'application' | 'interview' | 'cover_letter' | 'career_coach' | 'system';
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action?: {
    label: string;
    url: string;
    type?: 'internal' | 'external';
  };
  metadata?: {
    entityType?: 'resume' | 'application' | 'interview' | 'payment' | 'user';
    entityId?: string;
    source?: string;
    additionalData?: Record<string, any>;
  };
  expiresAt?: Date;
  channels?: ('inApp' | 'email' | 'browser' | 'mobile')[];
}

export class NotificationService {
  private emailService: typeof emailService;

  constructor() {
    this.emailService = emailService;
  }

  /**
   * Create and send a notification through multiple channels with duplicate prevention
   */
  async createNotification(data: CreateNotificationData): Promise<INotification | null> {
    try {
      console.log('🔔 NotificationService.createNotification called:', {
        userId: data.userId,
        type: data.type,
        category: data.category,
        title: data.title,
        priority: data.priority
      });
      
      const userId = typeof data.userId === 'string' 
        ? new mongoose.Types.ObjectId(data.userId) 
        : data.userId;
      
      // Check user preferences before creating notification (but allow urgent notifications)
      console.log('🔍 Checking notification preferences for user:', userId.toString());
      
      // For urgent notifications or system notifications, skip preference checks
      let shouldSend = true;
      if (data.priority !== 'urgent' && data.category !== 'system') {
        try {
          shouldSend = await NotificationPreferences.shouldSendNotification(
            userId,
            data.category,
            'inApp',
            data.priority
          );
        } catch (prefError) {
          console.warn('⚠️ Error checking preferences, allowing notification:', prefError);
          shouldSend = true; // Allow notification if preferences check fails
        }
      }
      
      console.log('🎯 Notification preferences check result:', {
        shouldSend,
        category: data.category,
        priority: data.priority,
        isUrgent: data.priority === 'urgent',
        isSystem: data.category === 'system'
      });

      if (!shouldSend) {
        console.warn('🚫 Notification blocked by user preferences');
        return null;
      }

      // Create in-app notification with duplicate prevention
      const notification = new Notification({
        userId,
        type: data.type,
        category: data.category,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        action: data.action,
        metadata: {
          ...data.metadata,
          source: data.metadata?.source || 'system'
        },
        expiresAt: data.expiresAt,
        // Add timestamp for duplicate prevention index
        createdAt: new Date()
      });

      const savedNotification = await notification.save();
      console.log('✅ Notification saved successfully:', savedNotification._id);

      // Send through additional channels if specified
      if (data.channels) {
        await this.sendThroughChannels(savedNotification, data.channels);
      }

      return savedNotification;
    } catch (error) {
      // Handle duplicate key error gracefully
      if (error.code === 11000 || error.name === 'MongoServerError') {
        console.log('🔄 Duplicate notification prevented:', {
          userId: data.userId,
          category: data.category,
          title: data.title,
          error: error.message
        });
        return null; // Gracefully handle duplicates
      }
      
      console.error('❌ Error creating notification:', error);
      if (error.errors) {
        console.error('Validation errors:', error.errors);
      }
      return null;
    }
  }

  /**
   * Send notification through multiple channels
   */
  private async sendThroughChannels(
    notification: INotification, 
    channels: ('inApp' | 'email' | 'browser' | 'mobile')[]
  ): Promise<void> {
    const promises = channels.map(async (channel) => {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(notification);
            break;
          case 'browser':
            await this.sendBrowserNotification(notification);
            break;
          case 'mobile':
            await this.sendMobileNotification(notification);
            break;
          // inApp is already handled by creating the notification
        }
      } catch (error) {
        console.error(`Error sending ${channel} notification:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send enterprise email notification with rich templates
   */
  private async sendEmailNotification(notification: INotification): Promise<void> {
    try {
      // Check if email notifications are enabled for this user/category
      const canSendEmail = await NotificationPreferences.shouldSendNotification(
        notification.userId,
        notification.category,
        'email',
        notification.priority
      );

      if (!canSendEmail && notification.priority !== 'urgent') {
        return;
      }

      // Get user details
      const User = mongoose.model('User');
      const user = await User.findById(notification.userId);
      if (!user || !user.email) {
        console.warn('⚠️ User not found or email missing for notification:', notification._id);
        return;
      }

      // Send enterprise notification email
      console.log('📧 Attempting to send email notification to:', user.email);
      const success = await this.emailService.sendNotificationEmail({
        to: user.email,
        subject: notification.title,
        body: notification.message,
        type: notification.type,
        action: notification.action,
        priority: notification.priority,
        category: notification.category
      });

      if (!success) {
        console.error('❌ Failed to send email notification to:', user.email, '(SMTP may not be configured)');
        // Update notification delivery status
        await Notification.findByIdAndUpdate(notification._id, {
          deliveryStatus: 'failed',
          $inc: { deliveryAttempts: 1 }
        });
      } else {
        console.log('✅ Email notification sent successfully to:', user.email);
      }
    } catch (error) {
      console.error('❌ Error sending email notification:', error);
      // Update notification delivery status on error
      try {
        await Notification.findByIdAndUpdate(notification._id, {
          deliveryStatus: 'failed',
          $inc: { deliveryAttempts: 1 }
        });
      } catch (updateError) {
        console.error('❌ Failed to update notification delivery status:', updateError);
      }
    }
  }

  /**
   * Send browser push notification (placeholder for future implementation)
   */
  private async sendBrowserNotification(notification: INotification): Promise<void> {
    // TODO: Implement browser push notifications
    console.log('Browser notification would be sent:', notification.title);
  }

  /**
   * Send mobile push notification (placeholder for future implementation)
   */
  private async sendMobileNotification(notification: INotification): Promise<void> {
    // TODO: Implement mobile push notifications
    console.log('Mobile notification would be sent:', notification.title);
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string | mongoose.Types.ObjectId,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      category?: string;
      type?: string;
    } = {}
  ): Promise<{
    notifications: INotification[];
    unreadCount: number;
    totalCount: number;
    hasMore: boolean;
  }> {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      category,
      type
    } = options;

    const userObjectId = typeof userId === 'string' 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    const filter: any = { userId: userObjectId };
    
    if (unreadOnly) {
      filter.read = false;
    }
    if (category) {
      filter.category = category;
    }
    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const [notifications, unreadCount, totalCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: userObjectId, read: false }),
      Notification.countDocuments(filter)
    ]);

    return {
      notifications,
      unreadCount,
      totalCount,
      hasMore: totalCount > skip + notifications.length
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.findOneAndUpdate(
        { 
          _id: notificationId, 
          userId: new mongoose.Types.ObjectId(userId) 
        },
        { 
          read: true, 
          readAt: new Date() 
        },
        { new: true }
      );

      return !!result;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await Notification.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), read: false },
        { 
          read: true, 
          readAt: new Date() 
        }
      );

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      return !!result;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Clear all notifications for a user
   */
  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      await Notification.deleteMany({
        userId: new mongoose.Types.ObjectId(userId)
      });

      return true;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      return false;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [total, unread, byCategory, byType] = await Promise.all([
      Notification.countDocuments({ userId: userObjectId }),
      Notification.countDocuments({ userId: userObjectId, read: false }),
      Notification.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Notification.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    return {
      total,
      unread,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
  }

  // Convenience methods for different notification types

  /**
   * Force create a notification (bypasses preferences for critical notifications)
   */
  async forceCreateNotification(data: CreateNotificationData): Promise<INotification> {
    try {
      console.log('🚨 Force creating notification:', {
        userId: data.userId,
        type: data.type,
        category: data.category,
        title: data.title
      });
      
      const userId = typeof data.userId === 'string' 
        ? new mongoose.Types.ObjectId(data.userId) 
        : data.userId;

      // Create in-app notification without checking preferences
      const notification = new Notification({
        userId,
        type: data.type,
        category: data.category,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        action: data.action,
        metadata: {
          ...data.metadata,
          source: data.metadata?.source || 'system'
        },
        expiresAt: data.expiresAt,
      });

      const savedNotification = await notification.save();
      console.log('✅ Notification force created successfully:', savedNotification._id);

      return savedNotification;
    } catch (error) {
      console.error('❌ Error force creating notification:', error);
      throw error;
    }
  }

  /**
   * Authentication notifications
   */
  async sendAuthNotification(
    userId: string,
    type: 'login_success' | 'registration_complete' | 'email_verified' | 'security_alert',
    additionalData?: Record<string, any>
  ): Promise<INotification | null> {
    const templates = {
      login_success: {
        title: 'Welcome back!',
        message: 'You have successfully logged into your account.',
        type: 'success' as const,
        priority: 'low' as const
      },
      registration_complete: {
        title: 'Registration Complete!',
        message: 'Welcome to AI Job Suite! Your account has been created successfully.',
        type: 'success' as const,
        priority: 'medium' as const,
        action: {
          label: 'Get Started',
          url: '/dashboard',
          type: 'internal' as const
        }
      },
      email_verified: {
        title: 'Email Verified!',
        message: 'Your email address has been successfully verified.',
        type: 'success' as const,
        priority: 'medium' as const
      },
      security_alert: {
        title: 'Security Alert',
        message: 'We detected a login from a new device or location.',
        type: 'warning' as const,
        priority: 'high' as const,
        action: {
          label: 'Review Security',
          url: '/dashboard/account/security',
          type: 'internal' as const
        }
      }
    };

    const template = templates[type];
    
    // Use force create for critical auth notifications including login_success
    // Login notifications should always be created to provide user feedback
    if (type === 'login_success' || type === 'registration_complete' || type === 'security_alert') {
      console.log('🔔 Using forceCreateNotification for auth type:', type);
      return this.forceCreateNotification({
        userId,
        category: 'authentication',
        ...template,
        metadata: {
          source: 'authController',
          additionalData
        }
      });
    }
    
    return this.createNotification({
      userId,
      category: 'authentication',
      ...template,
      metadata: {
        source: 'authController',
        additionalData
      },
      channels: ['inApp', 'email']
    });
  }

  /**
   * Payment notifications
   */
  async sendPaymentNotification(
    userId: string,
    type: 'payment_success' | 'payment_failed' | 'subscription_renewed' | 'subscription_cancelled',
    additionalData?: Record<string, any>
  ): Promise<INotification | null> {
    const templates = {
      payment_success: {
        title: 'Payment Successful!',
        message: 'Your payment has been processed successfully.',
        type: 'success' as const,
        priority: 'medium' as const
      },
      payment_failed: {
        title: 'Payment Failed',
        message: 'We could not process your payment. Please update your payment method.',
        type: 'error' as const,
        priority: 'high' as const,
        action: {
          label: 'Update Payment',
          url: '/dashboard/account/billing',
          type: 'internal' as const
        }
      },
      subscription_renewed: {
        title: 'Subscription Renewed',
        message: 'Your Enterprise subscription has been successfully renewed.',
        type: 'success' as const,
        priority: 'medium' as const
      },
      subscription_cancelled: {
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. You can reactivate it anytime.',
        type: 'warning' as const,
        priority: 'high' as const,
        action: {
          label: 'Reactivate',
          url: '/dashboard/upgrade',
          type: 'internal' as const
        }
      }
    };

    const template = templates[type];
    return this.createNotification({
      userId,
      category: 'payment',
      ...template,
      metadata: {
        source: 'paymentController',
        additionalData
      },
      channels: ['inApp', 'email']
    });
  }

  /**
   * Resume notifications
   */
  async sendResumeNotification(
    userId: string,
    type: 'resume_created' | 'ai_analysis_complete' | 'resume_optimized' | 'export_ready',
    resumeId?: string,
    additionalData?: Record<string, any>
  ): Promise<INotification | null> {
    const templates = {
      resume_created: {
        title: 'Resume Created!',
        message: 'Your new resume has been created successfully.',
        type: 'success' as const,
        priority: 'medium' as const,
        action: {
          label: 'View Resume',
          url: `/dashboard/resume/preview/${resumeId}`,
          type: 'internal' as const
        }
      },
      ai_analysis_complete: {
        title: 'AI Analysis Complete',
        message: 'Your resume has been analyzed. Check out the optimization suggestions!',
        type: 'info' as const,
        priority: 'medium' as const,
        action: {
          label: 'View Analysis',
          url: `/dashboard/resume/preview/${resumeId}`,
          type: 'internal' as const
        }
      },
      resume_optimized: {
        title: 'Resume Optimized!',
        message: 'Your resume has been optimized for better ATS compatibility.',
        type: 'success' as const,
        priority: 'medium' as const
      },
      export_ready: {
        title: 'Export Ready',
        message: 'Your resume is ready for download in multiple formats.',
        type: 'info' as const,
        priority: 'low' as const
      }
    };

    const template = templates[type];
    return this.createNotification({
      userId,
      category: 'resume',
      ...template,
      metadata: {
        entityType: 'resume',
        entityId: resumeId,
        source: 'resumeController',
        additionalData
      },
      channels: ['inApp']
    });
  }

  /**
   * Application notifications
   */
  async sendApplicationNotification(
    userId: string,
    type: 'application_created' | 'status_updated' | 'deadline_approaching' | 'interview_scheduled',
    applicationId?: string,
    additionalData?: Record<string, any>
  ): Promise<INotification | null> {
    const templates = {
      application_created: {
        title: 'Application Submitted!',
        message: 'Your job application has been submitted successfully.',
        type: 'success' as const,
        priority: 'medium' as const,
        action: {
          label: 'View Application',
          url: `/dashboard/applications/${applicationId}`,
          type: 'internal' as const
        }
      },
      status_updated: {
        title: 'Application Status Updated',
        message: `Your application status has changed to: ${additionalData?.status || 'updated'}`,
        type: 'info' as const,
        priority: 'high' as const,
        action: {
          label: 'View Details',
          url: `/dashboard/applications/${applicationId}`,
          type: 'internal' as const
        }
      },
      deadline_approaching: {
        title: 'Deadline Approaching',
        message: 'You have pending tasks that are due soon.',
        type: 'deadline' as const,
        priority: 'high' as const,
        action: {
          label: 'View Tasks',
          url: `/dashboard/applications/${applicationId}`,
          type: 'internal' as const
        }
      },
      interview_scheduled: {
        title: 'Interview Scheduled!',
        message: 'A new interview has been scheduled for your application.',
        type: 'success' as const,
        priority: 'high' as const,
        action: {
          label: 'View Interview',
          url: `/dashboard/calendar`,
          type: 'internal' as const
        }
      }
    };

    const template = templates[type];
    return this.createNotification({
      userId,
      category: 'application',
      ...template,
      metadata: {
        entityType: 'application',
        entityId: applicationId,
        source: 'jobApplicationController',
        additionalData
      },
      channels: ['inApp', 'email']
    });
  }

  /**
   * Interview notifications
   */
  async sendInterviewNotification(
    userId: string,
    type: 'interview_reminder' | 'interview_confirmed' | 'interview_rescheduled' | 'feedback_requested',
    interviewId?: string,
    additionalData?: Record<string, any>
  ): Promise<INotification | null> {
    const templates = {
      interview_reminder: {
        title: 'Interview Reminder',
        message: `You have an interview ${additionalData?.timeUntil || 'soon'}`,
        type: 'deadline' as const,
        priority: 'high' as const,
        action: {
          label: 'View Details',
          url: `/dashboard/calendar`,
          type: 'internal' as const
        }
      },
      interview_confirmed: {
        title: 'Interview Confirmed',
        message: 'Your interview has been confirmed with the interviewer.',
        type: 'success' as const,
        priority: 'medium' as const
      },
      interview_rescheduled: {
        title: 'Interview Rescheduled',
        message: 'Your interview has been rescheduled. Please check the new time.',
        type: 'warning' as const,
        priority: 'high' as const,
        action: {
          label: 'View Schedule',
          url: `/dashboard/calendar`,
          type: 'internal' as const
        }
      },
      feedback_requested: {
        title: 'Feedback Requested',
        message: 'Please provide feedback about your recent interview.',
        type: 'info' as const,
        priority: 'medium' as const,
        action: {
          label: 'Give Feedback',
          url: `/dashboard/calendar`,
          type: 'internal' as const
        }
      }
    };

    const template = templates[type];
    return this.createNotification({
      userId,
      category: 'interview',
      ...template,
      metadata: {
        entityType: 'interview',
        entityId: interviewId,
        source: 'interviewController',
        additionalData
      },
      channels: ['inApp', 'email']
    });
  }

  /**
   * Create a simple test notification - useful for debugging
   */
  async createTestNotification(userId: string): Promise<INotification> {
    return this.forceCreateNotification({
      userId,
      type: 'info',
      category: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working correctly.',
      priority: 'medium',
      metadata: {
        source: 'testService',
        additionalData: { testId: Date.now() }
      }
    });
  }

  /**
   * System notifications
   */
  async sendSystemNotification(
    userId: string,
    type: 'welcome' | 'feature_announcement' | 'maintenance' | 'account_limit',
    additionalData?: Record<string, any>
  ): Promise<INotification | null> {
    const templates = {
      welcome: {
        title: 'Welcome to AI Job Suite!',
        message: 'Get started by creating your first AI-optimized resume.',
        type: 'info' as const,
        priority: 'medium' as const,
        action: {
          label: 'Create Resume',
          url: '/dashboard/resume/templates',
          type: 'internal' as const
        }
      },
      feature_announcement: {
        title: 'New Feature Available!',
        message: additionalData?.message || 'Check out our latest feature updates.',
        type: 'info' as const,
        priority: 'low' as const
      },
      maintenance: {
        title: 'Scheduled Maintenance',
        message: 'The system will undergo maintenance. Some features may be temporarily unavailable.',
        type: 'warning' as const,
        priority: 'medium' as const
      },
      account_limit: {
        title: 'Account Limit Reached',
        message: 'You have reached your account limits. Consider upgrading for more features.',
        type: 'warning' as const,
        priority: 'medium' as const,
        action: {
          label: 'Upgrade Now',
          url: '/dashboard/upgrade',
          type: 'internal' as const
        }
      }
    };

    const template = templates[type];
    return this.createNotification({
      userId,
      category: 'system',
      ...template,
      metadata: {
        source: 'system',
        additionalData
      },
      channels: ['inApp']
    });
  }

  /**
   * Bulk notification for multiple users
   */
  async sendBulkNotification(
    userIds: string[],
    notificationData: Omit<CreateNotificationData, 'userId'>
  ): Promise<INotification[]> {
    const notifications = await Promise.allSettled(
      userIds.map(userId => this.createNotification({ ...notificationData, userId }))
    );

    return notifications
      .filter((result): result is PromiseFulfilledResult<INotification> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * Enterprise notification analytics and monitoring
   */
  async getEnterpriseAnalytics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalSent: number;
    deliveryRate: number;
    openRate: number;
    categoryBreakdown: Record<string, number>;
    channelPerformance: Record<string, { sent: number; delivered: number; failed: number }>;
    failureAnalysis: { reason: string; count: number }[];
  }> {
    const now = new Date();
    const timeMap = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    const startTime = new Date(now.getTime() - timeMap[timeframe]);

    const [totalSent, deliveryStats, categoryStats, readStats] = await Promise.all([
      Notification.countDocuments({ createdAt: { $gte: startTime } }),
      Notification.aggregate([
        { $match: { createdAt: { $gte: startTime } } },
        { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } }
      ]),
      Notification.aggregate([
        { $match: { createdAt: { $gte: startTime } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Notification.countDocuments({ 
        createdAt: { $gte: startTime }, 
        read: true 
      })
    ]);

    const delivered = deliveryStats.find(s => s._id === 'delivered')?.count || 0;
    const failed = deliveryStats.find(s => s._id === 'failed')?.count || 0;

    return {
      totalSent,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      openRate: totalSent > 0 ? (readStats / totalSent) * 100 : 0,
      categoryBreakdown: categoryStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      channelPerformance: {
        inApp: { sent: totalSent, delivered, failed },
        email: { sent: 0, delivered: 0, failed: 0 } // TODO: Track email separately
      },
      failureAnalysis: []
    };
  }

  /**
   * Retry failed notifications with exponential backoff
   */
  async retryFailedNotifications(): Promise<{ retried: number; succeeded: number; permanentFailures: number }> {
    const maxRetries = 3;
    const failedNotifications = await Notification.find({
      deliveryStatus: 'failed',
      deliveryAttempts: { $lt: maxRetries },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Only retry from last 24 hours
    }).limit(100); // Process in batches

    let retried = 0;
    let succeeded = 0;
    let permanentFailures = 0;

    for (const notification of failedNotifications) {
      try {
        retried++;
        
        // Exponential backoff delay
        const delay = Math.pow(2, notification.deliveryAttempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry email notification
        await this.sendEmailNotification(notification);
        
        // Update success status
        notification.deliveryStatus = 'delivered';
        notification.deliveredAt = new Date();
        await notification.save();
        succeeded++;

      } catch (error) {
        console.error(`❌ Retry failed for notification ${notification._id}:`, error);
        
        // Update failure count
        notification.deliveryAttempts += 1;
        
        if (notification.deliveryAttempts >= maxRetries) {
          notification.deliveryStatus = 'failed';
          permanentFailures++;
        }
        
        await notification.save();
      }
    }

    console.log(`🔄 Notification retry complete: ${retried} retried, ${succeeded} succeeded, ${permanentFailures} permanent failures`);
    
    return { retried, succeeded, permanentFailures };
  }

  /**
   * Enterprise notification health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      pendingNotifications: number;
      failedNotifications: number;
      avgDeliveryTime: number;
      systemLoad: number;
    };
    issues: string[];
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const [pending, failed, recentNotifications] = await Promise.all([
      Notification.countDocuments({ deliveryStatus: 'pending' }),
      Notification.countDocuments({ 
        deliveryStatus: 'failed',
        createdAt: { $gte: oneHourAgo }
      }),
      Notification.find({ 
        createdAt: { $gte: oneHourAgo },
        deliveredAt: { $exists: true }
      }).select('createdAt deliveredAt').lean()
    ]);

    // Calculate average delivery time
    const avgDeliveryTime = recentNotifications.length > 0 
      ? recentNotifications.reduce((sum, notif) => {
          return sum + (new Date(notif.deliveredAt!).getTime() - new Date(notif.createdAt).getTime());
        }, 0) / recentNotifications.length
      : 0;

    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Health checks
    if (pending > 100) {
      issues.push(`High pending notifications: ${pending}`);
      status = 'degraded';
    }

    if (failed > 50) {
      issues.push(`High failure rate: ${failed} failed in last hour`);
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
    }

    if (avgDeliveryTime > 30000) { // 30 seconds
      issues.push(`Slow delivery time: ${Math.round(avgDeliveryTime / 1000)}s average`);
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
    }

    return {
      status,
      metrics: {
        pendingNotifications: pending,
        failedNotifications: failed,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        systemLoad: 0 // TODO: Add actual system load monitoring
      },
      issues
    };
  }

  /**
   * Clean up old notifications with enterprise retention policies
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<{
    deletedCount: number;
    archivedCount: number;
    retentionPolicy: string;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Archive important notifications instead of deleting
    const importantNotifications = await Notification.updateMany({
      createdAt: { $lt: cutoffDate },
      read: true,
      priority: { $in: ['high', 'urgent'] }
    }, {
      $set: { archived: true }
    });

    // Delete non-important, read notifications
    const deleteResult = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true,
      priority: { $in: ['low', 'medium'] },
      archived: { $ne: true }
    });

    console.log(`🗂️ Notification cleanup: ${deleteResult.deletedCount} deleted, ${importantNotifications.modifiedCount} archived`);

    return {
      deletedCount: deleteResult.deletedCount || 0,
      archivedCount: importantNotifications.modifiedCount || 0,
      retentionPolicy: `${daysOld} days retention, high/urgent notifications archived`
    };
  }
}

export const notificationService = new NotificationService();