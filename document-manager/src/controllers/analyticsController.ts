import { Request, Response } from "express";
import { AdvancedAnalyticsService } from "../services/advancedAnalyticsService";
import { createError, asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "../types/express";
import { query } from "../config/database";
import { v4 as uuidv4 } from "uuid";

export class AnalyticsController {
  private analyticsService: AdvancedAnalyticsService;

  constructor() {
    this.analyticsService = new AdvancedAnalyticsService();
  }

  /**
   * Get comprehensive document analytics
   */
  getDocumentAnalytics = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { documentId } = req.params;
      const filters = req.query;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      // Convert query parameters to filters
      const analyticsFilters = {
        startDate: filters.startDate as string,
        endDate: filters.endDate as string,
        countries: filters.countries
          ? (filters.countries as string).split(",")
          : undefined,
        devices: filters.devices
          ? (filters.devices as string).split(",")
          : undefined,
        browsers: filters.browsers
          ? (filters.browsers as string).split(",")
          : undefined,
      };

      const analytics = await this.analyticsService.getDocumentAnalytics(
        documentId,
        analyticsFilters
      );

      res.json({
        success: true,
        data: analytics,
      });
    }
  );

  /**
   * Get real-time analytics for a document
   */
  getRealTimeAnalytics = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { documentId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const realTimeData =
        await this.analyticsService.getRealTimeAnalytics(documentId);

      res.json({
        success: true,
        data: realTimeData,
      });
    }
  );

  /**
   * Get predictive analytics for a document
   */
  getPredictiveAnalytics = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { documentId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const predictiveData =
        await this.analyticsService.getPredictiveAnalytics(documentId);

      res.json({
        success: true,
        data: predictiveData,
      });
    }
  );

  /**
   * Get heatmap data for a specific page
   */
  getHeatmapData = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { documentId, pageNumber } = req.params;
      const filters = req.query;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const analyticsFilters = {
        startDate: filters.startDate as string,
        endDate: filters.endDate as string,
        countries: filters.countries
          ? (filters.countries as string).split(",")
          : undefined,
        devices: filters.devices
          ? (filters.devices as string).split(",")
          : undefined,
        browsers: filters.browsers
          ? (filters.browsers as string).split(",")
          : undefined,
      };

      const heatmapData = await this.analyticsService.getHeatmapData(
        documentId,
        parseInt(pageNumber),
        analyticsFilters
      );

      res.json({
        success: true,
        data: heatmapData,
      });
    }
  );

  /**
   * Get performance metrics for a user's documents
   */
  getPerformanceMetrics = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { timeRange = "30d" } = req.query;

      try {
        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();

        switch (timeRange) {
          case "7d":
            startDate.setDate(endDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(endDate.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(endDate.getDate() - 90);
            break;
          case "1y":
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
          default:
            startDate.setDate(endDate.getDate() - 30);
        }

        // Get performance metrics
        const result = await query(
          `
        SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(DISTINCT dv.id) as total_views,
          COUNT(DISTINCT dv.visitor_id) as unique_viewers,
          COUNT(DISTINCT dd.id) as total_downloads,
          AVG(EXTRACT(EPOCH FROM (dv.created_at + INTERVAL '1 hour') - dv.created_at)) as avg_view_time,
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '24 hours' THEN dv.id END) as views_24h,
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '7 days' THEN dv.id END) as views_7d
        FROM documents d
        LEFT JOIN document_views dv ON d.id = dv.document_id 
          AND dv.created_at BETWEEN $1 AND $2
        LEFT JOIN document_downloads dd ON d.id = dd.document_id 
          AND dd.downloaded_at BETWEEN $1 AND $2
        WHERE d.user_id = $3
      `,
          [startDate, endDate, userId]
        );

        const metrics = result.rows[0];

        res.json({
          success: true,
          data: {
            timeRange,
            metrics: {
              totalDocuments: parseInt(metrics.total_documents) || 0,
              totalViews: parseInt(metrics.total_views) || 0,
              uniqueViewers: parseInt(metrics.unique_viewers) || 0,
              totalDownloads: parseInt(metrics.total_downloads) || 0,
              averageViewTime: parseFloat(metrics.avg_view_time) || 0,
              views24h: parseInt(metrics.views_24h) || 0,
              views7d: parseInt(metrics.views_7d) || 0,
            },
            calculated: {
              conversionRate:
                metrics.total_views > 0
                  ? (
                      (parseInt(metrics.total_downloads) /
                        parseInt(metrics.total_views)) *
                      100
                    ).toFixed(2)
                  : 0,
              averageViewsPerDocument:
                metrics.total_documents > 0
                  ? (
                      parseInt(metrics.total_views) /
                      parseInt(metrics.total_documents)
                    ).toFixed(2)
                  : 0,
            },
          },
        });
      } catch (error) {
        logger.error("Error getting performance metrics", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Get analytics summary for a user
   */
  getUserAnalyticsSummary = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Get user's analytics summary
        const result = await query(
          `
        SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(DISTINCT dl.id) as total_links,
          COUNT(DISTINCT dr.id) as total_data_rooms,
          COUNT(DISTINCT dv.id) as total_views,
          COUNT(DISTINCT dv.visitor_id) as unique_viewers,
          COUNT(DISTINCT dd.id) as total_downloads,
          COUNT(DISTINCT ec.id) as total_email_captures,
          MAX(dv.created_at) as last_view,
          MAX(dd.downloaded_at) as last_download
        FROM documents d
        LEFT JOIN document_links dl ON d.id = dl.document_id
        LEFT JOIN data_rooms dr ON d.user_id = dr.user_id
        LEFT JOIN document_views dv ON d.id = dv.document_id
        LEFT JOIN document_downloads dd ON d.id = dd.document_id
        LEFT JOIN email_captures ec ON d.id = ec.document_id
        WHERE d.user_id = $1
      `,
          [userId]
        );

        const summary = result.rows[0];

        // Get recent activity
        const recentActivity = await query(
          `
        SELECT 
          'view' as type,
          dv.created_at as timestamp,
          d.name as document_name,
          dv.visitor_id,
          dv.country
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.user_id = $1
        UNION ALL
        SELECT 
          'download' as type,
          dd.downloaded_at as timestamp,
          d.name as document_name,
          dd.visitor_id,
          NULL as country
        FROM document_downloads dd
        JOIN documents d ON dd.document_id = d.id
        WHERE d.user_id = $1
        ORDER BY timestamp DESC
        LIMIT 10
      `,
          [userId]
        );

        res.json({
          success: true,
          data: {
            summary: {
              totalDocuments: parseInt(summary.total_documents) || 0,
              totalLinks: parseInt(summary.total_links) || 0,
              totalDataRooms: parseInt(summary.total_data_rooms) || 0,
              totalViews: parseInt(summary.total_views) || 0,
              uniqueViewers: parseInt(summary.unique_viewers) || 0,
              totalDownloads: parseInt(summary.total_downloads) || 0,
              totalEmailCaptures: parseInt(summary.total_email_captures) || 0,
              lastView: summary.last_view,
              lastDownload: summary.last_download,
            },
            recentActivity: recentActivity.rows.map((row) => ({
              type: row.type,
              timestamp: row.timestamp,
              documentName: row.document_name,
              visitorId: row.visitor_id,
              country: row.country,
            })),
          },
        });
      } catch (error) {
        logger.error("Error getting user analytics summary", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Get analytics trends over time
   */
  getAnalyticsTrends = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { timeRange = "30d", metric = "views" } = req.query;

      try {
        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();
        let groupBy: string;

        switch (timeRange) {
          case "7d":
            startDate.setDate(endDate.getDate() - 7);
            groupBy = "hour";
            break;
          case "30d":
            startDate.setDate(endDate.getDate() - 30);
            groupBy = "day";
            break;
          case "90d":
            startDate.setDate(endDate.getDate() - 90);
            groupBy = "day";
            break;
          case "1y":
            startDate.setFullYear(endDate.getFullYear() - 1);
            groupBy = "week";
            break;
          default:
            startDate.setDate(endDate.getDate() - 30);
            groupBy = "day";
        }

        let queryStr: string;
        let params: any[];

        if (metric === "views") {
          queryStr = `
          SELECT 
            DATE_TRUNC($1, dv.created_at) as period,
            COUNT(DISTINCT dv.id) as value,
            COUNT(DISTINCT dv.visitor_id) as unique_value
          FROM document_views dv
          JOIN documents d ON dv.document_id = d.id
          WHERE d.user_id = $2 
            AND dv.created_at BETWEEN $3 AND $4
          GROUP BY DATE_TRUNC($1, dv.created_at)
          ORDER BY period
        `;
          params = [groupBy, userId, startDate, endDate];
        } else if (metric === "downloads") {
          queryStr = `
          SELECT 
            DATE_TRUNC($1, dd.downloaded_at) as period,
            COUNT(DISTINCT dd.id) as value,
            COUNT(DISTINCT dd.visitor_id) as unique_value
          FROM document_downloads dd
          JOIN documents d ON dd.document_id = d.id
          WHERE d.user_id = $2 
            AND dd.downloaded_at BETWEEN $3 AND $4
          GROUP BY DATE_TRUNC($1, dd.downloaded_at)
          ORDER BY period
        `;
          params = [groupBy, userId, startDate, endDate];
        } else if (metric === "email_captures") {
          queryStr = `
          SELECT 
            DATE_TRUNC($1, ec.created_at) as period,
            COUNT(DISTINCT ec.id) as value,
            COUNT(DISTINCT ec.email) as unique_value
          FROM email_captures ec
          JOIN documents d ON ec.document_id = d.id
          WHERE d.user_id = $2 
            AND ec.created_at BETWEEN $3 AND $4
          GROUP BY DATE_TRUNC($1, ec.created_at)
          ORDER BY period
        `;
          params = [groupBy, userId, startDate, endDate];
        } else {
          throw createError("Invalid metric specified", 400, "INVALID_METRIC");
        }

        const result = await query(queryStr, params);

        // Calculate trends
        const trends = result.rows.map((row, index) => {
          const prevRow = index > 0 ? result.rows[index - 1] : null;
          const change = prevRow
            ? ((row.value - prevRow.value) / prevRow.value) * 100
            : 0;

          return {
            period: row.period.toISOString(),
            value: parseInt(row.value),
            uniqueValue: parseInt(row.unique_value),
            change: Math.round(change * 100) / 100,
            trend: change > 0 ? "up" : change < 0 ? "down" : "stable",
          };
        });

        res.json({
          success: true,
          data: {
            metric,
            timeRange,
            groupBy,
            trends,
            summary: {
              total: trends.reduce((sum, t) => sum + t.value, 0),
              average: Math.round(
                trends.reduce((sum, t) => sum + t.value, 0) / trends.length
              ),
              change: trends.length > 1 ? trends[trends.length - 1].change : 0,
            },
          },
        });
      } catch (error) {
        logger.error("Error getting analytics trends", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Get audience insights
   */
  getAudienceInsights = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { timeRange = "30d" } = req.query;

      try {
        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();

        switch (timeRange) {
          case "7d":
            startDate.setDate(endDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(endDate.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(endDate.getDate() - 90);
            break;
          case "1y":
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
          default:
            startDate.setDate(endDate.getDate() - 30);
        }

        // Get geographic distribution
        const geographicResult = await query(
          `
        SELECT 
          dv.country,
          COUNT(DISTINCT dv.visitor_id) as visitors,
          COUNT(DISTINCT dv.id) as views
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.user_id = $1 
          AND dv.created_at BETWEEN $2 AND $3
          AND dv.country IS NOT NULL
        GROUP BY dv.country
        ORDER BY visitors DESC
        LIMIT 20
      `,
          [userId, startDate, endDate]
        );

        // Get device distribution
        const deviceResult = await query(
          `
        SELECT 
          dv.device_type,
          COUNT(DISTINCT dv.visitor_id) as visitors,
          COUNT(DISTINCT dv.id) as views
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.user_id = $1 
          AND dv.created_at BETWEEN $2 AND $3
          AND dv.device_type IS NOT NULL
        GROUP BY dv.device_type
        ORDER BY visitors DESC
      `,
          [userId, startDate, endDate]
        );

        // Get browser distribution
        const browserResult = await query(
          `
        SELECT 
          dv.browser,
          COUNT(DISTINCT dv.visitor_id) as visitors,
          COUNT(DISTINCT dv.id) as views
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.user_id = $1 
          AND dv.created_at BETWEEN $2 AND $3
          AND dv.browser IS NOT NULL
        GROUP BY dv.browser
        ORDER BY visitors DESC
        LIMIT 10
      `,
          [userId, startDate, endDate]
        );

        // Get operating system distribution
        const osResult = await query(
          `
        SELECT 
          dv.os,
          COUNT(DISTINCT dv.visitor_id) as visitors,
          COUNT(DISTINCT dv.id) as views
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.user_id = $1 
          AND dv.created_at BETWEEN $2 AND $3
          AND dv.os IS NOT NULL
        GROUP BY dv.os
        ORDER BY visitors DESC
        LIMIT 10
      `,
          [userId, startDate, endDate]
        );

        // Get traffic sources
        const trafficResult = await query(
          `
        SELECT 
          COALESCE(dv.utm_source, 'direct') as source,
          COUNT(DISTINCT dv.visitor_id) as visitors,
          COUNT(DISTINCT dv.id) as views,
          COUNT(DISTINCT dd.id) as downloads
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        LEFT JOIN document_downloads dd ON dv.document_id = dd.document_id 
          AND dv.visitor_id = dd.visitor_id
        WHERE d.user_id = $1 
          AND dv.created_at BETWEEN $2 AND $3
        GROUP BY COALESCE(dv.utm_source, 'direct')
        ORDER BY visitors DESC
        LIMIT 15
      `,
          [userId, startDate, endDate]
        );

        res.json({
          success: true,
          data: {
            timeRange,
            geographic: geographicResult.rows.map((row) => ({
              country: row.country,
              visitors: parseInt(row.visitors),
              views: parseInt(row.views),
              conversionRate:
                row.views > 0
                  ? (
                      (parseInt(row.visitors) / parseInt(row.views)) *
                      100
                    ).toFixed(2)
                  : 0,
            })),
            devices: deviceResult.rows.map((row) => ({
              type: row.device_type,
              visitors: parseInt(row.visitors),
              views: parseInt(row.views),
              percentage: 0, // Will be calculated on frontend
            })),
            browsers: browserResult.rows.map((row) => ({
              name: row.browser,
              visitors: parseInt(row.visitors),
              views: parseInt(row.views),
              percentage: 0, // Will be calculated on frontend
            })),
            operatingSystems: osResult.rows.map((row) => ({
              name: row.os,
              visitors: parseInt(row.visitors),
              views: parseInt(row.views),
              percentage: 0, // Will be calculated on frontend
            })),
            trafficSources: trafficResult.rows.map((row) => ({
              source: row.source,
              visitors: parseInt(row.visitors),
              views: parseInt(row.views),
              downloads: parseInt(row.downloads),
              conversionRate:
                row.visitors > 0
                  ? (
                      (parseInt(row.downloads) / parseInt(row.visitors)) *
                      100
                    ).toFixed(2)
                  : 0,
            })),
          },
        });
      } catch (error) {
        logger.error("Error getting audience insights", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Compare documents analytics
   */
  compareDocuments = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { documentIds, timeRange = "30d" } = req.body;

      if (
        !documentIds ||
        !Array.isArray(documentIds) ||
        documentIds.length < 2
      ) {
        throw createError(
          "At least 2 document IDs are required",
          400,
          "INVALID_DOCUMENT_IDS"
        );
      }

      try {
        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();

        switch (timeRange) {
          case "7d":
            startDate.setDate(endDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(endDate.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(endDate.getDate() - 90);
            break;
          case "1y":
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
          default:
            startDate.setDate(endDate.getDate() - 30);
        }

        // Verify document ownership
        const ownershipResult = await query(
          "SELECT id FROM documents WHERE id = ANY($1) AND user_id = $2",
          [documentIds, userId]
        );

        if (ownershipResult.rows.length !== documentIds.length) {
          throw createError(
            "Some documents not found or access denied",
            404,
            "DOCUMENTS_NOT_FOUND"
          );
        }

        // Get comparison data for each document
        const comparisonData = await Promise.all(
          documentIds.map(async (documentId) => {
            const result = await query(
              `
            SELECT 
              d.name as document_name,
              COUNT(DISTINCT dv.id) as total_views,
              COUNT(DISTINCT dv.visitor_id) as unique_viewers,
              COUNT(DISTINCT dd.id) as total_downloads,
              AVG(EXTRACT(EPOCH FROM (dv.created_at + INTERVAL '1 hour') - dv.created_at)) as avg_view_time,
              COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '24 hours' THEN dv.id END) as views_24h,
              COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '7 days' THEN dv.id END) as views_7d
            FROM documents d
            LEFT JOIN document_views dv ON d.id = dv.document_id 
              AND dv.created_at BETWEEN $1 AND $2
            LEFT JOIN document_downloads dd ON d.id = dd.document_id 
              AND dd.downloaded_at BETWEEN $1 AND $2
            WHERE d.id = $3
            GROUP BY d.id, d.name
          `,
              [startDate, endDate, documentId]
            );

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
              documentId,
              documentName: row.document_name,
              metrics: {
                totalViews: parseInt(row.total_views) || 0,
                uniqueViewers: parseInt(row.unique_viewers) || 0,
                totalDownloads: parseInt(row.total_downloads) || 0,
                averageViewTime: parseFloat(row.avg_view_time) || 0,
                views24h: parseInt(row.views_24h) || 0,
                views7d: parseInt(row.views_7d) || 0,
              },
              calculated: {
                conversionRate:
                  row.total_views > 0
                    ? (
                        (parseInt(row.total_downloads) /
                          parseInt(row.total_views)) *
                        100
                      ).toFixed(2)
                    : 0,
                engagementScore: this.calculateEngagementScore({
                  totalViews: parseInt(row.total_views) || 0,
                  averageViewTime: parseFloat(row.avg_view_time) || 0,
                  conversionRate:
                    row.total_views > 0
                      ? (parseInt(row.total_downloads) /
                          parseInt(row.total_views)) *
                        100
                      : 0,
                }),
              },
            };
          })
        );

        // Filter out null results
        const validData = comparisonData.filter((data) => data !== null);

        if (validData.length === 0) {
          throw createError(
            "No valid data found for comparison",
            404,
            "NO_COMPARISON_DATA"
          );
        }

        // Calculate rankings
        const rankings = {
          totalViews: validData.sort(
            (a, b) => b.metrics.totalViews - a.metrics.totalViews
          ),
          uniqueViewers: validData.sort(
            (a, b) => b.metrics.uniqueViewers - a.metrics.uniqueViewers
          ),
          conversionRate: validData.sort(
            (a, b) => {
              const aRate = parseFloat(a.calculated.conversionRate) || 0;
              const bRate = parseFloat(b.calculated.conversionRate) || 0;
              return bRate - aRate;
            }
          ),
          engagementScore: validData.sort(
            (a, b) => b.calculated.engagementScore - a.calculated.engagementScore
          ),
        };

        res.json({
          success: true,
          data: {
            timeRange,
            documents: validData,
            rankings,
            summary: {
              totalViews: validData.reduce(
                (sum, doc) => sum + doc.metrics.totalViews,
                0
              ),
              totalUniqueViewers: validData.reduce(
                (sum, doc) => sum + doc.metrics.uniqueViewers,
                0
              ),
              totalDownloads: validData.reduce(
                (sum, doc) => sum + doc.metrics.totalDownloads,
                0
              ),
              averageEngagementScore: Math.round(
                validData.reduce(
                  (sum, doc) => sum + doc.calculated.engagementScore,
                  0
                ) / validData.length
              ),
            },
          },
        });
      } catch (error) {
        logger.error("Error comparing documents", {
          error: error instanceof Error ? error.message : String(error),
          userId,
          documentIds,
        });
        throw error;
      }
    }
  );

  /**
   * Get custom dashboard data
   */
  getCustomDashboard = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { dashboardId } = req.params;

      try {
        // Get dashboard configuration
        const dashboardResult = await query(
          "SELECT * FROM custom_dashboards WHERE id = $1 AND user_id = $2",
          [dashboardId, userId]
        );

        if (dashboardResult.rows.length === 0) {
          throw createError(
            "Dashboard not found or access denied",
            404,
            "DASHBOARD_NOT_FOUND"
          );
        }

        const dashboard = dashboardResult.rows[0];
        const config = JSON.parse(dashboard.config);

        // Get data for each widget
        const widgets = await Promise.all(
          config.widgets.map(async (widget: any) => {
            switch (widget.type) {
              case "metric":
                return await this.getMetricWidgetData(userId, widget);
              case "chart":
                return await this.getChartWidgetData(userId, widget);
              case "table":
                return await this.getTableWidgetData(userId, widget);
              default:
                return {
                  type: widget.type,
                  data: null,
                  error: "Unknown widget type",
                };
            }
          })
        );

        res.json({
          success: true,
          data: {
            dashboard: {
              id: dashboard.id,
              name: dashboard.name,
              description: dashboard.description,
              config: config,
              createdAt: dashboard.created_at,
              updatedAt: dashboard.updated_at,
            },
            widgets,
          },
        });
      } catch (error) {
        logger.error("Error getting custom dashboard", {
          error: error instanceof Error ? error.message : String(error),
          userId,
          dashboardId,
        });
        throw error;
      }
    }
  );

  /**
   * Save custom dashboard
   */
  saveCustomDashboard = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { name, description, config } = req.body;

      if (!name || !config) {
        throw createError(
          "Name and config are required",
          400,
          "MISSING_REQUIRED_FIELDS"
        );
      }

      try {
        const dashboardId = uuidv4();
        const result = await query(
          `
        INSERT INTO custom_dashboards (
          id, user_id, name, description, config, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `,
          [dashboardId, userId, name, description, JSON.stringify(config)]
        );

        logger.info("Custom dashboard saved", { userId, dashboardId, name });

        res.status(201).json({
          success: true,
          message: "Dashboard saved successfully",
          data: {
            id: result.rows[0].id,
            name: result.rows[0].name,
            description: result.rows[0].description,
            config: JSON.parse(result.rows[0].config),
            createdAt: result.rows[0].created_at,
            updatedAt: result.rows[0].updated_at,
          },
        });
      } catch (error) {
        logger.error("Error saving custom dashboard", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Get analytics alerts
   */
  getAnalyticsAlerts = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        const result = await query(
          `
        SELECT 
          id, name, description, alert_type, conditions, is_active, 
          created_at, updated_at, last_triggered_at
        FROM analytics_alerts 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
          [userId]
        );

        res.json({
          success: true,
          data: result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            alertType: row.alert_type,
            conditions: JSON.parse(row.conditions),
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastTriggered: row.last_triggered_at,
          })),
        });
      } catch (error) {
        logger.error("Error getting analytics alerts", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Set up analytics alert
   */
  setupAnalyticsAlert = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const {
        name,
        description,
        alertType,
        conditions,
        isActive = true,
      } = req.body;

      if (!name || !alertType || !conditions) {
        throw createError(
          "Name, alert type, and conditions are required",
          400,
          "MISSING_REQUIRED_FIELDS"
        );
      }

      try {
        const alertId = uuidv4();
        const result = await query(
          `
        INSERT INTO analytics_alerts (
          id, user_id, name, description, alert_type, conditions, 
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `,
          [
            alertId,
            userId,
            name,
            description,
            alertType,
            JSON.stringify(conditions),
            isActive,
          ]
        );

        logger.info("Analytics alert set up", {
          userId,
          alertId,
          name,
          alertType,
        });

        res.status(201).json({
          success: true,
          message: "Analytics alert set up successfully",
          data: {
            id: result.rows[0].id,
            name: result.rows[0].name,
            description: result.rows[0].description,
            alertType: result.rows[0].alert_type,
            conditions: JSON.parse(result.rows[0].conditions),
            isActive: result.rows[0].is_active,
            createdAt: result.rows[0].created_at,
            updatedAt: result.rows[0].updated_at,
          },
        });
      } catch (error) {
        logger.error("Error setting up analytics alert", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Export analytics data
   */
  exportAnalytics = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const {
        documentIds,
        timeRange = "30d",
        format = "csv",
        includeDetails = false,
      } = req.body;

      try {
        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();

        switch (timeRange) {
          case "7d":
            startDate.setDate(endDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(endDate.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(endDate.getDate() - 90);
            break;
          case "1y":
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
          default:
            startDate.setDate(endDate.getDate() - 30);
        }

        // Build WHERE clause for documents
        let documentWhereClause = "d.user_id = $1";
        let params: any[] = [userId];
        let paramIndex = 2;

        if (documentIds && documentIds.length > 0) {
          documentWhereClause += ` AND d.id = ANY($${paramIndex++})`;
          params.push(documentIds);
        }

        // Get analytics data
        const analyticsData = await query(
          `
        SELECT 
          d.name as document_name,
          d.id as document_id,
          dv.created_at,
          dv.visitor_id,
          dv.visitor_email,
          dv.visitor_name,
          dv.ip_address,
          dv.country,
          dv.city,
          dv.device_type,
          dv.browser,
          dv.os,
          dv.referrer,
          dv.utm_source,
          dv.utm_medium,
          dv.utm_campaign,
          pv.page_number,
          pv.duration_seconds,
          pv.scroll_percentage,
          dd.downloaded_at,
          dd.download_type
        FROM documents d
        LEFT JOIN document_views dv ON d.id = dv.document_id 
          AND dv.created_at BETWEEN $${paramIndex++} AND $${paramIndex++}
        LEFT JOIN page_views pv ON dv.id = pv.document_view_id
        LEFT JOIN document_downloads dd ON d.id = dd.document_id 
          AND dv.visitor_id = dd.visitor_id
          AND dd.downloaded_at BETWEEN $${paramIndex - 2} AND $${paramIndex - 1}
        WHERE ${documentWhereClause}
        ORDER BY d.name, dv.created_at DESC
      `,
          [...params, startDate, endDate]
        );

        // Generate export file
        let exportData: string;
        let filename: string;
        let contentType: string;

        if (format === "csv") {
          // Generate CSV
          const headers = [
            "Document Name",
            "Document ID",
            "View Date",
            "Visitor ID",
            "Email",
            "Name",
            "IP Address",
            "Country",
            "City",
            "Device",
            "Browser",
            "OS",
            "Referrer",
            "UTM Source",
            "UTM Medium",
            "UTM Campaign",
            "Page",
            "Duration (s)",
            "Scroll %",
            "Downloaded",
            "Download Type",
          ];

          const rows = analyticsData.rows.map((row) => [
            row.document_name,
            row.document_id,
            row.created_at ? row.created_at.toISOString() : "",
            row.visitor_id || "",
            row.visitor_email || "",
            row.visitor_name || "",
            row.ip_address || "",
            row.country || "",
            row.city || "",
            row.device_type || "",
            row.browser || "",
            row.os || "",
            row.referrer || "",
            row.utm_source || "",
            row.utm_medium || "",
            row.utm_campaign || "",
            row.page_number || "",
            row.duration_seconds || "",
            row.scroll_percentage || "",
            row.downloaded_at ? "Yes" : "No",
            row.download_type || "",
          ]);

          exportData = [headers, ...rows]
            .map((row) => row.map((field) => `"${field}"`).join(","))
            .join("\n");
          filename = `analytics-export-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`;
          contentType = "text/csv";
        } else {
          // Generate JSON
          exportData = JSON.stringify(analyticsData.rows, null, 2);
          filename = `analytics-export-${timeRange}-${new Date().toISOString().split("T")[0]}.json`;
          contentType = "application/json";
        }

        // Set response headers for download
        res.setHeader("Content-Type", contentType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        res.setHeader("Content-Length", Buffer.byteLength(exportData, "utf8"));

        res.send(exportData);

        logger.info("Analytics export completed", {
          userId,
          format,
          timeRange,
          documentIds,
        });
      } catch (error) {
        logger.error("Error exporting analytics", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error;
      }
    }
  );

  // Helper methods for custom dashboard widgets
  private async getMetricWidgetData(userId: string, widget: any) {
    try {
      const { metric, timeRange } = widget.config;
      // Implementation would depend on the specific metric type
      return { type: "metric", data: { value: 0, change: 0 } };
    } catch (error) {
      return { type: "metric", data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async getChartWidgetData(userId: string, widget: any) {
    try {
      const { chartType, dataSource, timeRange } = widget.config;
      // Implementation would depend on the specific chart type
      return { type: "chart", data: { labels: [], datasets: [] } };
    } catch (error) {
      return { type: "chart", data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async getTableWidgetData(userId: string, widget: any) {
    try {
      const { columns, dataSource, timeRange } = widget.config;
      // Implementation would depend on the specific table configuration
      return { type: "table", data: { columns: [], rows: [] } };
    } catch (error) {
      return { type: "table", data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private calculateEngagementScore(metrics: any): number {
    const viewScore = Math.min(metrics.totalViews / 100, 1) * 25;
    const timeScore = Math.min(metrics.averageViewTime / 300, 1) * 25;
    const conversionScore = Math.min(metrics.conversionRate / 10, 1) * 25;
    const activityScore = Math.min(metrics.totalViews / 50, 1) * 25;

    return Math.round(viewScore + timeScore + conversionScore + activityScore);
  }
}
