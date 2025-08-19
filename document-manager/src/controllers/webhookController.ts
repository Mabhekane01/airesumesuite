import { Request, Response } from 'express';
import { WebhookModel } from '../models/Webhook';
import { logger } from '../utils/logger';

export class WebhookController {
  private webhookModel: WebhookModel;

  constructor() {
    // TODO: Get pool from database config
    this.webhookModel = new WebhookModel({} as any);
  }

  /**
   * Create a new webhook
   */
  async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { name, url, events, isActive = true } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!name || !url || !events || !Array.isArray(events)) {
        res.status(400).json({
          success: false,
          message: 'Name, URL, and events array are required'
        });
        return;
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        });
        return;
      }

      // Validate events
      const validEvents = ['document.created', 'document.updated', 'document.deleted', 'document.shared', 'document.viewed'];
      const invalidEvents = events.filter(event => !validEvents.includes(event));
      
      if (invalidEvents.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}`
        });
        return;
      }

      const webhookData = {
        userId,
        name,
        url,
        events,
        isActive
      };

      const webhook = await this.webhookModel.create(webhookData);

      logger.info('Webhook created successfully', {
        userId,
        webhookId: webhook.id,
        webhookName: webhook.name,
        events: webhook.events
      });

      res.status(201).json({
        success: true,
        message: 'Webhook created successfully',
        data: {
          webhook: {
            id: webhook.id,
            name: webhook.name,
            url: webhook.url,
            events: webhook.events,
            isActive: webhook.isActive,
            secret: webhook.secret,
            createdAt: webhook.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Create webhook error', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        userId: (req as any).user?.userId 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating webhook'
      });
    }
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Webhook ID is required'
        });
        return;
      }

      const webhook = await this.webhookModel.findById(id);

      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          webhook: {
            id: webhook.id,
            name: webhook.name,
            url: webhook.url,
            events: webhook.events,
            isActive: webhook.isActive,
            secret: webhook.secret,
            createdAt: webhook.createdAt,
            updatedAt: webhook.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Get webhook error', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        userId: (req as any).user?.userId,
        webhookId: req.params['id']
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching webhook'
      });
    }
  }

  /**
   * List user's webhooks
   */
  async listWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { page = 1, limit = 20, isActive } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const filters: any = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      const webhooks = await this.webhookModel.findByUserId(userId);
      const filteredWebhooks = isActive !== undefined 
        ? webhooks.filter(webhook => webhook.isActive === filters.isActive)
        : webhooks;

      const paginatedWebhooks = filteredWebhooks.slice(
        (parseInt(page as string) - 1) * parseInt(limit as string),
        parseInt(page as string) * parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: {
          webhooks: paginatedWebhooks.map(webhook => ({
            id: webhook.id,
            name: webhook.name,
            url: webhook.url,
            events: webhook.events,
            isActive: webhook.isActive,

            createdAt: webhook.createdAt,
            updatedAt: webhook.updatedAt
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: filteredWebhooks.length,
            totalPages: Math.ceil(filteredWebhooks.length / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      logger.error('List webhooks error', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        userId: (req as any).user?.userId
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while listing webhooks'
      });
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { name, url, events, isActive, description } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Webhook ID is required'
        });
        return;
      }

      // Check if webhook exists and belongs to user
      const existingWebhook = await this.webhookModel.findById(id);
      if (!existingWebhook || existingWebhook.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
        return;
      }

      // Validate URL format if provided
      if (url) {
        try {
          new URL(url);
        } catch {
          res.status(400).json({
            success: false,
            message: 'Invalid URL format'
          });
          return;
        }
      }

      // Validate events if provided
      if (events && Array.isArray(events)) {
        const validEvents = ['document.created', 'document.updated', 'document.deleted', 'document.shared', 'document.viewed'];
        const invalidEvents = events.filter(event => !validEvents.includes(event));
        
        if (invalidEvents.length > 0) {
          res.status(400).json({
            success: false,
            message: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}`
          });
          return;
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (events !== undefined) updateData.events = events;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (description !== undefined) updateData.description = description;

      const updatedWebhook = await this.webhookModel.update(id, updateData);

      if (!updatedWebhook) {
        res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
        return;
      }

      logger.info('Webhook updated successfully', {
        userId,
        webhookId: id,
        webhookName: updatedWebhook.name
      });

      res.status(200).json({
        success: true,
        message: 'Webhook updated successfully',
        data: {
          webhook: {
            id: updatedWebhook.id,
            name: updatedWebhook.name,
            url: updatedWebhook.url,
            events: updatedWebhook.events,
            isActive: updatedWebhook.isActive,

            updatedAt: updatedWebhook.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Update webhook error', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        userId: (req as any).user?.userId,
        webhookId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating webhook'
      });
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Webhook ID is required'
        });
        return;
      }

      // Check if webhook exists and belongs to user
      const webhook = await this.webhookModel.findById(id);
      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
        return;
      }

      await this.webhookModel.delete(id);

      logger.info('Webhook deleted successfully', {
        userId,
        webhookId: id,
        webhookName: webhook.name
      });

      res.status(200).json({
        success: true,
        message: 'Webhook deleted successfully'
      });
    } catch (error) {
      logger.error('Delete webhook error', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        userId: (req as any).user?.userId,
        webhookId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting webhook'
      });
    }
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Webhook ID is required'
        });
        return;
      }

      // Check if webhook exists and belongs to user
      const webhook = await this.webhookModel.findById(id);
      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
        return;
      }

      if (!webhook.isActive) {
        res.status(400).json({
          success: false,
          message: 'Cannot test inactive webhook'
        });
        return;
      }

      // Create a test event
      const testEvent = {
        webhookId: webhook.id,
        eventType: 'webhook.test',
        payload: {
          message: 'This is a test webhook event',
          timestamp: new Date().toISOString(),
          webhookId: webhook.id,
          webhookName: webhook.name
        },
        status: 'pending'
      };

      const webhookEvent = await this.webhookModel.createEvent(testEvent);

      // TODO: Implement actual webhook delivery logic
      // For now, just mark it as delivered
      await this.webhookModel.updateEventStatus(webhookEvent.id, 'delivered');

      logger.info('Webhook test event created', {
        userId,
        webhookId: id,
        eventId: webhookEvent.id
      });

      res.status(200).json({
        success: true,
        message: 'Webhook test event created successfully',
        data: {
          eventId: webhookEvent.id,
          status: 'delivered'
        }
      });
    } catch (error) {
      logger.error('Test webhook error', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        userId: (req as any).user?.userId,
        webhookId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while testing webhook'
      });
    }
  }

  /**
   * Get webhook delivery history
   */
  async getWebhookHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Webhook ID is required'
        });
        return;
      }

      // Check if webhook exists and belongs to user
      const webhook = await this.webhookModel.findById(id);
      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
        return;
      }

      // Get webhook events
      const events = await this.webhookModel.findPendingEvents();
      const webhookEvents = events.filter(event => event.webhookId === id);

      // Filter by status if provided
      const filteredEvents = status 
        ? webhookEvents.filter(event => event.status === status)
        : webhookEvents;

      const paginatedEvents = filteredEvents.slice(
        (parseInt(page as string) - 1) * parseInt(limit as string),
        parseInt(page as string) * parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: {
          webhook: {
            id: webhook.id,
            name: webhook.name,
            url: webhook.url
          },
          events: paginatedEvents.map(event => ({
            id: event.id,
            eventType: event.eventType,
            status: event.status,
            attempts: event.attempts,
            createdAt: event.createdAt,
            deliveredAt: event.deliveredAt
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: filteredEvents.length,
            totalPages: Math.ceil(filteredEvents.length / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      logger.error('Get webhook history error', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        userId: (req as any).user?.userId,
        webhookId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching webhook history'
      });
    }
  }
}
