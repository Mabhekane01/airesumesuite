import { Request, Response } from 'express';
import { DocumentSharingIntegration } from '../services/documentSharingIntegration';
import { logger } from '../utils/logger';

export class AnalyticsController {
  private documentSharingIntegration: DocumentSharingIntegration;

  constructor() {
    this.documentSharingIntegration = new DocumentSharingIntegration();
  }

  /**
   * Get document analytics by ID
   */
  async getDocumentAnalytics(req: Request, res: Response): Promise<void> {
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
          message: 'Document ID is required'
        });
        return;
      }

      // Get document analytics from the document sharing service
      const analytics = await this.documentSharingIntegration.getBasicDocumentAnalytics(id);

      if (!analytics) {
        res.status(404).json({
          success: false,
          message: 'Analytics not found for this document'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      logger.error('Get document analytics error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        documentId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching document analytics'
      });
    }
  }

  /**
   * Get analytics summary for user
   */
  async getAnalyticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { dateFrom, dateTo, groupBy = 'day' } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Validate date parameters
      const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
      const toDate = dateTo ? new Date(dateTo as string) : new Date();

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
        return;
      }

      // Get analytics summary from the document sharing service
      const summary = await this.documentSharingIntegration.getAnalyticsStatus();

      if (!summary) {
        res.status(404).json({
          success: false,
          message: 'Analytics summary not available'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { 
          summary,
          dateRange: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
          },
          groupBy
        }
      });
    } catch (error) {
      logger.error('Get analytics summary error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching analytics summary'
      });
    }
  }

  /**
   * Get popular documents
   */
  async getPopularDocuments(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { limit = 10, period = '30d' } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get popular documents from the document sharing service
      const popularDocs = await this.documentSharingIntegration.getBasicDocumentAnalytics('popular');

      if (!popularDocs) {
        res.status(404).json({
          success: false,
          message: 'Popular documents data not available'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { 
          popularDocuments: popularDocs,
          period,
          limit: parseInt(limit as string)
        }
      });
    } catch (error) {
      logger.error('Get popular documents error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching popular documents'
      });
    }
  }

  /**
   * Get document performance metrics
   */
  async getDocumentPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { metric = 'views', period = '30d' } = req.query;

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
          message: 'Document ID is required'
        });
        return;
      }

      // Get document performance metrics from the document sharing service
      const performance = await this.documentSharingIntegration.getBasicDocumentAnalytics(id);

      if (!performance) {
        res.status(404).json({
          success: false,
          message: 'Performance data not available for this document'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { 
          performance,
          metric,
          period
        }
      });
    } catch (error) {
      logger.error('Get document performance error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        documentId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching document performance'
      });
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { format = 'json', dateFrom, dateTo } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Validate export format
      const validFormats = ['json', 'csv', 'xlsx'];
      if (!validFormats.includes(format as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid export format. Supported formats: json, csv, xlsx'
        });
        return;
      }

      // Validate date parameters
      const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateTo ? new Date(dateTo as string) : new Date();

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
        return;
      }

      // Get analytics data for export
      const analyticsData = await this.documentSharingIntegration.getAnalyticsStatus();

      if (!analyticsData) {
        res.status(404).json({
          success: false,
          message: 'Analytics data not available for export'
        });
        return;
      }

      // Set response headers for file download
      const filename = `analytics_${fromDate.toISOString().split('T')[0]}_to_${toDate.toISOString().split('T')[0]}.${format}`;
      
      res.setHeader('Content-Type', this.getContentType(format as string));
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Export data based on format
      if (format === 'json') {
        res.json({
          success: true,
          data: {
            analytics: analyticsData,
            exportInfo: {
              format: 'json',
              dateRange: {
                from: fromDate.toISOString(),
                to: toDate.toISOString()
              },
              exportedAt: new Date().toISOString()
            }
          }
        });
      } else {
        // For CSV and XLSX, we would need to implement proper export logic
        // For now, return JSON with a note
        res.json({
          success: true,
          message: `${format.toUpperCase()} export not yet implemented. Returning JSON format.`,
          data: {
            analytics: analyticsData,
            exportInfo: {
              format: 'json',
              dateRange: {
                from: fromDate.toISOString(),
                to: toDate.toISOString()
              },
              exportedAt: new Date().toISOString()
            }
          }
        });
      }

      logger.info('Analytics exported successfully', {
        userId,
        format,
        dateFrom: fromDate.toISOString(),
        dateTo: toDate.toISOString()
      });
    } catch (error) {
      logger.error('Export analytics error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while exporting analytics'
      });
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get real-time analytics from the document sharing service
      const realTimeData = await this.documentSharingIntegration.getAnalyticsStatus();

      if (!realTimeData) {
        res.status(404).json({
          success: false,
          message: 'Real-time analytics not available'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { 
          realTime: realTimeData,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get real-time analytics error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching real-time analytics'
      });
    }
  }

  /**
   * Get content type for export format
   */
  private getContentType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/json';
    }
  }
}
