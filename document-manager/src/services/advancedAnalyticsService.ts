import { query } from '../config/database';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  documentIds?: string[];
  linkIds?: string[];
  countries?: string[];
  devices?: string[];
  browsers?: string[];
}

export interface DocumentAnalytics {
  documentId: string;
  totalViews: number;
  uniqueViewers: number;
  totalDownloads: number;
  averageViewTime: number;
  conversionRate: number;
  engagementScore: number;
  topPages: PageAnalytics[];
  viewerDemographics: ViewerDemographics;
  trafficSources: TrafficSource[];
  timeSeriesData: TimeSeriesPoint[];
}

export interface PageAnalytics {
  pageNumber: number;
  views: number;
  averageTime: number;
  scrollDepth: number;
  interactions: number;
  bounceRate: number;
}

export interface ViewerDemographics {
  countries: { [key: string]: number };
  devices: { [key: string]: number };
  browsers: { [key: string]: number };
  operatingSystems: { [key: string]: number };
  screenResolutions: { [key: string]: number };
}

export interface TrafficSource {
  source: string;
  views: number;
  conversionRate: number;
  averageSessionDuration: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  views: number;
  uniqueViewers: number;
  downloads: number;
}

export interface HeatmapData {
  pageNumber: number;
  clicks: Array<{ x: number; y: number; intensity: number }>;
  scrolls: Array<{ y: number; intensity: number }>;
  hovers: Array<{ x: number; y: number; intensity: number }>;
}

export class AdvancedAnalyticsService {
  /**
   * Get comprehensive document analytics
   */
  async getDocumentAnalytics(
    documentId: string,
    filters: AnalyticsFilters = {}
  ): Promise<DocumentAnalytics> {
    try {
      // Get basic metrics
      const basicMetrics = await this.getBasicMetrics(documentId, filters);
      
      // Get page-level analytics
      const pageAnalytics = await this.getPageAnalytics(documentId, filters);
      
      // Get viewer demographics
      const demographics = await this.getViewerDemographics(documentId, filters);
      
      // Get traffic sources
      const trafficSources = await this.getTrafficSources(documentId, filters);
      
      // Get time series data
      const timeSeriesData = await this.getTimeSeriesData(documentId, filters);
      
      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore(basicMetrics, pageAnalytics);
      
      return {
        documentId,
        ...basicMetrics,
        engagementScore,
        topPages: pageAnalytics,
        viewerDemographics: demographics,
        trafficSources,
        timeSeriesData,
      };
    } catch (error) {
      logger.error('Error getting document analytics', { error: error.message, documentId });
      throw error;
    }
  }

  /**
   * Get basic metrics for a document
   */
  private async getBasicMetrics(
    documentId: string,
    filters: AnalyticsFilters
  ): Promise<{
    totalViews: number;
    uniqueViewers: number;
    totalDownloads: number;
    averageViewTime: number;
    conversionRate: number;
  }> {
    const whereClause = this.buildWhereClause(filters);
    const params = [documentId, ...this.getFilterParams(filters)];

    const result = await query(`
      SELECT 
        COUNT(DISTINCT dv.id) as total_views,
        COUNT(DISTINCT dv.visitor_id) as unique_viewers,
        COUNT(DISTINCT dd.id) as total_downloads,
        AVG(EXTRACT(EPOCH FROM (dv.created_at + INTERVAL '1 hour') - dv.created_at)) as avg_view_time,
        CASE 
          WHEN COUNT(DISTINCT dv.id) > 0 
          THEN (COUNT(DISTINCT dd.id)::DECIMAL / COUNT(DISTINCT dv.id)::DECIMAL) * 100
          ELSE 0 
        END as conversion_rate
      FROM documents d
      LEFT JOIN document_views dv ON d.id = dv.document_id ${whereClause}
      LEFT JOIN document_downloads dd ON d.id = dd.document_id ${whereClause.replace('dv.', 'dd.')}
      WHERE d.id = $1
    `, params);

    const row = result.rows[0];
    return {
      totalViews: parseInt(row.total_views) || 0,
      uniqueViewers: parseInt(row.unique_viewers) || 0,
      totalDownloads: parseInt(row.total_downloads) || 0,
      averageViewTime: parseFloat(row.avg_view_time) || 0,
      conversionRate: parseFloat(row.conversion_rate) || 0,
    };
  }

  /**
   * Get page-level analytics
   */
  private async getPageAnalytics(
    documentId: string,
    filters: AnalyticsFilters
  ): Promise<PageAnalytics[]> {
    const whereClause = this.buildWhereClause(filters);
    const params = [documentId, ...this.getFilterParams(filters)];

    const result = await query(`
      SELECT 
        pv.page_number,
        COUNT(DISTINCT pv.document_view_id) as views,
        AVG(pv.duration_seconds) as avg_time,
        AVG(pv.scroll_percentage) as scroll_depth,
        COUNT(pv.interactions) as interactions,
        CASE 
          WHEN COUNT(DISTINCT pv.document_view_id) > 0 
          THEN (COUNT(DISTINCT CASE WHEN pv.duration_seconds < 10 THEN pv.document_view_id END)::DECIMAL / 
                COUNT(DISTINCT pv.document_view_id)::DECIMAL) * 100
          ELSE 0 
        END as bounce_rate
      FROM page_views pv
      JOIN document_views dv ON pv.document_view_id = dv.id
      WHERE dv.document_id = $1 ${whereClause}
      GROUP BY pv.page_number
      ORDER BY views DESC
      LIMIT 10
    `, params);

    return result.rows.map(row => ({
      pageNumber: parseInt(row.page_number),
      views: parseInt(row.views),
      averageTime: parseFloat(row.avg_time) || 0,
      scrollDepth: parseFloat(row.scroll_depth) || 0,
      interactions: parseInt(row.interactions) || 0,
      bounceRate: parseFloat(row.bounce_rate) || 0,
    }));
  }

  /**
   * Get viewer demographics
   */
  private async getViewerDemographics(
    documentId: string,
    filters: AnalyticsFilters
  ): Promise<ViewerDemographics> {
    const whereClause = this.buildWhereClause(filters);
    const params = [documentId, ...this.getFilterParams(filters)];

    // Get country distribution
    const countriesResult = await query(`
      SELECT 
        dv.country,
        COUNT(DISTINCT dv.visitor_id) as count
      FROM document_views dv
      WHERE dv.document_id = $1 ${whereClause}
        AND dv.country IS NOT NULL
      GROUP BY dv.country
      ORDER BY count DESC
      LIMIT 20
    `, params);

    // Get device distribution
    const devicesResult = await query(`
      SELECT 
        dv.device_type,
        COUNT(DISTINCT dv.visitor_id) as count
      FROM document_views dv
      WHERE dv.document_id = $1 ${whereClause}
        AND dv.device_type IS NOT NULL
      GROUP BY dv.device_type
      ORDER BY count DESC
    `, params);

    // Get browser distribution
    const browsersResult = await query(`
      SELECT 
        dv.browser,
        COUNT(DISTINCT dv.visitor_id) as count
      FROM document_views dv
      WHERE dv.document_id = $1 ${whereClause}
        AND dv.browser IS NOT NULL
      GROUP BY dv.browser
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // Get OS distribution
    const osResult = await query(`
      SELECT 
        dv.os,
        COUNT(DISTINCT dv.visitor_id) as count
      FROM document_views dv
      WHERE dv.document_id = $1 ${whereClause}
        AND dv.os IS NOT NULL
      GROUP BY dv.os
      ORDER BY count DESC
      LIMIT 10
    `, params);

    return {
      countries: this.convertToObject(countriesResult.rows, 'country', 'count'),
      devices: this.convertToObject(devicesResult.rows, 'device_type', 'count'),
      browsers: this.convertToObject(browsersResult.rows, 'browser', 'count'),
      operatingSystems: this.convertToObject(osResult.rows, 'os', 'count'),
      screenResolutions: {}, // Would need additional tracking
    };
  }

  /**
   * Get traffic sources
   */
  private async getTrafficSources(
    documentId: string,
    filters: AnalyticsFilters
  ): Promise<TrafficSource[]> {
    const whereClause = this.buildWhereClause(filters);
    const params = [documentId, ...this.getFilterParams(filters)];

    const result = await query(`
      SELECT 
        COALESCE(dv.utm_source, 'direct') as source,
        COUNT(DISTINCT dv.visitor_id) as views,
        CASE 
          WHEN COUNT(DISTINCT dv.visitor_id) > 0 
          THEN (COUNT(DISTINCT dd.visitor_id)::DECIMAL / COUNT(DISTINCT dv.visitor_id)::DECIMAL) * 100
          ELSE 0 
        END as conversion_rate,
        AVG(EXTRACT(EPOCH FROM (dv.created_at + INTERVAL '1 hour') - dv.created_at)) as avg_session_duration
      FROM document_views dv
      LEFT JOIN document_downloads dd ON dv.document_id = dd.document_id 
        AND dv.visitor_id = dd.visitor_id
      WHERE dv.document_id = $1 ${whereClause}
      GROUP BY COALESCE(dv.utm_source, 'direct')
      ORDER BY views DESC
    `, params);

    return result.rows.map(row => ({
      source: row.source,
      views: parseInt(row.views),
      conversionRate: parseFloat(row.conversion_rate) || 0,
      averageSessionDuration: parseFloat(row.avg_session_duration) || 0,
    }));
  }

  /**
   * Get time series data
   */
  private async getTimeSeriesData(
    documentId: string,
    filters: AnalyticsFilters
  ): Promise<TimeSeriesPoint[]> {
    const whereClause = this.buildWhereClause(filters);
    const params = [documentId, ...this.getFilterParams(filters)];

    const result = await query(`
      SELECT 
        DATE_TRUNC('hour', dv.created_at) as timestamp,
        COUNT(DISTINCT dv.id) as views,
        COUNT(DISTINCT dv.visitor_id) as unique_viewers,
        COUNT(DISTINCT dd.id) as downloads
      FROM document_views dv
      LEFT JOIN document_downloads dd ON dv.document_id = dd.document_id 
        AND dv.visitor_id = dd.visitor_id
      WHERE dv.document_id = $1 ${whereClause}
      GROUP BY DATE_TRUNC('hour', dv.created_at)
      ORDER BY timestamp DESC
      LIMIT 168 -- Last 7 days (24 * 7)
    `, params);

    return result.rows.map(row => ({
      timestamp: row.timestamp.toISOString(),
      views: parseInt(row.views),
      uniqueViewers: parseInt(row.unique_viewers),
      downloads: parseInt(row.downloads),
    }));
  }

  /**
   * Get heatmap data for a specific page
   */
  async getHeatmapData(
    documentId: string,
    pageNumber: number,
    filters: AnalyticsFilters = {}
  ): Promise<HeatmapData> {
    try {
      const whereClause = this.buildWhereClause(filters);
      const params = [documentId, pageNumber, ...this.getFilterParams(filters)];

      const result = await query(`
        SELECT 
          pv.interactions
        FROM page_views pv
        JOIN document_views dv ON pv.document_view_id = dv.id
        WHERE dv.document_id = $1 
          AND pv.page_number = $2 ${whereClause}
          AND pv.interactions IS NOT NULL
      `, params);

      const heatmapData: HeatmapData = {
        pageNumber,
        clicks: [],
        scrolls: [],
        hovers: [],
      };

      // Process interactions to build heatmap
      result.rows.forEach(row => {
        if (row.interactions) {
          const interactions = JSON.parse(row.interactions);
          // Process clicks, scrolls, hovers from interactions
          // This would depend on how interactions are stored
        }
      });

      return heatmapData;
    } catch (error) {
      logger.error('Error getting heatmap data', { error: error.message, documentId, pageNumber });
      throw error;
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(documentId: string): Promise<{
    currentViewers: number;
    recentViews: number;
    recentDownloads: number;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '5 minutes' THEN dv.visitor_id END) as current_viewers,
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '1 hour' THEN dv.id END) as recent_views,
          COUNT(DISTINCT CASE WHEN dd.downloaded_at > NOW() - INTERVAL '1 hour' THEN dd.id END) as recent_downloads
        FROM documents d
        LEFT JOIN document_views dv ON d.id = dv.document_id
        LEFT JOIN document_downloads dd ON d.id = dd.document_id
        WHERE d.id = $1
      `, [documentId]);

      const row = result.rows[0];
      return {
        currentViewers: parseInt(row.current_viewers) || 0,
        recentViews: parseInt(row.recent_views) || 0,
        recentDownloads: parseInt(row.recent_downloads) || 0,
      };
    } catch (error) {
      logger.error('Error getting real-time analytics', { error: error.message, documentId });
      throw error;
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(documentId: string): Promise<{
    predictedViews: number;
    predictedDownloads: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
  }> {
    try {
      // Get historical data for the last 30 days
      const result = await query(`
        SELECT 
          DATE_TRUNC('day', dv.created_at) as date,
          COUNT(DISTINCT dv.visitor_id) as views,
          COUNT(DISTINCT dd.visitor_id) as downloads
        FROM document_views dv
        LEFT JOIN document_downloads dd ON dv.document_id = dd.document_id 
          AND dv.visitor_id = dd.visitor_id
        WHERE dv.document_id = $1 
          AND dv.created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', dv.created_at)
        ORDER BY date
      `, [documentId]);

      // Simple linear regression for prediction
      const data = result.rows.map(row => ({
        date: new Date(row.date),
        views: parseInt(row.views),
        downloads: parseInt(row.downloads),
      }));

      if (data.length < 7) {
        return {
          predictedViews: 0,
          predictedDownloads: 0,
          trend: 'stable',
          confidence: 0,
        };
      }

      // Calculate trend
      const recentViews = data.slice(-7).reduce((sum, d) => sum + d.views, 0);
      const previousViews = data.slice(-14, -7).reduce((sum, d) => sum + d.views, 0);
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentViews > previousViews * 1.1) trend = 'increasing';
      else if (recentViews < previousViews * 0.9) trend = 'decreasing';

      // Simple prediction based on recent average
      const avgViews = recentViews / 7;
      const avgDownloads = data.slice(-7).reduce((sum, d) => sum + d.downloads, 0) / 7;

      return {
        predictedViews: Math.round(avgViews * 1.1), // 10% growth assumption
        predictedDownloads: Math.round(avgDownloads * 1.1),
        trend,
        confidence: Math.min(85, data.length * 3), // Simple confidence calculation
      };
    } catch (error) {
      logger.error('Error getting predictive analytics', { error: error.message, documentId });
      throw error;
    }
  }

  /**
   * Build WHERE clause for filters
   */
  private buildWhereClause(filters: AnalyticsFilters): string {
    const conditions: string[] = [];
    let paramIndex = 2; // Start after documentId

    if (filters.startDate) {
      conditions.push(`dv.created_at >= $${paramIndex++}`);
    }
    if (filters.endDate) {
      conditions.push(`dv.created_at <= $${paramIndex++}`);
    }
    if (filters.countries && filters.countries.length > 0) {
      conditions.push(`dv.country = ANY($${paramIndex++})`);
    }
    if (filters.devices && filters.devices.length > 0) {
      conditions.push(`dv.device_type = ANY($${paramIndex++})`);
    }
    if (filters.browsers && filters.browsers.length > 0) {
      conditions.push(`dv.browser = ANY($${paramIndex++})`);
    }

    return conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  }

  /**
   * Get filter parameters for query
   */
  private getFilterParams(filters: AnalyticsFilters): any[] {
    const params: any[] = [];

    if (filters.startDate) params.push(filters.startDate);
    if (filters.endDate) params.push(filters.endDate);
    if (filters.countries && filters.countries.length > 0) params.push(filters.countries);
    if (filters.devices && filters.devices.length > 0) params.push(filters.devices);
    if (filters.browsers && filters.browsers.length > 0) params.push(filters.browsers);

    return params;
  }

  /**
   * Convert array of objects to key-value object
   */
  private convertToObject(rows: any[], keyField: string, valueField: string): { [key: string]: number } {
    const result: { [key: string]: number } = {};
    rows.forEach(row => {
      result[row[keyField]] = parseInt(row[valueField]) || 0;
    });
    return result;
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(
    metrics: any,
    pageAnalytics: PageAnalytics[]
  ): number {
    const viewScore = Math.min(metrics.totalViews / 100, 1) * 25;
    const timeScore = Math.min(metrics.averageViewTime / 300, 1) * 25; // 5 minutes max
    const scrollScore = Math.min(
      pageAnalytics.reduce((sum, page) => sum + page.scrollDepth, 0) / pageAnalytics.length / 100,
      1
    ) * 25;
    const interactionScore = Math.min(
      pageAnalytics.reduce((sum, page) => sum + page.interactions, 0) / 50,
      1
    ) * 25;

    return Math.round(viewScore + timeScore + scrollScore + interactionScore);
  }
}


