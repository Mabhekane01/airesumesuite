import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { webhookDeliveryService } from './webhookDeliveryService';

export interface WebhookEventData {
  eventType: string;
  payload: any;
  userId?: string;
  organizationId?: string;
}

export class WebhookEventService {
  /**
   * Create a webhook event for a document action
   */
  async createWebhookEvent(
    webhookId: string,
    eventData: WebhookEventData
  ): Promise<string> {
    try {
      const result = await query(`
        INSERT INTO webhook_events (
          webhook_id, event_type, payload, status, attempts, max_attempts
        ) VALUES ($1, $2, $3, 'pending', 0, 3)
        RETURNING id
      `, [
        webhookId,
        eventData.eventType,
        JSON.stringify(eventData.payload)
      ]);

      const eventId = result.rows[0].id;
      
      logger.info('Webhook event created', {
        eventId,
        webhookId,
        eventType: eventData.eventType
      });

      return eventId;
    } catch (error) {
      logger.error('Failed to create webhook event', {
        webhookId,
        eventType: eventData.eventType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create webhook events for all webhooks that listen to a specific event type
   */
  async createWebhookEventsForAction(
    eventType: string,
    payload: any,
    userId?: string,
    organizationId?: string
  ): Promise<string[]> {
    try {
      // Find all active webhooks that listen to this event type
      const webhooks = await query(`
        SELECT id, url, secret, events
        FROM webhooks
        WHERE is_active = true 
          AND $1 = ANY(events)
          AND (
            (user_id = $2 AND organization_id IS NULL)
            OR (organization_id = $3)
            OR (user_id IS NULL AND organization_id IS NULL)
          )
      `, [eventType, userId, organizationId]);

      if (webhooks.rows.length === 0) {
        logger.debug('No webhooks found for event type', { eventType, userId, organizationId });
        return [];
      }

      const eventIds: string[] = [];

      for (const webhook of webhooks.rows) {
        try {
          const eventId = await this.createWebhookEvent(webhook.id, {
            eventType,
            payload,
            userId,
            organizationId
          });
          eventIds.push(eventId);
        } catch (error) {
          logger.error('Failed to create webhook event for webhook', {
            webhookId: webhook.id,
            eventType,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info(`Created ${eventIds.length} webhook events for ${eventType}`, {
        eventType,
        userId,
        organizationId,
        eventIds
      });

      return eventIds;
    } catch (error) {
      logger.error('Failed to create webhook events for action', {
        eventType,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get pending webhook events for a specific webhook
   */
  async getPendingEvents(webhookId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await query(`
        SELECT id, event_type, payload, attempts, created_at
        FROM webhook_events
        WHERE webhook_id = $1 
          AND status = 'pending'
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT $2
      `, [webhookId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        payload: JSON.parse(row.payload),
        attempts: row.attempts,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Failed to get pending webhook events', {
        webhookId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update webhook event status
   */
  async updateEventStatus(
    eventId: string,
    status: 'pending' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await query(`
        UPDATE webhook_events
        SET 
          status = $1,
          attempts = attempts + 1,
          last_attempt_at = NOW(),
          last_error = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [status, errorMessage || null, eventId]);

      logger.debug('Webhook event status updated', {
        eventId,
        status,
        errorMessage
      });
    } catch (error) {
      logger.error('Failed to update webhook event status', {
        eventId,
        status,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get webhook event statistics
   */
  async getEventStats(webhookId: string): Promise<{
    totalEvents: number;
    pendingEvents: number;
    deliveredEvents: number;
    failedEvents: number;
    averageAttempts: number;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_events,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_events,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_events,
          AVG(attempts) as avg_attempts
        FROM webhook_events
        WHERE webhook_id = $1
      `, [webhookId]);

      const stats = result.rows[0];
      return {
        totalEvents: parseInt(stats.total_events) || 0,
        pendingEvents: parseInt(stats.pending_events) || 0,
        deliveredEvents: parseInt(stats.delivered_events) || 0,
        failedEvents: parseInt(stats.failed_events) || 0,
        averageAttempts: parseFloat(stats.avg_attempts) || 0
      };
    } catch (error) {
      logger.error('Failed to get webhook event stats', {
        webhookId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        totalEvents: 0,
        pendingEvents: 0,
        deliveredEvents: 0,
        failedEvents: 0,
        averageAttempts: 0
      };
    }
  }

  /**
   * Clean up old webhook events
   */
  async cleanupOldEvents(retentionDays: number = 90): Promise<void> {
    try {
      const result = await query(`
        DELETE FROM webhook_events
        WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
          AND status IN ('delivered', 'failed')
      `);

      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} old webhook events`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old webhook events', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Retry failed webhook events
   */
  async retryFailedEvents(webhookId: string, maxRetries: number = 3): Promise<number> {
    try {
      const result = await query(`
        UPDATE webhook_events
        SET 
          status = 'pending',
          attempts = 0,
          last_error = NULL,
          updated_at = NOW()
        WHERE webhook_id = $1 
          AND status = 'failed'
          AND attempts >= $2
      `, [webhookId, maxRetries]);

      const retriedCount = result.rowCount || 0;
      
      if (retriedCount > 0) {
        logger.info(`Retried ${retriedCount} failed webhook events`, { webhookId });
      }

      return retriedCount;
    } catch (error) {
      logger.error('Failed to retry failed webhook events', {
        webhookId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process webhook events for a specific webhook
   */
  async processWebhookEvents(webhookId: string): Promise<void> {
    try {
      const pendingEvents = await this.getPendingEvents(webhookId, 5);
      
      if (pendingEvents.length === 0) {
        return;
      }

      logger.info(`Processing ${pendingEvents.length} pending webhook events`, { webhookId });

      for (const event of pendingEvents) {
        try {
          // Get webhook details
          const webhookResult = await query(`
            SELECT url, secret FROM webhooks WHERE id = $1
          `, [webhookId]);

          if (webhookResult.rows.length === 0) {
            await this.updateEventStatus(event.id, 'failed', 'Webhook not found');
            continue;
          }

          const webhook = webhookResult.rows[0];

          // Attempt delivery
          const deliveryResult = await webhookDeliveryService.deliverWebhook(
            webhookId,
            event.eventType,
            event.payload,
            webhook.url,
            webhook.secret
          );

          // Update event status based on delivery result
          if (deliveryResult.success) {
            await this.updateEventStatus(event.id, 'delivered');
          } else {
            await this.updateEventStatus(event.id, 'failed', deliveryResult.errorMessage);
          }
        } catch (error) {
          logger.error('Failed to process webhook event', {
            eventId: event.id,
            webhookId,
            error: error instanceof Error ? error.message : String(error)
          });

          await this.updateEventStatus(
            event.id, 
            'failed', 
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    } catch (error) {
      logger.error('Failed to process webhook events', {
        webhookId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Export singleton instance
export const webhookEventService = new WebhookEventService();


