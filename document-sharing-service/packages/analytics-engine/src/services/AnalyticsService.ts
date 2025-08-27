import { query } from "@document-sharing/core/database/connection";
import { logger } from "@document-sharing/core/utils/logger";
import { v4 as uuidv4 } from "uuid";
import geoip from "geoip-lite";
import UAParser from "ua-parser-js";

export interface DocumentView {
  id: string;
  documentId: string;
  linkId?: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  city?: string;
  timeOnPage: number;
  pagesViewed: number[];
  interactions: string[];
  deviceType: string;
  browser: string;
  os: string;
  screenResolution?: string;
  viewportSize?: string;
  timestamp: Date;
}

export interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  averageTimeOnPage: number;
  bounceRate: number;
  topCountries: Array<{ country: string; views: number }>;
  topDevices: Array<{ device: string; views: number }>;
  topBrowsers: Array<{ browser: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  viewsByHour: Array<{ hour: number; views: number }>;
  viewsByDay: Array<{ day: string; views: number }>;
  engagementScore: number;
  conversionRate: number;
}

export interface PageAnalytics {
  pageNumber: number;
  views: number;
  averageTime: number;
  interactions: string[];
  scrollDepth: number;
  exitRate: number;
}

export class AnalyticsService {
  /**
   * Record a document view
   */
  async recordView(viewData: Omit<DocumentView, "id" | "timestamp">): Promise<void> {
    try {
      const id = uuidv4();
      const timestamp = new Date();

      // Enrich view data with geolocation and device info
      const enrichedData = await this.enrichViewData(viewData);

      await query(
        `
        INSERT INTO document_views (
          id, document_id, link_id, ip_address, user_agent, referrer,
          country, city, time_on_page, pages_viewed, interactions,
          device_type, browser, os, screen_resolution, viewport_size,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `,
        [
          id,
          enrichedData.documentId,
          enrichedData.linkId || null,
          enrichedData.ipAddress,
          enrichedData.userAgent,
          enrichedData.referrer || null,
          enrichedData.country || null,
          enrichedData.city || null,
          enrichedData.timeOnPage,
          enrichedData.pagesViewed,
          enrichedData.interactions,
          enrichedData.deviceType,
          enrichedData.browser,
          enrichedData.os,
          enrichedData.screenResolution || null,
          enrichedData.viewportSize || null,
          timestamp,
        ]
      );

      // Update document link view count if applicable
      if (enrichedData.linkId) {
        await this.incrementLinkViews(enrichedData.linkId);
      }

      logger.info("Document view recorded", {
        documentId: enrichedData.documentId,
        linkId: enrichedData.linkId,
        country: enrichedData.country,
        deviceType: enrichedData.deviceType,
      });
    } catch (error) {
      logger.error("Failed to record document view:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics for a document
   */
  async getDocumentAnalytics(
    documentId: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
    }
  ): Promise<AnalyticsData> {
    try {
      const [
        totalViews,
        uniqueVisitors,
        averageTimeOnPage,
        bounceRate,
        topCountries,
        topDevices,
        topBrowsers,
        topReferrers,
        viewsByHour,
        viewsByDay,
        engagementScore,
        conversionRate,
      ] = await Promise.all([
        this.getTotalViews(documentId, timeRange),
        this.getUniqueVisitors(documentId, timeRange),
        this.getAverageTimeOnPage(documentId, timeRange),
        this.getBounceRate(documentId, timeRange),
        this.getTopCountries(documentId, timeRange),
        this.getTopDevices(documentId, timeRange),
        this.getTopBrowsers(documentId, timeRange),
        this.getTopReferrers(documentId, timeRange),
        this.getViewsByHour(documentId, timeRange),
        this.getViewsByDay(documentId, timeRange),
        this.calculateEngagementScore(documentId, timeRange),
        this.getConversionRate(documentId, timeRange),
      ]);

      return {
        totalViews,
        uniqueVisitors,
        averageTimeOnPage,
        bounceRate,
        topCountries,
        topDevices,
        topBrowsers,
        topReferrers,
        viewsByHour,
        viewsByDay,
        engagementScore,
        conversionRate,
      };
    } catch (error) {
      logger.error("Failed to get document analytics:", error);
      throw error;
    }
  }

  /**
   * Get page-level analytics
   */
  async getPageAnalytics(
    documentId: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }
  ): Promise<PageAnalytics[]> {
    try {
      const result = await query(
        `
        SELECT 
          unnest(pages_viewed) as page_number,
          COUNT(*) as views,
          AVG(time_on_page) as average_time,
          array_agg(DISTINCT unnest(interactions)) as interactions,
          AVG(CASE WHEN array_length(pages_viewed, 1) = 1 THEN 1 ELSE 0 END) as exit_rate
        FROM document_views 
        WHERE document_id = $1 
          AND created_at BETWEEN $2 AND $3
        GROUP BY unnest(pages_viewed)
        ORDER BY page_number
      `,
        [documentId, timeRange.start, timeRange.end]
      );

      return result.rows.map((row) => ({
        pageNumber: row.page_number,
        views: parseInt(row.views),
        averageTime: parseFloat(row.average_time) || 0,
        interactions: row.interactions || [],
        scrollDepth: this.calculateScrollDepth(row.interactions || []),
        exitRate: parseFloat(row.exit_rate) || 0,
      }));
    } catch (error) {
      logger.error("Failed to get page analytics:", error);
      throw error;
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(documentId: string): Promise<{
    currentViewers: number;
    recentViews: DocumentView[];
    liveEngagement: number;
  }> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const [currentViewers, recentViews] = await Promise.all([
        this.getCurrentViewers(documentId, fiveMinutesAgo),
        this.getRecentViews(documentId, fiveMinutesAgo),
      ]);

      const liveEngagement = this.calculateLiveEngagement(recentViews);

      return {
        currentViewers,
        recentViews,
        liveEngagement,
      };
    } catch (error) {
      logger.error("Failed to get real-time analytics:", error);
      throw error;
    }
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    documentId: string,
    format: "pdf" | "csv" | "json" = "json"
  ): Promise<any> {
    try {
      const analytics = await this.getDocumentAnalytics(documentId);
      const pageAnalytics = await this.getPageAnalytics(documentId);
      const realTime = await this.getRealTimeAnalytics(documentId);

      const report = {
        documentId,
        generatedAt: new Date(),
        summary: analytics,
        pageDetails: pageAnalytics,
        realTime: realTime,
        insights: this.generateInsights(analytics, pageAnalytics),
      };

      switch (format) {
        case "json":
          return report;
        case "csv":
          return this.convertToCSV(report);
        case "pdf":
          return this.convertToPDF(report);
        default:
          return report;
      }
    } catch (error) {
      logger.error("Failed to generate analytics report:", error);
      throw error;
    }
  }

  /**
   * Enrich view data with additional information
   */
  private async enrichViewData(viewData: Omit<DocumentView, "id" | "timestamp">): Promise<DocumentView> {
    // Parse user agent
    const ua = new UAParser(viewData.userAgent);
    const browser = ua.getBrowser();
    const os = ua.getOS();
    const device = ua.getDevice();

    // Get geolocation from IP
    const geo = geoip.lookup(viewData.ipAddress);
    const country = geo?.country;
    const city = geo?.city;

    // Determine device type
    let deviceType = "desktop";
    if (device.type === "mobile") deviceType = "mobile";
    else if (device.type === "tablet") deviceType = "tablet";

    return {
      ...viewData,
      country,
      city,
      browser: browser.name || "unknown",
      os: os.name || "unknown",
      deviceType,
    };
  }

  /**
   * Increment link view count
   */
  private async incrementLinkViews(linkId: string): Promise<void> {
    try {
      await query(
        "UPDATE document_links SET current_views = current_views + 1 WHERE id = $1",
        [linkId]
      );
    } catch (error) {
      logger.warn("Failed to increment link views:", error);
    }
  }

  /**
   * Get total views for a document
   */
  private async getTotalViews(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    const result = await query(
      "SELECT COUNT(*) FROM document_views WHERE document_id = $1 AND created_at BETWEEN $2 AND $3",
      [documentId, timeRange.start, timeRange.end]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get unique visitors for a document
   */
  private async getUniqueVisitors(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    const result = await query(
      "SELECT COUNT(DISTINCT ip_address) FROM document_views WHERE document_id = $1 AND created_at BETWEEN $2 AND $3",
      [documentId, timeRange.start, timeRange.end]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get average time on page
   */
  private async getAverageTimeOnPage(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    const result = await query(
      "SELECT AVG(time_on_page) FROM document_views WHERE document_id = $1 AND created_at BETWEEN $2 AND $3",
      [documentId, timeRange.start, timeRange.end]
    );
    return parseFloat(result.rows[0].avg) || 0;
  }

  /**
   * Get bounce rate
   */
  private async getBounceRate(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    const result = await query(
      `
      SELECT 
        COUNT(CASE WHEN array_length(pages_viewed, 1) = 1 THEN 1 END) * 100.0 / COUNT(*) as bounce_rate
      FROM document_views 
      WHERE document_id = $1 AND created_at BETWEEN $2 AND $3
      `,
      [documentId, timeRange.start, timeRange.end]
    );
    return parseFloat(result.rows[0].bounce_rate) || 0;
  }

  /**
   * Get top countries
   */
  private async getTopCountries(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ country: string; views: number }>> {
    const result = await query(
      `
      SELECT country, COUNT(*) as views
      FROM document_views 
      WHERE document_id = $1 AND created_at BETWEEN $2 AND $3 AND country IS NOT NULL
      GROUP BY country 
      ORDER BY views DESC 
      LIMIT 10
      `,
      [documentId, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
      country: row.country,
      views: parseInt(row.views),
    }));
  }

  /**
   * Get top devices
   */
  private async getTopDevices(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ device: string; views: number }>> {
    const result = await query(
      `
      SELECT device_type, COUNT(*) as views
      FROM document_views 
      WHERE document_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY device_type 
      ORDER BY views DESC
      `,
      [documentId, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
      device: row.device_type,
      views: parseInt(row.views),
    }));
  }

  /**
   * Get top browsers
   */
  private async getTopBrowsers(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ browser: string; views: number }>> {
    const result = await query(
      `
      SELECT browser, COUNT(*) as views
      FROM document_views 
      WHERE document_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY browser 
      ORDER BY views DESC 
      LIMIT 10
      `,
      [documentId, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
      browser: row.browser,
      views: parseInt(row.views),
    }));
  }

  /**
   * Get top referrers
   */
  private async getTopReferrers(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ referrer: string; views: number }>> {
    const result = await query(
      `
      SELECT referrer, COUNT(*) as views
      FROM document_views 
      WHERE document_id = $1 AND created_at BETWEEN $2 AND $3 AND referrer IS NOT NULL
      GROUP BY referrer 
      ORDER BY views DESC 
      LIMIT 10
      `,
      [documentId, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
      referrer: row.referrer,
      views: parseInt(row.views),
    }));
  }

  /**
   * Get views by hour
   */
  private async getViewsByHour(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ hour: number; views: number }>> {
    const result = await query(
      `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as views
      FROM document_views 
      WHERE document_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
      `,
      [documentId, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
      hour: parseInt(row.hour),
      views: parseInt(row.views),
    }));
  }

  /**
   * Get views by day
   */
  private async getViewsByDay(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ day: string; views: number }>> {
    const result = await query(
      `
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as views
      FROM document_views 
      WHERE document_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY DATE(created_at)
      ORDER BY day
      `,
      [documentId, timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
      day: row.day,
      views: parseInt(row.views),
    }));
  }

  /**
   * Calculate engagement score
   */
  private async calculateEngagementScore(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    const result = await query(
      `
      SELECT 
        AVG(time_on_page) as avg_time,
        AVG(array_length(pages_viewed, 1)) as avg_pages,
        AVG(array_length(interactions, 1)) as avg_interactions
      FROM document_views 
      WHERE document_id = $1 AND created_at BETWEEN $2 AND $3
      `,
      [documentId, timeRange.start, timeRange.end]
    );

    const row = result.rows[0];
    const timeScore = Math.min(parseFloat(row.avg_time) / 60, 1); // Normalize to 0-1
    const pageScore = Math.min(parseFloat(row.avg_pages) / 10, 1); // Normalize to 0-1
    const interactionScore = Math.min(parseFloat(row.avg_interactions) / 5, 1); // Normalize to 0-1

    return Math.round((timeScore + pageScore + interactionScore) / 3 * 100);
  }

  /**
   * Get conversion rate
   */
  private async getConversionRate(
    documentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    // This would integrate with your conversion tracking system
    // For now, return a placeholder
    return 0;
  }

  /**
   * Get current viewers
   */
  private async getCurrentViewers(
    documentId: string,
    since: Date
  ): Promise<number> {
    const result = await query(
      "SELECT COUNT(DISTINCT ip_address) FROM document_views WHERE document_id = $1 AND created_at >= $2",
      [documentId, since]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get recent views
   */
  private async getRecentViews(
    documentId: string,
    since: Date
  ): Promise<DocumentView[]> {
    const result = await query(
      `
      SELECT * FROM document_views 
      WHERE document_id = $1 AND created_at >= $2
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [documentId, since]
    );

    return result.rows.map((row) => this.mapRowToDocumentView(row));
  }

  /**
   * Calculate live engagement
   */
  private calculateLiveEngagement(views: DocumentView[]): number {
    if (views.length === 0) return 0;

    const totalTime = views.reduce((sum, view) => sum + view.timeOnPage, 0);
    const totalPages = views.reduce((sum, view) => sum + view.pagesViewed.length, 0);
    const totalInteractions = views.reduce((sum, view) => sum + view.interactions.length, 0);

    return Math.round((totalTime + totalPages * 10 + totalInteractions * 5) / views.length);
  }

  /**
   * Calculate scroll depth from interactions
   */
  private calculateScrollDepth(interactions: string[]): number {
    const scrollEvents = interactions.filter((interaction) =>
      interaction.startsWith("scroll_")
    );
    
    if (scrollEvents.length === 0) return 0;

    const depths = scrollEvents.map((event) => {
      const depth = event.split("_")[1];
      return parseInt(depth) || 0;
    });

    return Math.max(...depths);
  }

  /**
   * Generate insights from analytics data
   */
  private generateInsights(analytics: AnalyticsData, pageAnalytics: PageAnalytics[]): string[] {
    const insights: string[] = [];

    if (analytics.bounceRate > 70) {
      insights.push("High bounce rate detected. Consider improving document introduction or navigation.");
    }

    if (analytics.averageTimeOnPage < 30) {
      insights.push("Low engagement time. Content may need to be more compelling or better structured.");
    }

    const topPage = pageAnalytics.reduce((max, page) =>
      page.views > max.views ? page : max
    );

    if (topPage) {
      insights.push(`Page ${topPage.pageNumber} is the most viewed. Consider highlighting key content here.`);
    }

    if (analytics.topCountries.length > 0) {
      const topCountry = analytics.topCountries[0];
      insights.push(`${topCountry.country} is your top audience. Consider localizing content.`);
    }

    return insights;
  }

  /**
   * Convert report to CSV
   */
  private convertToCSV(report: any): string {
    // Implementation for CSV conversion
    return "CSV conversion not implemented yet";
  }

  /**
   * Convert report to PDF
   */
  private convertToPDF(report: any): Buffer {
    // Implementation for PDF conversion
    return Buffer.from("PDF conversion not implemented yet");
  }

  /**
   * Map database row to DocumentView
   */
  private mapRowToDocumentView(row: any): DocumentView {
    return {
      id: row.id,
      documentId: row.document_id,
      linkId: row.link_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      referrer: row.referrer,
      country: row.country,
      city: row.city,
      timeOnPage: parseInt(row.time_on_page) || 0,
      pagesViewed: row.pages_viewed || [],
      interactions: row.interactions || [],
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      screenResolution: row.screen_resolution,
      viewportSize: row.viewport_size,
      timestamp: new Date(row.created_at),
    };
  }
}

