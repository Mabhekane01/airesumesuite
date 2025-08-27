import { Router } from "express";
import { logger } from "@document-sharing/core/utils/logger";
import jwt from "jsonwebtoken";
import { query } from "@document-sharing/core/database/connection";

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authorization header required",
      code: "AUTHORIZATION_HEADER_MISSING",
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
};

/**
 * @route GET /api/v1/analytics/documents/:documentId
 * @desc Get analytics for a specific document
 * @access Private
 */
router.get("/documents/:documentId", authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { timeRange = "30d" } = req.query;

    // Check if user has access to this document
    const documentResult = await query(
      "SELECT organization_id FROM documents WHERE id = $1",
      [documentId]
    );

    if (documentResult.rows.length === 0) {
      return res.status(404).json({
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    if (documentResult.rows[0].organization_id !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Calculate time range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data
    const [
      totalViews,
      uniqueVisitors,
      topCountries,
      topDevices,
      topBrowsers,
      viewsByDay,
    ] = await Promise.all([
      // Total views
      query(
        "SELECT COUNT(*) FROM document_views WHERE document_id = $1 AND created_at >= $2",
        [documentId, startDate]
      ),
      // Unique visitors
      query(
        "SELECT COUNT(DISTINCT ip_address) FROM document_views WHERE document_id = $1 AND created_at >= $2",
        [documentId, startDate]
      ),
      // Top countries
      query(
        `
        SELECT country, COUNT(*) as views
        FROM document_views 
        WHERE document_id = $1 AND created_at >= $2 AND country IS NOT NULL
        GROUP BY country 
        ORDER BY views DESC 
        LIMIT 10
        `,
        [documentId, startDate]
      ),
      // Top devices
      query(
        `
        SELECT device_type, COUNT(*) as views
        FROM document_views 
        WHERE document_id = $1 AND created_at >= $2
        GROUP BY device_type 
        ORDER BY views DESC
        `,
        [documentId, startDate]
      ),
      // Top browsers
      query(
        `
        SELECT browser, COUNT(*) as views
        FROM document_views 
        WHERE document_id = $1 AND created_at >= $2
        GROUP BY browser 
        ORDER BY views DESC 
        LIMIT 10
        `,
        [documentId, startDate]
      ),
      // Views by day
      query(
        `
        SELECT DATE(created_at) as day, COUNT(*) as views
        FROM document_views 
        WHERE document_id = $1 AND created_at >= $2
        GROUP BY DATE(created_at)
        ORDER BY day
        `,
        [documentId, startDate]
      ),
    ]);

    const analytics = {
      documentId,
      timeRange,
      totalViews: parseInt(totalViews.rows[0].count),
      uniqueVisitors: parseInt(uniqueVisitors.rows[0].count),
      topCountries: topCountries.rows.map((row) => ({
        country: row.country,
        views: parseInt(row.views),
      })),
      topDevices: topDevices.rows.map((row) => ({
        device: row.device_type,
        views: parseInt(row.views),
      })),
      topBrowsers: topBrowsers.rows.map((row) => ({
        browser: row.browser,
        views: parseInt(row.views),
      })),
      viewsByDay: viewsByDay.rows.map((row) => ({
        day: row.day,
        views: parseInt(row.views),
      })),
    };

    res.json({
      success: true,
      data: {
        analytics,
      },
    });
  } catch (error) {
    logger.error("Get document analytics error:", error);
    res.status(500).json({
      error: "Failed to get document analytics",
      code: "GET_ANALYTICS_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/analytics/organization
 * @desc Get analytics for the user's organization
 * @access Private
 */
router.get("/organization", authenticateToken, async (req, res) => {
  try {
    const { timeRange = "30d" } = req.query;

    // Calculate time range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get organization analytics
    const [totalViews, totalDocuments, topDocuments, viewsByDay] =
      await Promise.all([
        // Total views across all documents
        query(
          `
        SELECT COUNT(*) 
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.organization_id = $1 AND dv.created_at >= $2
        `,
          [req.user.organizationId, startDate]
        ),
        // Total documents
        query(
          "SELECT COUNT(*) FROM documents WHERE organization_id = $1 AND is_archived = false",
          [req.user.organizationId]
        ),
        // Top performing documents
        query(
          `
        SELECT d.id, d.title, d.file_name, COUNT(dv.id) as views
        FROM documents d
        LEFT JOIN document_views dv ON d.id = dv.document_id AND dv.created_at >= $2
        WHERE d.organization_id = $1 AND d.is_archived = false
        GROUP BY d.id, d.title, d.file_name
        ORDER BY views DESC
        LIMIT 10
        `,
          [req.user.organizationId, startDate]
        ),
        // Views by day
        query(
          `
        SELECT DATE(dv.created_at) as day, COUNT(*) as views
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.organization_id = $1 AND dv.created_at >= $2
        GROUP BY DATE(dv.created_at)
        ORDER BY day
        `,
          [req.user.organizationId, startDate]
        ),
      ]);

    const analytics = {
      organizationId: req.user.organizationId,
      timeRange,
      totalViews: parseInt(totalViews.rows[0].count),
      totalDocuments: parseInt(totalDocuments.rows[0].count),
      topDocuments: topDocuments.rows.map((row) => ({
        id: row.id,
        title: row.title,
        fileName: row.file_name,
        views: parseInt(row.views),
      })),
      viewsByDay: viewsByDay.rows.map((row) => ({
        day: row.day,
        views: parseInt(row.views),
      })),
    };

    res.json({
      success: true,
      data: {
        analytics,
      },
    });
  } catch (error) {
    logger.error("Get organization analytics error:", error);
    res.status(500).json({
      error: "Failed to get organization analytics",
      code: "GET_ORGANIZATION_ANALYTICS_ERROR",
    });
  }
});

/**
 * @route POST /api/v1/analytics/record-view
 * @desc Record a document view (used by document viewer)
 * @access Public
 */
router.post("/record-view", async (req, res) => {
  try {
    const {
      documentId,
      linkId,
      ipAddress,
      userAgent,
      referrer,
      timeOnPage,
      pagesViewed,
      interactions,
    } = req.body;

    // Validate required fields
    if (!documentId || !ipAddress || !userAgent) {
      return res.status(400).json({
        error: "Missing required fields",
        code: "MISSING_FIELDS",
      });
    }

    // Check if document exists and is accessible
    const documentResult = await query(
      "SELECT id, is_public FROM documents WHERE id = $1 AND is_archived = false",
      [documentId]
    );

    if (documentResult.rows.length === 0) {
      return res.status(404).json({
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // If document is not public, check if user has access via link
    if (!documentResult.rows[0].is_public && linkId) {
      const linkResult = await query(
        "SELECT id FROM document_links WHERE id = $1 AND is_active = true",
        [linkId]
      );

      if (linkResult.rows.length === 0) {
        return res.status(403).json({
          error: "Access denied",
          code: "ACCESS_DENIED",
        });
      }
    }

    // Record the view
    const viewData = {
      id: require("uuid").v4(),
      documentId,
      linkId: linkId || null,
      ipAddress,
      userAgent,
      referrer: referrer || null,
      timeOnPage: timeOnPage || 0,
      pagesViewed: pagesViewed || [],
      interactions: interactions || [],
      deviceType: "unknown", // Would be determined by user agent parsing
      browser: "unknown",
      os: "unknown",
      timestamp: new Date(),
    };

    await query(
      `
      INSERT INTO document_views (
        id, document_id, link_id, ip_address, user_agent, referrer,
        time_on_page, pages_viewed, interactions, device_type, browser, os,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        viewData.id,
        viewData.documentId,
        viewData.linkId,
        viewData.ipAddress,
        viewData.userAgent,
        viewData.referrer,
        viewData.timeOnPage,
        viewData.pagesViewed,
        viewData.interactions,
        viewData.deviceType,
        viewData.browser,
        viewData.os,
        viewData.timestamp,
      ]
    );

    // Update link view count if applicable
    if (linkId) {
      await query(
        "UPDATE document_links SET current_views = current_views + 1 WHERE id = $1",
        [linkId]
      );
    }

    logger.info("Document view recorded", {
      documentId,
      linkId,
      ipAddress,
    });

    res.json({
      success: true,
      message: "View recorded successfully",
    });
  } catch (error) {
    logger.error("Record view error:", error);
    res.status(500).json({
      error: "Failed to record view",
      code: "RECORD_VIEW_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/analytics/realtime
 * @desc Get real-time analytics for the organization
 * @access Private
 */
router.get("/realtime", authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Get current viewers and recent activity
    const [currentViewers, recentViews] = await Promise.all([
      // Current viewers (active in last 5 minutes)
      query(
        `
        SELECT COUNT(DISTINCT ip_address) 
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.organization_id = $1 AND dv.created_at >= $2
        `,
        [req.user.organizationId, fiveMinutesAgo]
      ),
      // Recent views
      query(
        `
        SELECT dv.*, d.title as document_title
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.organization_id = $1 AND dv.created_at >= $2
        ORDER BY dv.created_at DESC
        LIMIT 20
        `,
        [req.user.organizationId, fiveMinutesAgo]
      ),
    ]);

    const realtimeData = {
      currentViewers: parseInt(currentViewers.rows[0].count),
      recentViews: recentViews.rows.map((row) => ({
        id: row.id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.created_at,
      })),
      lastUpdated: now,
    };

    res.json({
      success: true,
      data: {
        realtime: realtimeData,
      },
    });
  } catch (error) {
    logger.error("Get realtime analytics error:", error);
    res.status(500).json({
      error: "Failed to get realtime analytics",
      code: "GET_REALTIME_ANALYTICS_ERROR",
    });
  }
});

export default router;
