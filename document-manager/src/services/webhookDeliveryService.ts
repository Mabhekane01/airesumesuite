import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  webhook_id: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  responseTime?: number;
  retryCount?: number;
}

export class WebhookDeliveryService {
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s

  /**
   * Deliver a webhook to the specified URL
   */
  async deliverWebhook(
    webhookId: string,
    event: string,
    payload: any,
    webhookUrl: string,
    secret?: string
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const webhookPayload: WebhookPayload = {
          event,
          timestamp: new Date().toISOString(),
          data: payload,
          webhook_id: webhookId
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'DocumentManager-Webhook/1.0',
          'X-Webhook-Event': event,
          'X-Webhook-ID': webhookId
        };

        // Add signature if secret is provided
        if (secret) {
          const signature = this.generateSignature(webhookPayload, secret);
          headers['X-Webhook-Signature'] = signature;
        }

        const response: AxiosResponse = await axios.post(webhookUrl, webhookPayload, {
          headers,
          timeout: 10000, // 10 second timeout
          validateStatus: () => true // Don't throw on non-2xx status codes
        });

        const responseTime = Date.now() - startTime;

        // Log the delivery attempt
        await this.logWebhookDelivery(webhookId, event, {
          statusCode: response.status,
          responseTime,
          attempt: attempt + 1,
          success: response.status >= 200 && response.status < 300
        });

        if (response.status >= 200 && response.status < 300) {
          logger.info('Webhook delivered successfully', {
            webhookId,
            event,
            statusCode: response.status,
            responseTime,
            attempt: attempt + 1
          });

          return {
            success: true,
            statusCode: response.status,
            responseTime
          };
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          logger.warn('Webhook delivery failed with non-2xx status', {
            webhookId,
            event,
            statusCode: response.status,
            statusText: response.statusText,
            attempt: attempt + 1
          });
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        logger.error('Webhook delivery error', {
          webhookId,
          event,
          error: lastError,
          attempt: attempt + 1
        });
      }

      // If this wasn't the last attempt, wait before retrying
      if (attempt < this.maxRetries) {
        const delay = this.retryDelays[attempt];
        logger.debug(`Waiting ${delay}ms before retry ${attempt + 2}`, {
          webhookId,
          event
        });
        await this.sleep(delay);
      }
    }

    // All retries failed
    const totalTime = Date.now() - startTime;
    logger.error('Webhook delivery failed after all retries', {
      webhookId,
      event,
      totalAttempts: this.maxRetries + 1,
      totalTime,
      lastError
    });

    return {
      success: false,
      errorMessage: lastError,
      responseTime: totalTime,
      retryCount: this.maxRetries + 1
    };
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Log webhook delivery attempt to database
   */
  private async logWebhookDelivery(
    webhookId: string,
    event: string,
    result: {
      statusCode?: number;
      responseTime: number;
      attempt: number;
      success: boolean;
    }
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO webhook_deliveries (
          webhook_id, event, payload, status_code, error_message, delivered_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        webhookId,
        event,
        JSON.stringify({ attempt: result.attempt, responseTime: result.responseTime }),
        result.statusCode,
        result.success ? null : 'Delivery failed'
      ]);
    } catch (error) {
      logger.error('Failed to log webhook delivery', {
        webhookId,
        event,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Process pending webhook events
   */
  async processPendingWebhooks(): Promise<void> {
    try {
      // Get webhooks that need to be delivered
      const webhooks = await query(`
        SELECT w.id, w.url, w.secret, w.events, w.is_active
        FROM webhooks w
        WHERE w.is_active = true
      `);

      if (webhooks.rows.length === 0) {
        return;
      }

      logger.info(`Processing ${webhooks.rows.length} active webhooks`);

      for (const webhook of webhooks.rows) {
        if (!webhook.is_active) continue;

        // Check if there are any pending events for this webhook
        const pendingEvents = await query(`
          SELECT id, event_type, payload
          FROM webhook_events
          WHERE webhook_id = $1 
            AND status = 'pending'
            AND attempts < 3
          ORDER BY created_at ASC
          LIMIT 10
        `, [webhook.id]);

        for (const event of pendingEvents.rows) {
          try {
            const result = await this.deliverWebhook(
              webhook.id,
              event.event_type,
              event.payload,
              webhook.url,
              webhook.secret
            );

            // Update event status
            await query(`
              UPDATE webhook_events 
              SET 
                status = $1,
                attempts = attempts + 1,
                last_attempt_at = NOW(),
                last_error = $2
              WHERE id = $3
            `, [
              result.success ? 'delivered' : 'failed',
              result.errorMessage || null,
              event.id
            ]);

            if (result.success) {
              logger.info('Webhook event processed successfully', {
                eventId: event.id,
                webhookId: webhook.id,
                eventType: event.event_type
              });
            }
          } catch (error) {
            logger.error('Failed to process webhook event', {
              eventId: event.id,
              webhookId: webhook.id,
              error: error instanceof Error ? error.message : String(error)
            });

            // Mark event as failed
            await query(`
              UPDATE webhook_events 
              SET 
                status = 'failed',
                attempts = attempts + 1,
                last_attempt_at = NOW(),
                last_error = $1
              WHERE id = $2
            `, [
              error instanceof Error ? error.message : String(error),
              event.id
            ]);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to process pending webhooks', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clean up old webhook delivery records
   */
  async cleanupOldDeliveries(): Promise<void> {
    try {
      const retentionDays = config.WEBHOOK_RETENTION_DAYS || 90;
      
      const result = await query(`
        DELETE FROM webhook_deliveries 
        WHERE delivered_at < NOW() - INTERVAL '${retentionDays} days'
      `);

      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} old webhook delivery records`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old webhook deliveries', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Utility function to sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get webhook delivery statistics
   */
  async getDeliveryStats(webhookId: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageResponseTime: number;
    lastDeliveryAt?: string;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_deliveries,
          COUNT(CASE WHEN status_code < 200 OR status_code >= 300 THEN 1 END) as failed_deliveries,
          AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) * 1000) as avg_response_time,
          MAX(delivered_at) as last_delivery_at
        FROM webhook_deliveries 
        WHERE webhook_id = $1
      `, [webhookId]);

      const stats = result.rows[0];
      return {
        totalDeliveries: parseInt(stats.total_deliveries) || 0,
        successfulDeliveries: parseInt(stats.successful_deliveries) || 0,
        failedDeliveries: parseInt(stats.failed_deliveries) || 0,
        averageResponseTime: parseFloat(stats.avg_response_time) || 0,
        lastDeliveryAt: stats.last_delivery_at
      };
    } catch (error) {
      logger.error('Failed to get webhook delivery stats', {
        webhookId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        averageResponseTime: 0
      };
    }
  }
}

// Export singleton instance
export const webhookDeliveryService = new WebhookDeliveryService();


