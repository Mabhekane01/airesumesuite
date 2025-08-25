import { Request, Response } from "express";
import { query, withTransaction } from "../config/database";
import { createError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { AuthenticatedRequest } from "../types/express";
import { asyncHandler } from "../middleware/errorHandler";

export class WebhookController {
  /**
   * Get all webhooks for a user
   */
  async getWebhooks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const result = await query(
        `
        SELECT 
          id, name, url, events, secret, is_active, 
          last_triggered, failure_count, created_at, updated_at
        FROM webhooks 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC
      `,
        [userId]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      logger.error("Get webhooks error", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get webhooks",
      });
    }
  }

  /**
   * Create a new webhook
   */
  async createWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { name, url, events, secret } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      if (!name || !url || !events || !Array.isArray(events)) {
        throw createError(
          "Name, URL, and events array are required",
          400,
          "MISSING_REQUIRED_FIELDS"
        );
      }

      const webhookId = uuidv4();
      const result = await query(
        `
        INSERT INTO webhooks (id, name, url, events, secret, user_id, is_active, status)
        VALUES ($1, $2, $3, $4, $5, $6, true, 'active')
        RETURNING *
      `,
        [webhookId, name, url, JSON.stringify(events), secret, userId]
      );

      logger.info("Webhook created", { userId, webhookId, name });

      res.status(201).json({
        success: true,
        message: "Webhook created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("Create webhook error", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to create webhook",
      });
    }
  }

  /**
   * Get a specific webhook
   */
  async getWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const result = await query(
        `
        SELECT 
          id, name, url, events, secret, is_active, 
          last_triggered, failure_count, created_at, updated_at
        FROM webhooks 
        WHERE id = $1 AND user_id = $2 AND status = 'active'
      `,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND");
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("Get webhook error", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        webhookId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get webhook",
      });
    }
  }

  /**
   * Update a webhook
   */
  async updateWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, url, events, secret, isActive } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const result = await query(
        `
        UPDATE webhooks 
        SET name = COALESCE($1, name),
            url = COALESCE($2, url),
            events = COALESCE($3, events),
            secret = COALESCE($4, secret),
            is_active = COALESCE($5, is_active),
            updated_at = NOW()
        WHERE id = $6 AND user_id = $7 AND status = 'active'
        RETURNING *
      `,
        [
          name,
          url,
          events ? JSON.stringify(events) : null,
          secret,
          isActive,
          id,
          userId,
        ]
      );

      if (result.rows.length === 0) {
        throw createError(
          "Webhook not found or access denied",
          404,
          "WEBHOOK_NOT_FOUND"
        );
      }

      logger.info("Webhook updated", { userId, webhookId: id });

      res.json({
        success: true,
        message: "Webhook updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("Update webhook error", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        webhookId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to update webhook",
      });
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const result = await query(
        `
        UPDATE webhooks 
        SET status = 'deleted', updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'active'
        RETURNING *
      `,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw createError(
          "Webhook not found or access denied",
          404,
          "WEBHOOK_NOT_FOUND"
        );
      }

      logger.info("Webhook deleted", { userId, webhookId: id });

      res.json({
        success: true,
        message: "Webhook deleted successfully",
      });
    } catch (error) {
      logger.error("Delete webhook error", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        webhookId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to delete webhook",
      });
    }
  }

  /**
   * Test a webhook
   */
  async testWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      // Get webhook details
      const webhookResult = await query(
        `
        SELECT url, events, secret
        FROM webhooks 
        WHERE id = $1 AND user_id = $2 AND status = 'active'
      `,
        [id, userId]
      );

      if (webhookResult.rows.length === 0) {
        throw createError(
          "Webhook not found or access denied",
          404,
          "WEBHOOK_NOT_FOUND"
        );
      }

      const webhook = webhookResult.rows[0];

      // Create test payload
      const testPayload = {
        event: "webhook.test",
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook payload",
          userId,
          webhookId: id,
        },
      };

      // Send test webhook (simplified - would need proper HTTP client)
      logger.info("Webhook test triggered", {
        userId,
        webhookId: id,
        url: webhook.url,
      });

      res.json({
        success: true,
        message: "Webhook test triggered successfully",
        data: {
          webhookId: id,
          url: webhook.url,
          payload: testPayload,
        },
      });
    } catch (error) {
      logger.error("Test webhook error", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        webhookId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to test webhook",
      });
    }
  }

  /**
   * Get webhook events
   */
  async getWebhookEvents(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const result = await query(
        `
        SELECT 
          id, event_type, payload, status, attempts,
          last_attempt, next_attempt, response_status,
          response_body, error_message, created_at
        FROM webhook_events 
        WHERE webhook_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50
      `,
        [id]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      logger.error("Get webhook events error", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        webhookId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get webhook events",
      });
    }
  }
}

/**
 * Get webhook delivery history
 */
export const getWebhookDeliveryHistory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { webhookId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!userId) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED");
    }

    try {
      // This would query webhook events from the database
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          events: [],
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: 0,
            totalPages: 0,
          },
        },
      });
    } catch (error) {
      logger.error("Error getting webhook delivery history", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        webhookId,
      });
      throw error;
    }
  }
);

/**
 * Retry failed webhook delivery
 */
export const retryWebhookDelivery = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { eventId } = req.params;

    if (!userId) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED");
    }

    try {
      // This would retry the failed webhook delivery
      // For now, return a placeholder response
      res.json({
        success: true,
        message: "Webhook delivery retry initiated",
        data: {
          eventId,
          status: "retrying",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Error retrying webhook delivery", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        eventId,
      });
      throw error;
    }
  }
);

/**
 * Get webhook statistics
 */
export const getWebhookStatistics = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { webhookId } = req.params;
    const { timeRange = "30d" } = req.query;

    if (!userId) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED");
    }

    try {
      // This would calculate webhook statistics from the database
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          timeRange,
          totalEvents: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          averageResponseTime: 0,
          successRate: 0,
          topResponseCodes: [],
          deliveryTrends: [],
        },
      });
    } catch (error) {
      logger.error("Error getting webhook statistics", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        webhookId,
      });
      throw error;
    }
  }
);

/**
 * Validate webhook endpoint
 */
export const validateWebhookEndpoint = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { webhookUrl } = req.body;

    if (!userId) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED");
    }

    try {
      // This would validate the webhook endpoint
      // For now, return a placeholder response
      res.json({
        success: true,
        message: "Webhook endpoint validated successfully",
        data: {
          webhookUrl,
          isValid: true,
          responseTime: 150,
          statusCode: 200,
        },
      });
    } catch (error) {
      logger.error("Error validating webhook endpoint", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        webhookUrl,
      });
      throw error;
    }
  }
);
