import { Request, Response } from "express";
import { EnhancedDocumentSharingService } from "../services/enhancedDocumentSharingService";
import { createError, asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "../types/express";
import { query } from "../config/database";
import { v4 as uuidv4 } from "uuid";

export class EnhancedSharingController {
  private sharingService: EnhancedDocumentSharingService;

  constructor() {
    this.sharingService = new EnhancedDocumentSharingService();
  }

  /**
   * Create a shareable link
   */
  createShareableLink = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const linkData = req.body;
      const link = await this.sharingService.createShareableLink(
        userId,
        linkData
      );

      res.status(201).json({
        success: true,
        message: "Shareable link created successfully",
        data: link,
      });
    }
  );

  /**
   * Get shareable link by slug (public endpoint)
   */
  getShareableLinkBySlug = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { slug } = req.params;
      const link = await this.sharingService.getShareableLinkBySlug(slug);

      if (!link) {
        throw createError("Link not found", 404, "LINK_NOT_FOUND");
      }

      res.json({
        success: true,
        data: link,
      });
    }
  );

  /**
   * Update a shareable link
   */
  updateShareableLink = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const updates = req.body;
      const link = await this.sharingService.updateShareableLink(
        userId,
        id,
        updates
      );

      res.json({
        success: true,
        message: "Shareable link updated successfully",
        data: link,
      });
    }
  );

  /**
   * Create a data room
   */
  createDataRoom = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { organizationId, ...dataRoomData } = req.body;
      const dataRoom = await this.sharingService.createDataRoom(
        userId,
        organizationId,
        dataRoomData
      );

      res.status(201).json({
        success: true,
        message: "Data room created successfully",
        data: dataRoom,
      });
    }
  );

  /**
   * Add document to data room
   */
  addDocumentToDataRoom = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { dataRoomId } = req.params;
      const { documentId, displayOrder, isRequired } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const dataRoomDocument = await this.sharingService.addDocumentToDataRoom(
        userId,
        dataRoomId,
        documentId,
        displayOrder,
        isRequired
      );

      res.status(201).json({
        success: true,
        message: "Document added to data room successfully",
        data: dataRoomDocument,
      });
    }
  );

  /**
   * Record document view (public endpoint)
   */
  recordDocumentView = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { linkId } = req.params;
      const visitorInfo = req.body;

      await this.sharingService.recordDocumentView(linkId, visitorInfo);

      res.json({
        success: true,
        message: "Document view recorded successfully",
      });
    }
  );

  /**
   * Record page view (public endpoint)
   */
  recordPageView = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { documentViewId } = req.params;
      const { pageNumber, durationSeconds, scrollPercentage, interactions } =
        req.body;

      await this.sharingService.recordPageView(
        documentViewId,
        pageNumber,
        durationSeconds,
        scrollPercentage,
        interactions
      );

      res.json({
        success: true,
        message: "Page view recorded successfully",
      });
    }
  );

  /**
   * Record document download (public endpoint)
   */
  recordDocumentDownload = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { documentId, linkId, visitorId } = req.body;
      const { downloadType, ipAddress, userAgent } = req.body;

      await this.sharingService.recordDocumentDownload(
        documentId,
        linkId,
        visitorId,
        downloadType,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: "Document download recorded successfully",
      });
    }
  );

  /**
   * Generate QR code for a shareable link
   */
  generateQRCode = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { linkId } = req.params;
      const { baseUrl } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const qrCodeDataUrl = await this.sharingService.generateQRCode(
        linkId,
        baseUrl
      );

      res.json({
        success: true,
        data: {
          qrCodeDataUrl,
          linkId,
        },
      });
    }
  );

  /**
   * Get AI-powered insights for a document
   */
  getDocumentInsights = asyncHandler(
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

      const insights =
        await this.sharingService.getDocumentInsights(documentId);

      res.json({
        success: true,
        data: insights,
      });
    }
  );

  /**
   * Get all shareable links for a user
   */
  getUserShareableLinks = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { page = 1, limit = 20, status, search } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      try {
        let whereClause = "WHERE user_id = $1";
        const params: any[] = [userId];
        let paramIndex = 2;

        if (status) {
          whereClause += ` AND is_active = $${paramIndex++}`;
          params.push(status === "active");
        }

        if (search) {
          whereClause += ` AND (name ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm);
        }

        const result = await query(
          `
        SELECT * FROM document_links 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
          [...params, parseInt(limit as string), offset]
        );

        const countResult = await query(
          `
        SELECT COUNT(*) as total FROM document_links ${whereClause}
      `,
          params
        );

        res.json({
          success: true,
          data: {
            links: result.rows.map((row) =>
              this.sharingService.mapRowToShareableLink(row)
            ),
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total: parseInt(countResult.rows[0].total),
              pages: Math.ceil(
                parseInt(countResult.rows[0].total) / parseInt(limit as string)
              ),
            },
          },
        });
      } catch (error) {
        logger.error("Error getting user shareable links", {
          error: error.message,
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Get all data rooms for a user
   */
  getUserDataRooms = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { page = 1, limit = 20, status, search } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      try {
        let whereClause = "WHERE user_id = $1";
        const params: any[] = [userId];
        let paramIndex = 2;

        if (status) {
          whereClause += ` AND is_active = $${paramIndex++}`;
          params.push(status === "active");
        }

        if (search) {
          whereClause += ` AND (name ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm);
        }

        const result = await query(
          `
        SELECT * FROM data_rooms 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
          [...params, parseInt(limit as string), offset]
        );

        const countResult = await query(
          `
        SELECT COUNT(*) as total FROM data_rooms ${whereClause}
      `,
          params
        );

        res.json({
          success: true,
          data: {
            dataRooms: result.rows.map((row) =>
              this.sharingService.mapRowToDataRoom(row)
            ),
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total: parseInt(countResult.rows[0].total),
              pages: Math.ceil(
                parseInt(countResult.rows[0].total) / parseInt(limit as string)
              ),
            },
          },
        });
      } catch (error) {
        logger.error("Error getting user data rooms", {
          error: error.message,
          userId,
        });
        throw error;
      }
    }
  );

  /**
   * Delete a shareable link
   */
  deleteShareableLink = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Verify ownership
        const linkResult = await query(
          "SELECT id FROM document_links WHERE id = $1 AND user_id = $2",
          [id, userId]
        );

        if (linkResult.rows.length === 0) {
          throw createError(
            "Link not found or access denied",
            404,
            "LINK_NOT_FOUND"
          );
        }

        // Soft delete by setting is_active to false
        await query(
          `
        UPDATE document_links SET 
          is_active = false, 
          updated_at = NOW() 
        WHERE id = $1
      `,
          [id]
        );

        logger.info("Shareable link deleted", { userId, linkId: id });

        res.json({
          success: true,
          message: "Shareable link deleted successfully",
        });
      } catch (error) {
        logger.error("Error deleting shareable link", {
          error: error.message,
          userId,
          linkId: id,
        });
        throw error;
      }
    }
  );

  /**
   * Get analytics for a shareable link
   */
  getLinkAnalytics = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { linkId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Verify ownership
        const linkResult = await query(
          "SELECT document_id FROM document_links WHERE id = $1 AND user_id = $2",
          [linkId, userId]
        );

        if (linkResult.rows.length === 0) {
          throw createError(
            "Link not found or access denied",
            404,
            "LINK_NOT_FOUND"
          );
        }

        const documentId = linkResult.rows[0].document_id;

        // Get link-specific analytics
        const analyticsResult = await query(
          `
        SELECT 
          COUNT(DISTINCT dv.id) as total_views,
          COUNT(DISTINCT dv.visitor_id) as unique_viewers,
          COUNT(DISTINCT dd.id) as total_downloads,
          AVG(EXTRACT(EPOCH FROM (dv.created_at + INTERVAL '1 hour') - dv.created_at)) as avg_view_time,
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '24 hours' THEN dv.id END) as views_24h,
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '7 days' THEN dv.id END) as views_7d
        FROM document_links dl
        LEFT JOIN document_views dv ON dl.id = dv.link_id
        LEFT JOIN document_downloads dd ON dl.id = dd.link_id
        WHERE dl.id = $1
      `,
          [linkId]
        );

        // Get visitor demographics for this link
        const demographicsResult = await query(
          `
        SELECT 
          dv.country,
          dv.device_type,
          dv.browser,
          dv.os,
          COUNT(DISTINCT dv.visitor_id) as count
        FROM document_views dv
        WHERE dv.link_id = $1
        GROUP BY dv.country, dv.device_type, dv.browser, dv.os
        ORDER BY count DESC
        LIMIT 20
      `,
          [linkId]
        );

        // Get time series data for this link
        const timeSeriesResult = await query(
          `
        SELECT 
          DATE_TRUNC('day', dv.created_at) as date,
          COUNT(DISTINCT dv.id) as views,
          COUNT(DISTINCT dv.visitor_id) as unique_viewers,
          COUNT(DISTINCT dd.id) as downloads
        FROM document_views dv
        LEFT JOIN document_downloads dd ON dv.link_id = dd.link_id 
          AND dv.visitor_id = dd.visitor_id
        WHERE dv.link_id = $1 
          AND dv.created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', dv.created_at)
        ORDER BY date
      `,
          [linkId]
        );

        const analytics = analyticsResult.rows[0];
        const demographics = demographicsResult.rows;
        const timeSeries = timeSeriesResult.rows;

        res.json({
          success: true,
          data: {
            linkId,
            documentId,
            metrics: {
              totalViews: parseInt(analytics.total_views) || 0,
              uniqueViewers: parseInt(analytics.unique_viewers) || 0,
              totalDownloads: parseInt(analytics.total_downloads) || 0,
              averageViewTime: parseFloat(analytics.avg_view_time) || 0,
              views24h: parseInt(analytics.views_24h) || 0,
              views7d: parseInt(analytics.views_7d) || 0,
            },
            demographics: {
              countries: demographics
                .filter((d) => d.country)
                .reduce((acc, d) => {
                  acc[d.country] = parseInt(d.count);
                  return acc;
                }, {}),
              devices: demographics
                .filter((d) => d.device_type)
                .reduce((acc, d) => {
                  acc[d.device_type] = parseInt(d.count);
                  return acc;
                }, {}),
              browsers: demographics
                .filter((d) => d.browser)
                .reduce((acc, d) => {
                  acc[d.browser] = parseInt(d.count);
                  return acc;
                }, {}),
              operatingSystems: demographics
                .filter((d) => d.os)
                .reduce((acc, d) => {
                  acc[d.os] = parseInt(d.count);
                  return acc;
                }, {}),
            },
            timeSeries: timeSeries.map((row) => ({
              date: row.date.toISOString().split("T")[0],
              views: parseInt(row.views),
              uniqueViewers: parseInt(row.unique_viewers),
              downloads: parseInt(row.downloads),
            })),
          },
        });
      } catch (error) {
        logger.error("Error getting link analytics", {
          error: error.message,
          userId,
          linkId,
        });
        throw error;
      }
    }
  );

  /**
   * Get visitor list for a shareable link
   */
  getLinkVisitors = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { linkId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { page = 1, limit = 50, search } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      try {
        // Verify ownership
        const linkResult = await query(
          "SELECT id FROM document_links WHERE id = $1 AND user_id = $2",
          [linkId, userId]
        );

        if (linkResult.rows.length === 0) {
          throw createError(
            "Link not found or access denied",
            404,
            "LINK_NOT_FOUND"
          );
        }

        let whereClause = "WHERE dv.link_id = $1";
        const params: any[] = [linkId];
        let paramIndex = 2;

        if (search) {
          whereClause += ` AND (dv.visitor_name ILIKE $${paramIndex++} OR dv.visitor_email ILIKE $${paramIndex++})`;
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm);
        }

        const result = await query(
          `
        SELECT 
          dv.visitor_id,
          dv.visitor_name,
          dv.visitor_email,
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
          dv.created_at,
          COUNT(pv.id) as pages_viewed,
          MAX(pv.viewed_at) as last_activity
        FROM document_views dv
        LEFT JOIN page_views pv ON dv.id = pv.document_view_id
        ${whereClause}
        GROUP BY dv.id, dv.visitor_id, dv.visitor_name, dv.visitor_email, dv.ip_address, 
                 dv.country, dv.city, dv.device_type, dv.browser, dv.os, dv.referrer, 
                 dv.utm_source, dv.utm_medium, dv.utm_campaign, dv.created_at
        ORDER BY dv.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
          [...params, parseInt(limit as string), offset]
        );

        const countResult = await query(
          `
        SELECT COUNT(DISTINCT dv.visitor_id) as total 
        FROM document_views dv 
        ${whereClause}
      `,
          params
        );

        res.json({
          success: true,
          data: {
            visitors: result.rows.map((row) => ({
              visitorId: row.visitor_id,
              name: row.visitor_name,
              email: row.visitor_email,
              ipAddress: row.ip_address,
              location: {
                country: row.country,
                city: row.city,
              },
              device: {
                type: row.device_type,
                browser: row.browser,
                os: row.os,
              },
              referrer: row.referrer,
              utm: {
                source: row.utm_source,
                medium: row.utm_medium,
                campaign: row.utm_campaign,
              },
              firstVisit: row.created_at,
              pagesViewed: parseInt(row.pages_viewed),
              lastActivity: row.last_activity,
            })),
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total: parseInt(countResult.rows[0].total),
              pages: Math.ceil(
                parseInt(countResult.rows[0].total) / parseInt(limit as string)
              ),
            },
          },
        });
      } catch (error) {
        logger.error("Error getting link visitors", {
          error: error.message,
          userId,
          linkId,
        });
        throw error;
      }
    }
  );

  /**
   * Get email captures for a shareable link
   */
  getLinkEmailCaptures = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { linkId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const { page = 1, limit = 50, search } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      try {
        // Verify ownership
        const linkResult = await query(
          "SELECT id FROM document_links WHERE id = $1 AND user_id = $2",
          [linkId, userId]
        );

        if (linkResult.rows.length === 0) {
          throw createError(
            "Link not found or access denied",
            404,
            "LINK_NOT_FOUND"
          );
        }

        let whereClause = "WHERE ec.link_id = $1";
        const params: any[] = [linkId];
        let paramIndex = 2;

        if (search) {
          whereClause += ` AND (ec.email ILIKE $${paramIndex++} OR ec.name ILIKE $${paramIndex++} OR ec.company ILIKE $${paramIndex++})`;
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm);
        }

        const result = await query(
          `
        SELECT 
          ec.email,
          ec.name,
          ec.company,
          ec.message,
          ec.ip_address,
          ec.user_agent,
          ec.created_at
        FROM email_captures ec
        ${whereClause}
        ORDER BY ec.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
          [...params, parseInt(limit as string), offset]
        );

        const countResult = await query(
          `
        SELECT COUNT(*) as total FROM email_captures ec ${whereClause}
      `,
          params
        );

        res.json({
          success: true,
          data: {
            emailCaptures: result.rows.map((row) => ({
              email: row.email,
              name: row.name,
              company: row.company,
              message: row.message,
              ipAddress: row.ip_address,
              userAgent: row.user_agent,
              capturedAt: row.created_at,
            })),
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total: parseInt(countResult.rows[0].total),
              pages: Math.ceil(
                parseInt(countResult.rows[0].total) / parseInt(limit as string)
              ),
            },
          },
        });
      } catch (error) {
        logger.error("Error getting link email captures", {
          error: error.message,
          userId,
          linkId,
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
      const { documentId, format = "csv", dateRange = "30d" } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Verify document ownership
        const documentResult = await query(
          "SELECT id FROM documents WHERE id = $1 AND user_id = $2",
          [documentId, userId]
        );

        if (documentResult.rows.length === 0) {
          throw createError(
            "Document not found or access denied",
            404,
            "DOCUMENT_NOT_FOUND"
          );
        }

        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();

        switch (dateRange) {
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

        // Get analytics data for export
        const analyticsData = await query(
          `
        SELECT 
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
        FROM document_views dv
        LEFT JOIN page_views pv ON dv.id = pv.document_view_id
        LEFT JOIN document_downloads dd ON dv.document_id = dd.document_id 
          AND dv.visitor_id = dd.visitor_id
        WHERE dv.document_id = $1 
          AND dv.created_at BETWEEN $2 AND $3
        ORDER BY dv.created_at DESC
      `,
          [documentId, startDate, endDate]
        );

        // Generate export file
        let exportData: string;
        let filename: string;
        let contentType: string;

        if (format === "csv") {
          // Generate CSV
          const headers = [
            "Date",
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
            row.created_at.toISOString(),
            row.visitor_id,
            row.visitor_email || "",
            row.visitor_name || "",
            row.ip_address,
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
          filename = `analytics-${documentId}-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
          contentType = "text/csv";
        } else {
          // Generate JSON
          exportData = JSON.stringify(analyticsData.rows, null, 2);
          filename = `analytics-${documentId}-${dateRange}-${new Date().toISOString().split("T")[0]}.json`;
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
          documentId,
          format,
          dateRange,
        });
      } catch (error) {
        logger.error("Error exporting analytics", {
          error: error.message,
          userId,
          documentId,
        });
        throw error;
      }
    }
  );

  /**
   * Set up webhook for a shareable link
   */
  setupWebhook = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { linkId, webhookUrl, events, secret } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Verify link ownership
        const linkResult = await query(
          "SELECT id FROM document_links WHERE id = $1 AND user_id = $2",
          [linkId, userId]
        );

        if (linkResult.rows.length === 0) {
          throw createError(
            "Link not found or access denied",
            404,
            "LINK_NOT_FOUND"
          );
        }

        // Validate webhook URL
        try {
          new URL(webhookUrl);
        } catch {
          throw createError("Invalid webhook URL", 400, "INVALID_WEBHOOK_URL");
        }

        // Check if webhook already exists
        const existingWebhook = await query(
          "SELECT id FROM webhooks WHERE link_id = $1",
          [linkId]
        );

        if (existingWebhook.rows.length > 0) {
          // Update existing webhook
          await query(
            `
          UPDATE webhooks SET
            webhook_url = $1,
            events = $2,
            secret = $3,
            updated_at = NOW()
          WHERE link_id = $4
        `,
            [webhookUrl, JSON.stringify(events), secret, linkId]
          );
        } else {
          // Create new webhook
          await query(
            `
          INSERT INTO webhooks (
            id, link_id, webhook_url, events, secret, is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, true, NOW(), NOW()
          )
        `,
            [uuidv4(), linkId, webhookUrl, JSON.stringify(events), secret]
          );
        }

        logger.info("Webhook configured", { userId, linkId, webhookUrl });

        res.json({
          success: true,
          message: "Webhook configured successfully",
        });
      } catch (error) {
        logger.error("Error setting up webhook", {
          error: error.message,
          userId,
          linkId,
        });
        throw error;
      }
    }
  );

  /**
   * Get webhook configuration for a shareable link
   */
  getWebhookConfig = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { linkId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Verify link ownership
        const linkResult = await query(
          "SELECT id FROM document_links WHERE id = $1 AND user_id = $2",
          [linkId, userId]
        );

        if (linkResult.rows.length === 0) {
          throw createError(
            "Link not found or access denied",
            404,
            "LINK_NOT_FOUND"
          );
        }

        // Get webhook configuration
        const webhookResult = await query(
          `
        SELECT 
          id, webhook_url, events, secret, is_active, created_at, updated_at,
          last_triggered_at, last_response_code, last_response_body
        FROM webhooks 
        WHERE link_id = $1
      `,
          [linkId]
        );

        if (webhookResult.rows.length === 0) {
          res.json({
            success: true,
            data: null,
            message: "No webhook configured for this link",
          });
          return;
        }

        const webhook = webhookResult.rows[0];

        res.json({
          success: true,
          data: {
            id: webhook.id,
            webhookUrl: webhook.webhook_url,
            events: JSON.parse(webhook.events),
            isActive: webhook.is_active,
            createdAt: webhook.created_at,
            updatedAt: webhook.updated_at,
            lastTriggered: webhook.last_triggered_at,
            lastResponse: {
              code: webhook.last_response_code,
              body: webhook.last_response_body,
            },
          },
        });
      } catch (error) {
        logger.error("Error getting webhook config", {
          error: error.message,
          userId,
          linkId,
        });
        throw error;
      }
    }
  );

  /**
   * Test webhook configuration
   */
  testWebhook = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { linkId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Verify link ownership
        const linkResult = await query(
          "SELECT id FROM document_links WHERE id = $1 AND user_id = $2",
          [linkId, userId]
        );

        if (linkResult.rows.length === 0) {
          throw createError(
            "Link not found or access denied",
            404,
            "LINK_NOT_FOUND"
          );
        }

        // Get webhook configuration
        const webhookResult = await query(
          "SELECT webhook_url, events, secret FROM webhooks WHERE link_id = $1 AND is_active = true",
          [linkId]
        );

        if (webhookResult.rows.length === 0) {
          throw createError(
            "No active webhook found for this link",
            404,
            "WEBHOOK_NOT_FOUND"
          );
        }

        const webhook = webhookResult.rows[0];

        // Send test webhook
        const testPayload = {
          event: "webhook.test",
          linkId,
          timestamp: new Date().toISOString(),
          data: {
            message: "This is a test webhook to verify your configuration",
            userId,
            linkId,
          },
        };

        // Add signature if secret is configured
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "DocumentManager/1.0",
        };

        if (webhook.secret) {
          const crypto = require("crypto");
          const signature = crypto
            .createHmac("sha256", webhook.secret)
            .update(JSON.stringify(testPayload))
            .digest("hex");
          headers["X-Webhook-Signature"] = `sha256=${signature}`;
        }

        const response = await fetch(webhook.webhook_url, {
          method: "POST",
          headers,
          body: JSON.stringify(testPayload),
        });

        // Update webhook status
        await query(
          `
        UPDATE webhooks SET
          last_triggered_at = NOW(),
          last_response_code = $1,
          last_response_body = $2,
          updated_at = NOW()
        WHERE link_id = $3
      `,
          [response.status, await response.text(), linkId]
        );

        logger.info("Webhook test completed", {
          userId,
          linkId,
          status: response.status,
        });

        res.json({
          success: true,
          message: "Webhook test sent successfully",
          data: {
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        logger.error("Error testing webhook", {
          error: error.message,
          userId,
          linkId,
        });
        throw error;
      }
    }
  );

  /**
   * Get real-time viewer count
   */
  getRealTimeViewers = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { linkId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Verify link ownership
        const linkResult = await query(
          "SELECT id FROM document_links WHERE id = $1 AND user_id = $2",
          [linkId, userId]
        );

        if (linkResult.rows.length === 0) {
          throw createError(
            "Link not found or access denied",
            404,
            "LINK_NOT_FOUND"
          );
        }

        // Get real-time analytics
        const realtimeResult = await query(
          `
        SELECT 
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '5 minutes' THEN dv.visitor_id END) as current_viewers,
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '1 hour' THEN dv.id END) as recent_views,
          COUNT(DISTINCT CASE WHEN dd.downloaded_at > NOW() - INTERVAL '1 hour' THEN dd.id END) as recent_downloads,
          COUNT(DISTINCT CASE WHEN dv.created_at > NOW() - INTERVAL '24 hours' THEN dv.visitor_id END) as daily_unique_viewers
        FROM document_links dl
        LEFT JOIN document_views dv ON dl.id = dv.link_id
        LEFT JOIN document_downloads dd ON dl.id = dd.link_id
        WHERE dl.id = $1
      `,
          [linkId]
        );

        const data = realtimeResult.rows[0];

        res.json({
          success: true,
          data: {
            linkId,
            currentViewers: parseInt(data.current_viewers) || 0,
            recentViews: parseInt(data.recent_views) || 0,
            recentDownloads: parseInt(data.recent_downloads) || 0,
            dailyUniqueViewers: parseInt(data.daily_unique_viewers) || 0,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        logger.error("Error getting real-time viewers", {
          error: error.message,
          userId,
          linkId,
        });
        throw error;
      }
    }
  );

  /**
   * Get heatmap data for a document
   */
  getHeatmapData = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { documentId, pageNumber } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      try {
        // Verify document ownership
        const documentResult = await query(
          "SELECT id FROM documents WHERE id = $1 AND user_id = $2",
          [documentId, userId]
        );

        if (documentResult.rows.length === 0) {
          throw createError(
            "Document not found or access denied",
            404,
            "DOCUMENT_NOT_FOUND"
          );
        }

        // Get heatmap data for the specific page
        const heatmapResult = await query(
          `
        SELECT 
          pv.interactions,
          pv.scroll_percentage,
          COUNT(*) as frequency
        FROM page_views pv
        JOIN document_views dv ON pv.document_view_id = dv.id
        WHERE dv.document_id = $1 
          AND pv.page_number = $2
          AND pv.interactions IS NOT NULL
        GROUP BY pv.interactions, pv.scroll_percentage
        ORDER BY frequency DESC
        LIMIT 1000
      `,
          [documentId, pageNumber]
        );

        // Process heatmap data
        const heatmapData = {
          pageNumber: parseInt(pageNumber),
          clicks: [],
          scrolls: [],
          hovers: [],
          scrollDepth: {
            average: 0,
            distribution: {},
          },
        };

        let totalScrollDepth = 0;
        let scrollCount = 0;

        heatmapResult.rows.forEach((row) => {
          if (row.interactions) {
            try {
              const interactions = JSON.parse(row.interactions);
              const frequency = parseInt(row.frequency);

              // Process clicks
              if (interactions.clicks) {
                interactions.clicks.forEach((click: any) => {
                  heatmapData.clicks.push({
                    x: click.x,
                    y: click.y,
                    intensity: frequency,
                  });
                });
              }

              // Process hovers
              if (interactions.hovers) {
                interactions.hovers.forEach((hover: any) => {
                  heatmapData.hovers.push({
                    x: hover.x,
                    y: hover.y,
                    intensity: frequency,
                  });
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }

          // Process scroll data
          if (row.scroll_percentage) {
            const scrollDepth = parseFloat(row.scroll_percentage);
            totalScrollDepth += scrollDepth * parseInt(row.frequency);
            scrollCount += parseInt(row.frequency);

            // Build scroll depth distribution
            const depthBucket = Math.floor(scrollDepth / 10) * 10;
            heatmapData.scrollDepth.distribution[depthBucket] =
              (heatmapData.scrollDepth.distribution[depthBucket] || 0) +
              parseInt(row.frequency);
          }
        });

        // Calculate average scroll depth
        if (scrollCount > 0) {
          heatmapData.scrollDepth.average = totalScrollDepth / scrollCount;
        }

        // Add scroll data points
        Object.entries(heatmapData.scrollDepth.distribution).forEach(
          ([depth, frequency]) => {
            heatmapData.scrolls.push({
              y: parseInt(depth),
              intensity: frequency as number,
            });
          }
        );

        res.json({
          success: true,
          data: heatmapData,
        });
      } catch (error) {
        logger.error("Error getting heatmap data", {
          error: error.message,
          userId,
          documentId,
          pageNumber,
        });
        throw error;
      }
    }
  );
}
