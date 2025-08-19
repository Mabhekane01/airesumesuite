import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export interface Webhook {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryCount: number;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: 'success' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookData {
  userId: string;
  organizationId?: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  isActive?: boolean;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed';
  retryCount: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookEventData {
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
}

export class WebhookModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new webhook
   */
  async create(webhookData: CreateWebhookData): Promise<Webhook> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const secret = webhookData.secret || this.generateSecret();
      const now = new Date();
      
      const query = `
        INSERT INTO webhooks (
          id, user_id, organization_id, name, url, events, secret, is_active,
          retry_count, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        id,
        webhookData.userId,
        webhookData.organizationId || null,
        webhookData.name,
        webhookData.url,
        JSON.stringify(webhookData.events),
        secret,
        webhookData.isActive !== false,
        0,
        now,
        now
      ];

      const result = await client.query(query, values);
      const webhook = this.mapRowToWebhook(result.rows[0]);
      
      logger.info('Webhook created successfully', { 
        webhookId: webhook.id, 
        userId: webhook.userId,
        name: webhook.name
      });
      return webhook;
    } catch (error) {
      logger.error('Failed to create webhook:', error);
      throw new Error('Failed to create webhook');
    } finally {
      client.release();
    }
  }

  /**
   * Find webhook by ID
   */
  async findById(id: string): Promise<Webhook | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM webhooks WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToWebhook(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find webhook by ID:', error);
      throw new Error('Failed to find webhook');
    } finally {
      client.release();
    }
  }

  /**
   * Find webhooks by user ID
   */
  async findByUserId(userId: string): Promise<Webhook[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM webhooks 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.map(row => this.mapRowToWebhook(row));
    } catch (error) {
      logger.error('Failed to find webhooks by user ID:', error);
      throw new Error('Failed to find webhooks');
    } finally {
      client.release();
    }
  }

  /**
   * Find webhooks by organization ID
   */
  async findByOrganizationId(organizationId: string): Promise<Webhook[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM webhooks 
        WHERE organization_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [organizationId]);
      return result.rows.map(row => this.mapRowToWebhook(row));
    } catch (error) {
      logger.error('Failed to find webhooks by organization ID:', error);
      throw new Error('Failed to find webhooks');
    } finally {
      client.release();
    }
  }

  /**
   * Find active webhooks for a specific event type
   */
  async findActiveByEventType(eventType: string): Promise<Webhook[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM webhooks 
        WHERE is_active = true AND events @> $1
        ORDER BY created_at ASC
      `;
      
      const result = await client.query(query, [JSON.stringify([eventType])]);
      return result.rows.map(row => this.mapRowToWebhook(row));
    } catch (error) {
      logger.error('Failed to find active webhooks by event type:', error);
      throw new Error('Failed to find webhooks');
    } finally {
      client.release();
    }
  }

  /**
   * Update webhook
   */
  async update(id: string, updateData: UpdateWebhookData): Promise<Webhook | null> {
    const client = await this.pool.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      
      if (updateData.url !== undefined) {
        fields.push(`url = $${paramCount++}`);
        values.push(updateData.url);
      }
      
      if (updateData.events !== undefined) {
        fields.push(`events = $${paramCount++}`);
        values.push(JSON.stringify(updateData.events));
      }
      
      if (updateData.secret !== undefined) {
        fields.push(`secret = $${paramCount++}`);
        values.push(updateData.secret);
      }
      
      if (updateData.isActive !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(updateData.isActive);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push(`updated_at = $${paramCount++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE webhooks 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const webhook = this.mapRowToWebhook(result.rows[0]);
      logger.info('Webhook updated successfully', { webhookId: webhook.id });
      return webhook;
    } catch (error) {
      logger.error('Failed to update webhook:', error);
      throw new Error('Failed to update webhook');
    } finally {
      client.release();
    }
  }

  /**
   * Delete webhook
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM webhooks WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        return false;
      }
      
      logger.info('Webhook deleted successfully', { webhookId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete webhook:', error);
      throw new Error('Failed to delete webhook');
    } finally {
      client.release();
    }
  }

  /**
   * Update webhook delivery status
   */
  async updateDeliveryStatus(
    id: string, 
    status: 'success' | 'failed', 
    retryCount: number = 0
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE webhooks 
        SET last_delivery_at = NOW(), 
            last_delivery_status = $1, 
            retry_count = $2,
            updated_at = NOW()
        WHERE id = $3
      `;
      
      await client.query(query, [status, retryCount, id]);
    } catch (error) {
      logger.error('Failed to update webhook delivery status:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Create webhook event
   */
  async createEvent(eventData: CreateWebhookEventData): Promise<WebhookEvent> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO webhook_events (
          id, webhook_id, event_type, payload, status, retry_count, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        id,
        eventData.webhookId,
        eventData.eventType,
        JSON.stringify(eventData.payload),
        'pending',
        0,
        now,
        now
      ];

      const result = await client.query(query, values);
      const event = this.mapRowToWebhookEvent(result.rows[0]);
      
      logger.info('Webhook event created successfully', { 
        eventId: event.id, 
        webhookId: event.webhookId,
        eventType: event.eventType
      });
      return event;
    } catch (error) {
      logger.error('Failed to create webhook event:', error);
      throw new Error('Failed to create webhook event');
    } finally {
      client.release();
    }
  }

  /**
   * Find pending webhook events
   */
  async findPendingEvents(limit: number = 100): Promise<WebhookEvent[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM webhook_events 
        WHERE status = 'pending' 
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at ASC
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows.map(row => this.mapRowToWebhookEvent(row));
    } catch (error) {
      logger.error('Failed to find pending webhook events:', error);
      throw new Error('Failed to find pending events');
    } finally {
      client.release();
    }
  }

  /**
   * Update webhook event status
   */
  async updateEventStatus(
    eventId: string, 
    status: 'pending' | 'delivered' | 'failed',
    responseStatus?: number,
    responseBody?: string,
    errorMessage?: string,
    retryCount: number = 0
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const nextRetryAt = status === 'failed' && retryCount < 3 
        ? new Date(Date.now() + Math.pow(2, retryCount) * 60000) // Exponential backoff
        : null;

      const query = `
        UPDATE webhook_events 
        SET status = $1, 
            retry_count = $2,
            last_attempt_at = NOW(),
            next_retry_at = $3,
            response_status = $4,
            response_body = $5,
            error_message = $6,
            updated_at = NOW()
        WHERE id = $7
      `;
      
      await client.query(query, [
        status, 
        retryCount, 
        nextRetryAt, 
        responseStatus, 
        responseBody, 
        errorMessage, 
        eventId
      ]);
    } catch (error) {
      logger.error('Failed to update webhook event status:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Map database row to Webhook object
   */
  private mapRowToWebhook(row: any): Webhook {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      name: row.name,
      url: row.url,
      events: row.events || [],
      secret: row.secret,
      isActive: row.is_active,
      retryCount: row.retry_count,
      lastDeliveryAt: row.last_delivery_at,
      lastDeliveryStatus: row.last_delivery_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to WebhookEvent object
   */
  private mapRowToWebhookEvent(row: any): WebhookEvent {
    return {
      id: row.id,
      webhookId: row.webhook_id,
      eventType: row.event_type,
      payload: row.payload || {},
      status: row.status,
      retryCount: row.retry_count,
      lastAttemptAt: row.last_attempt_at,
      nextRetryAt: row.next_retry_at,
      responseStatus: row.response_status,
      responseBody: row.response_body,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}



