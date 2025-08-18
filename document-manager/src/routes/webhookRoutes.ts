import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireApiPermission } from '@/middleware/apiKey';
import { asyncHandler, validationErrorHandler } from '@/middleware/errorHandler';
import { query as dbQuery } from '@/config/database';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    throw validationErrorHandler(errors.array());
  }
  next();
};

// Webhook service for sending events
class WebhookService {
  static async sendEvent(event: string, data: any, userId: string): Promise<void> => {
    try {
      // Get active webhooks for this user and event
      const webhooksResult = await dbQuery(`
        SELECT id, url, secret, events
        FROM webhooks
        WHERE user_id = $1 AND is_active = true AND $2 = ANY(events)
      `, [userId, event]);
      
      const webhooks = webhooksResult.rows;
      
      // Send to each webhook
      for (const webhook of webhooks) {
        await this.sendWebhook(webhook, event, data);
      }
    } catch (error) {
      logger.error('Webhook sending failed:', error);
    }
  }
  
  static async sendWebhook(webhook: any, event: string, data: any): Promise<void> {
    try {
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id
      };
      
      const payloadString = JSON.stringify(payload);
      
      // Generate signature
      const signature = webhook.secret ? 
        crypto.createHmac('sha256', webhook.secret).update(payloadString).digest('hex') : 
        null;
      
      // Send HTTP request
      const fetch = require('node-fetch');
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DocumentManager-Webhook/1.0',
          ...(signature && { 'X-Signature-SHA256': `sha256=${signature}` })
        },
        body: payloadString,
        timeout: 10000
      });
      
      logger.info('Webhook sent', {
        webhookId: webhook.id,
        event,
        status: response.status,
        url: webhook.url
      });
      
      // Log webhook delivery
      await dbQuery(`
        INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status_code, delivered_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        uuidv4(),
        webhook.id,
        event,
        payloadString,
        response.status
      ]);
      
    } catch (error) {
      logger.error('Webhook delivery failed:', {
        webhookId: webhook.id,
        event,
        error: error.message
      });
      
      // Log failed delivery
      await dbQuery(`
        INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status_code, error_message, delivered_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        uuidv4(),
        webhook.id,
        event,
        JSON.stringify(data),
        0,
        error.message
      ]);
    }
  }
}

// Create webhook
const createWebhook = asyncHandler(async (req: any, res: any) => {
  const { name, url, events, secret } = req.body;
  const userId = req.apiUser.userId;
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    return res.status(400).json({
      success: false,
      message: 'Invalid URL',
      code: 'INVALID_URL'
    });
  }
  
  // Create webhook
  const webhookId = uuidv4();
  const webhookResult = await dbQuery(`
    INSERT INTO webhooks (id, user_id, name, url, secret, events)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [webhookId, userId, name, url, secret || null, events]);
  
  res.status(201).json({
    success: true,
    message: 'Webhook created successfully',
    data: webhookResult.rows[0]
  });
});

// Get webhooks
const getWebhooks = asyncHandler(async (req: any, res: any) => {
  const userId = req.apiUser.userId;
  
  const webhooksResult = await dbQuery(`
    SELECT 
      id, name, url, events, is_active, created_at, updated_at,
      CASE WHEN secret IS NOT NULL THEN true ELSE false END as has_secret
    FROM webhooks
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);
  
  res.json({
    success: true,
    data: webhooksResult.rows
  });
});

// Update webhook
const updateWebhook = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { name, url, events, secret, isActive } = req.body;
  const userId = req.apiUser.userId;
  
  // Validate URL if provided
  if (url) {
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL',
        code: 'INVALID_URL'
      });
    }
  }
  
  const updateResult = await dbQuery(`
    UPDATE webhooks
    SET 
      name = COALESCE($1, name),
      url = COALESCE($2, url),
      events = COALESCE($3, events),
      secret = COALESCE($4, secret),
      is_active = COALESCE($5, is_active),
      updated_at = NOW()
    WHERE id = $6 AND user_id = $7
    RETURNING *
  `, [name, url, events, secret, isActive, id, userId]);
  
  if (updateResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found',
      code: 'WEBHOOK_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    message: 'Webhook updated successfully',
    data: updateResult.rows[0]
  });
});

// Delete webhook
const deleteWebhook = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.apiUser.userId;
  
  const deleteResult = await dbQuery(`
    DELETE FROM webhooks
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `, [id, userId]);
  
  if (deleteResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found',
      code: 'WEBHOOK_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    message: 'Webhook deleted successfully'
  });
});

// Test webhook
const testWebhook = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.apiUser.userId;
  
  // Get webhook
  const webhookResult = await dbQuery(`
    SELECT * FROM webhooks
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  
  if (webhookResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found',
      code: 'WEBHOOK_NOT_FOUND'
    });
  }
  
  const webhook = webhookResult.rows[0];
  
  // Send test event
  const testData = {
    test: true,
    message: 'This is a test webhook delivery',
    timestamp: new Date().toISOString()
  };
  
  await WebhookService.sendWebhook(webhook, 'webhook.test', testData);
  
  res.json({
    success: true,
    message: 'Test webhook sent'
  });
});

// Get webhook deliveries
const getWebhookDeliveries = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const userId = req.apiUser.userId;
  
  // Verify webhook ownership
  const webhookResult = await dbQuery(`
    SELECT id FROM webhooks WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  
  if (webhookResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found',
      code: 'WEBHOOK_NOT_FOUND'
    });
  }
  
  // Get deliveries
  const deliveriesResult = await dbQuery(`
    SELECT 
      id, event, status_code, error_message, delivered_at,
      CASE WHEN LENGTH(payload) > 1000 THEN CONCAT(SUBSTRING(payload, 1, 1000), '...') ELSE payload END as payload_preview
    FROM webhook_deliveries
    WHERE webhook_id = $1
    ORDER BY delivered_at DESC
    LIMIT $2 OFFSET $3
  `, [id, Number(limit), offset]);
  
  res.json({
    success: true,
    data: deliveriesResult.rows
  });
});

// Routes
router.post('/',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('url').isURL().withMessage('Valid URL is required'),
    body('events').isArray({ min: 1 }).withMessage('At least one event is required'),
    body('secret').optional().isLength({ min: 10 }).withMessage('Secret must be at least 10 characters'),
  ],
  validateRequest,
  requireApiPermission(['webhooks:write']),
  createWebhook
);

router.get('/',
  requireApiPermission(['webhooks:read']),
  getWebhooks
);

router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('url').optional().isURL().withMessage('Valid URL is required'),
    body('events').optional().isArray({ min: 1 }).withMessage('At least one event is required'),
    body('secret').optional().isLength({ min: 10 }).withMessage('Secret must be at least 10 characters'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  ],
  validateRequest,
  requireApiPermission(['webhooks:write']),
  updateWebhook
);

router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
  ],
  validateRequest,
  requireApiPermission(['webhooks:write']),
  deleteWebhook
);

router.post('/:id/test',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
  ],
  validateRequest,
  requireApiPermission(['webhooks:write']),
  testWebhook
);

router.get('/:id/deliveries',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  ],
  validateRequest,
  requireApiPermission(['webhooks:read']),
  getWebhookDeliveries
);

// Export webhook service for use in other modules
export { WebhookService };
export default router;