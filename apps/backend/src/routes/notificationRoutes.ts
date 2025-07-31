import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { body, param, query } from 'express-validator';

const router: Router = Router();

// Apply authentication middleware to all notification routes
router.use(authMiddleware);

// Validation schemas
const createNotificationValidation = [
  body('type')
    .isIn(['success', 'info', 'warning', 'error', 'deadline'])
    .withMessage('Type must be one of: success, info, warning, error, deadline'),
  body('category')
    .isIn(['authentication', 'payment', 'resume', 'application', 'interview', 'cover_letter', 'career_coach', 'system'])
    .withMessage('Invalid category'),
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('action')
    .optional()
    .isObject()
    .custom((action) => {
      if (action && (!action.label || !action.url)) {
        throw new Error('Action must have label and url properties');
      }
      return true;
    }),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('expiresAt must be a valid ISO 8601 date'),
  body('channels')
    .optional()
    .isArray()
    .custom((channels) => {
      if (channels && !channels.every(c => ['inApp', 'email', 'browser', 'mobile'].includes(c))) {
        throw new Error('Channels must be an array of: inApp, email, browser, mobile');
      }
      return true;
    })
];

const updatePreferencesValidation = [
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled must be a boolean'),
  body('channels')
    .optional()
    .isObject()
    .withMessage('channels must be an object'),
  body('categories')
    .optional()
    .isObject()
    .withMessage('categories must be an object'),
  body('quietHours')
    .optional()
    .isObject()
    .withMessage('quietHours must be an object'),
  body('dailyLimit')
    .optional()
    .isObject()
    .withMessage('dailyLimit must be an object')
];

const categoryPreferencesValidation = [
  param('category')
    .isIn(['authentication', 'payment', 'resume', 'application', 'interview', 'cover_letter', 'career_coach', 'system'])
    .withMessage('Invalid category'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled must be a boolean'),
  body('channels')
    .optional()
    .isArray()
    .custom((channels) => {
      if (channels && !channels.every(c => ['inApp', 'email', 'browser', 'mobile'].includes(c))) {
        throw new Error('Channels must be an array of: inApp, email, browser, mobile');
      }
      return true;
    }),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly must be a boolean'),
  query('category')
    .optional()
    .isIn(['authentication', 'payment', 'resume', 'application', 'interview', 'cover_letter', 'career_coach', 'system'])
    .withMessage('Invalid category'),
  query('type')
    .optional()
    .isIn(['success', 'info', 'warning', 'error', 'deadline'])
    .withMessage('Invalid type')
];

const bulkMarkAsReadValidation = [
  body('notificationIds')
    .isArray({ min: 1 })
    .withMessage('notificationIds must be a non-empty array'),
  body('notificationIds.*')
    .isMongoId()
    .withMessage('Each notification ID must be a valid MongoDB ObjectId')
];

// Routes

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with pagination and filtering
 * @access  Private
 */
router.get(
  '/',
  paginationValidation,
  validateRequest,
  notificationController.getNotifications
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  '/unread-count',
  notificationController.getUnreadCount
);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get(
  '/stats',
  notificationController.getNotificationStats
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get user notification preferences
 * @access  Private
 */
router.get(
  '/preferences',
  notificationController.getPreferences
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update user notification preferences
 * @access  Private
 */
router.put(
  '/preferences',
  updatePreferencesValidation,
  validateRequest,
  notificationController.updatePreferences
);

/**
 * @route   PUT /api/notifications/preferences/:category
 * @desc    Update category-specific notification preferences
 * @access  Private
 */
router.put(
  '/preferences/:category',
  categoryPreferencesValidation,
  validateRequest,
  notificationController.updateCategoryPreferences
);

/**
 * @route   GET /api/notifications/category/:category
 * @desc    Get notifications by category
 * @access  Private
 */
router.get(
  '/category/:category',
  [
    param('category')
      .isIn(['authentication', 'payment', 'resume', 'application', 'interview', 'cover_letter', 'career_coach', 'system'])
      .withMessage('Invalid category'),
    ...paginationValidation.slice(0, 2) // Only page and limit validation
  ],
  validateRequest,
  notificationController.getNotificationsByCategory
);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/:notificationId/read',
  [
    param('notificationId')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],
  validateRequest,
  notificationController.markAsRead
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put(
  '/mark-all-read',
  notificationController.markAllAsRead
);

/**
 * @route   PUT /api/notifications/bulk-mark-read
 * @desc    Bulk mark notifications as read
 * @access  Private
 */
router.put(
  '/bulk-mark-read',
  bulkMarkAsReadValidation,
  validateRequest,
  notificationController.bulkMarkAsRead
);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete a notification
 * @access  Private
 */
router.delete(
  '/:notificationId',
  [
    param('notificationId')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],
  validateRequest,
  notificationController.deleteNotification
);

/**
 * @route   DELETE /api/notifications
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete(
  '/',
  notificationController.clearAllNotifications
);

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (for development)
 * @access  Private
 */
router.post(
  '/test',
  [
    body('type')
      .optional()
      .isIn(['success', 'info', 'warning', 'error', 'deadline'])
      .withMessage('Type must be one of: success, info, warning, error, deadline'),
    body('category')
      .optional()
      .isIn(['authentication', 'payment', 'resume', 'application', 'interview', 'cover_letter', 'career_coach', 'system'])
      .withMessage('Invalid category'),
    body('title')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Title must be less than 200 characters'),
    body('message')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Message must be less than 1000 characters'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priority must be one of: low, medium, high, urgent')
  ],
  validateRequest,
  notificationController.sendTestNotification
);

/**
 * @route   POST /api/notifications/debug
 * @desc    Debug notification creation (check preferences and create test notification)
 * @access  Private
 */
router.post('/debug', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('🔍 Debug notification endpoint called for user:', userId);
    
    // Import required modules
    const { NotificationPreferences } = await import('../models/NotificationPreferences');
    const { notificationService } = await import('../services/notificationService');
    
    // Check user preferences
    console.log('📋 Checking user notification preferences...');
    const preferences = await NotificationPreferences.getOrCreateForUser(userId);
    console.log('User preferences:', {
      enabled: preferences.enabled,
      channels: preferences.channels,
      authentication: preferences.categories?.authentication
    });
    
    // Test should send
    const shouldSend = await NotificationPreferences.shouldSendNotification(
      userId,
      'authentication',
      'inApp'
    );
    console.log('Should send authentication notification:', shouldSend);
    
    // Try to create notification
    console.log('🔔 Attempting to create test notification...');
    const notification = await notificationService.createTestNotification(userId);
    
    res.json({
      success: true,
      data: {
        preferences: {
          enabled: preferences.enabled,
          channels: preferences.channels,
          authentication: preferences.categories?.authentication
        },
        shouldSend,
        notification: notification ? {
          id: notification._id,
          title: notification.title,
          created: true
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ Debug notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/notifications
 * @desc    Create a custom notification
 * @access  Private
 */
router.post(
  '/',
  createNotificationValidation,
  validateRequest,
  notificationController.createNotification
);

export default router;