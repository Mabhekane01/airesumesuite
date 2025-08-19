import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export interface Analytics {
  id: string;
  documentId: string;
  shareId?: string;
  userId?: string;
  organizationId?: string;
  eventType: 'view' | 'download' | 'print' | 'share' | 'edit';
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  sessionDuration?: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface CreateAnalyticsData {
  documentId: string;
  shareId?: string;
  userId?: string;
  organizationId?: string;
  eventType: 'view' | 'download' | 'print' | 'share' | 'edit';
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  sessionDuration?: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsFilters {
  documentId?: string;
  shareId?: string;
  userId?: string;
  organizationId?: string;
  eventType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  country?: string;
  deviceType?: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  totalDownloads: number;
  totalPrints: number;
  totalShares: number;
  uniqueVisitors: number;
  averageSessionDuration: number;
  topCountries: Array<{ country: string; count: number }>;
  topDevices: Array<{ deviceType: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  dailyStats: Array<{ date: string; views: number; downloads: number; prints: number }>;
}

export class AnalyticsModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new analytics record
   */
  async create(analyticsData: CreateAnalyticsData): Promise<Analytics> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO analytics (
          id, document_id, share_id, user_id, organization_id, event_type,
          ip_address, user_agent, country, city, device_type, browser, os,
          referrer, session_duration, metadata, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;
      
      const values = [
        id,
        analyticsData.documentId,
        analyticsData.shareId || null,
        analyticsData.userId || null,
        analyticsData.organizationId || null,
        analyticsData.eventType,
        analyticsData.ipAddress || null,
        analyticsData.userAgent || null,
        analyticsData.country || null,
        analyticsData.city || null,
        analyticsData.deviceType || null,
        analyticsData.browser || null,
        analyticsData.os || null,
        analyticsData.referrer || null,
        analyticsData.sessionDuration || null,
        JSON.stringify(analyticsData.metadata || {}),
        now
      ];

      const result = await client.query(query, values);
      const analytics = this.mapRowToAnalytics(result.rows[0]);
      
      logger.info('Analytics record created successfully', { 
        analyticsId: analytics.id, 
        documentId: analytics.documentId,
        eventType: analytics.eventType
      });
      return analytics;
    } catch (error) {
      logger.error('Failed to create analytics record:', error);
      throw new Error('Failed to create analytics record');
    } finally {
      client.release();
    }
  }

  /**
   * Find analytics by ID
   */
  async findById(id: string): Promise<Analytics | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM analytics WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToAnalytics(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find analytics by ID:', error);
      throw new Error('Failed to find analytics');
    } finally {
      client.release();
    }
  }

  /**
   * Find analytics by document ID
   */
  async findByDocumentId(documentId: string, page: number = 1, limit: number = 50): Promise<{ analytics: Analytics[], total: number }> {
    const client = await this.pool.connect();
    
    try {
      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM analytics WHERE document_id = $1';
      const countResult = await client.query(countQuery, [documentId]);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (page - 1) * limit;
      const listQuery = `
        SELECT * FROM analytics 
        WHERE document_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(listQuery, [documentId, limit, offset]);
      const analytics = result.rows.map(row => this.mapRowToAnalytics(row));
      
      return { analytics, total };
    } catch (error) {
      logger.error('Failed to find analytics by document ID:', error);
      throw new Error('Failed to find analytics');
    } finally {
      client.release();
    }
  }

  /**
   * Find analytics by share ID
   */
  async findByShareId(shareId: string, page: number = 1, limit: number = 50): Promise<{ analytics: Analytics[], total: number }> {
    const client = await this.pool.connect();
    
    try {
      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM analytics WHERE share_id = $1';
      const countResult = await client.query(countQuery, [shareId]);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (page - 1) * limit;
      const listQuery = `
        SELECT * FROM analytics 
        WHERE share_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(listQuery, [shareId, limit, offset]);
      const analytics = result.rows.map(row => this.mapRowToAnalytics(row));
      
      return { analytics, total };
    } catch (error) {
      logger.error('Failed to find analytics by share ID:', error);
      throw new Error('Failed to find analytics');
    } finally {
      client.release();
    }
  }

  /**
   * Search analytics with filters
   */
  async search(
    filters: AnalyticsFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<{ analytics: Analytics[], total: number }> {
    const client = await this.pool.connect();
    
    try {
      let whereClause = '';
      const values: any[] = [];
      let paramCount = 1;

      if (filters.documentId) {
        whereClause += `WHERE document_id = $${paramCount++}`;
        values.push(filters.documentId);
      }

      if (filters.shareId) {
        const shareClause = `share_id = $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${shareClause}` : `WHERE ${shareClause}`;
        values.push(filters.shareId);
      }

      if (filters.userId) {
        const userClause = `user_id = $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${userClause}` : `WHERE ${userClause}`;
        values.push(filters.userId);
      }

      if (filters.organizationId) {
        const orgClause = `organization_id = $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${orgClause}` : `WHERE ${orgClause}`;
        values.push(filters.organizationId);
      }

      if (filters.eventType) {
        const eventClause = `event_type = $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${eventClause}` : `WHERE ${eventClause}`;
        values.push(filters.eventType);
      }

      if (filters.dateFrom) {
        const dateFromClause = `created_at >= $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${dateFromClause}` : `WHERE ${dateFromClause}`;
        values.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        const dateToClause = `created_at <= $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${dateToClause}` : `WHERE ${dateToClause}`;
        values.push(filters.dateTo);
      }

      if (filters.country) {
        const countryClause = `country = $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${countryClause}` : `WHERE ${countryClause}`;
        values.push(filters.country);
      }

      if (filters.deviceType) {
        const deviceClause = `device_type = $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${deviceClause}` : `WHERE ${deviceClause}`;
        values.push(filters.deviceType);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM analytics ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (page - 1) * limit;
      const listQuery = `
        SELECT * FROM analytics 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;
      
      values.push(limit, offset);
      const result = await client.query(listQuery, values);
      
      const analytics = result.rows.map(row => this.mapRowToAnalytics(row));
      
      return { analytics, total };
    } catch (error) {
      logger.error('Failed to search analytics:', error);
      throw new Error('Failed to search analytics');
    } finally {
      client.release();
    }
  }

  /**
   * Get analytics summary for a document
   */
  async getDocumentSummary(documentId: string, days: number = 30): Promise<AnalyticsSummary> {
    const client = await this.pool.connect();
    
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // Get basic counts
      const countsQuery = `
        SELECT 
          event_type,
          COUNT(*) as count
        FROM analytics 
        WHERE document_id = $1 AND created_at >= $2
        GROUP BY event_type
      `;
      
      const countsResult = await client.query(countsQuery, [documentId, dateFrom]);
      
      const summary: AnalyticsSummary = {
        totalViews: 0,
        totalDownloads: 0,
        totalPrints: 0,
        totalShares: 0,
        uniqueVisitors: 0,
        averageSessionDuration: 0,
        topCountries: [],
        topDevices: [],
        topBrowsers: [],
        dailyStats: []
      };

      // Process counts
      countsResult.rows.forEach(row => {
        switch (row.event_type) {
          case 'view':
            summary.totalViews = parseInt(row.count);
            break;
          case 'download':
            summary.totalDownloads = parseInt(row.count);
            break;
          case 'print':
            summary.totalPrints = parseInt(row.count);
            break;
          case 'share':
            summary.totalShares = parseInt(row.count);
            break;
        }
      });

      // Get unique visitors
      const uniqueVisitorsQuery = `
        SELECT COUNT(DISTINCT ip_address) as count
        FROM analytics 
        WHERE document_id = $1 AND created_at >= $2 AND event_type = 'view'
      `;
      
      const uniqueVisitorsResult = await client.query(uniqueVisitorsQuery, [documentId, dateFrom]);
      summary.uniqueVisitors = parseInt(uniqueVisitorsResult.rows[0].count);

      // Get average session duration
      const sessionDurationQuery = `
        SELECT AVG(session_duration) as avg_duration
        FROM analytics 
        WHERE document_id = $1 AND created_at >= $2 AND session_duration IS NOT NULL
      `;
      
      const sessionDurationResult = await client.query(sessionDurationQuery, [documentId, dateFrom]);
      summary.averageSessionDuration = parseFloat(sessionDurationResult.rows[0].avg_duration) || 0;

      // Get top countries
      const countriesQuery = `
        SELECT country, COUNT(*) as count
        FROM analytics 
        WHERE document_id = $1 AND created_at >= $2 AND country IS NOT NULL
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      `;
      
      const countriesResult = await client.query(countriesQuery, [documentId, dateFrom]);
      summary.topCountries = countriesResult.rows.map(row => ({
        country: row.country,
        count: parseInt(row.count)
      }));

      // Get top devices
      const devicesQuery = `
        SELECT device_type, COUNT(*) as count
        FROM analytics 
        WHERE document_id = $1 AND created_at >= $2 AND device_type IS NOT NULL
        GROUP BY device_type
        ORDER BY count DESC
        LIMIT 10
      `;
      
      const devicesResult = await client.query(devicesQuery, [documentId, dateFrom]);
      summary.topDevices = devicesResult.rows.map(row => ({
        deviceType: row.device_type,
        count: parseInt(row.count)
      }));

      // Get top browsers
      const browsersQuery = `
        SELECT browser, COUNT(*) as count
        FROM analytics 
        WHERE document_id = $1 AND created_at >= $2 AND browser IS NOT NULL
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 10
      `;
      
      const browsersResult = await client.query(browsersQuery, [documentId, dateFrom]);
      summary.topBrowsers = browsersResult.rows.map(row => ({
        browser: row.browser,
        count: parseInt(row.count)
      }));

      // Get daily stats
      const dailyStatsQuery = `
        SELECT 
          DATE(created_at) as date,
          SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
          SUM(CASE WHEN event_type = 'download' THEN 1 ELSE 0 END) as downloads,
          SUM(CASE WHEN event_type = 'print' THEN 1 ELSE 0 END) as prints
        FROM analytics 
        WHERE document_id = $1 AND created_at >= $2
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;
      
      const dailyStatsResult = await client.query(dailyStatsQuery, [documentId, dateFrom]);
      summary.dailyStats = dailyStatsResult.rows.map(row => ({
        date: row.date,
        views: parseInt(row.views),
        downloads: parseInt(row.downloads),
        prints: parseInt(row.prints)
      }));

      return summary;
    } catch (error) {
      logger.error('Failed to get document analytics summary:', error);
      throw new Error('Failed to get analytics summary');
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Analytics object
   */
  private mapRowToAnalytics(row: any): Analytics {
    return {
      id: row.id,
      documentId: row.document_id,
      shareId: row.share_id,
      userId: row.user_id,
      organizationId: row.organization_id,
      eventType: row.event_type,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      country: row.country,
      city: row.city,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      referrer: row.referrer,
      sessionDuration: row.session_duration,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }
}



