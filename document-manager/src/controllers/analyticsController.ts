import { Request, Response } from "express";
import { query } from "@/config/database";
import { cache } from "@/config/redis";
import { createError, asyncHandler } from "@/middleware/errorHandler";
import { logger, logAnalytics } from "@/utils/logger";

// Get user analytics dashboard
export const getUserAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      period = "30d",
      includeDocuments = true,
      includeLinks = true,
      includeCollaboration = true,
    } = req.query;

    try {
      // Get basic user stats
      const userStats = await query(
        `
      SELECT 
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(DISTINCT dl.id) as total_links,
        SUM(d.file_size) as total_storage,
        MAX(d.created_at) as last_upload
      FROM users u
      LEFT JOIN documents d ON u.id = d.user_id AND d.status = 'active'
      LEFT JOIN document_links dl ON u.id = dl.user_id AND dl.is_active = true
      WHERE u.id = $1
    `,
        [userId]
      );

      // Get document analytics for the period
      let documentAnalytics = null;
      if (includeDocuments === "true") {
        const periodFilter =
          period === "all"
            ? ""
            : `AND d.created_at >= NOW() - INTERVAL '${period}'`;
        documentAnalytics = await query(
          `
        SELECT 
          d.id,
          d.title,
          d.file_name,
          d.created_at,
          d.file_size,
          COUNT(dv.id) as views,
          COUNT(dd.id) as downloads
        FROM documents d
        LEFT JOIN document_views dv ON d.id = dv.document_id
        LEFT JOIN document_downloads dd ON d.id = dd.document_id
        WHERE d.user_id = $1 AND d.status = 'active' ${periodFilter}
        GROUP BY d.id, d.title, d.file_name, d.created_at, d.file_size
        ORDER BY d.created_at DESC
        LIMIT 10
      `,
          [userId]
        );
      }

      // Get link analytics for the period
      let linkAnalytics = null;
      if (includeLinks === "true") {
        const periodFilter =
          period === "all"
            ? ""
            : `AND dl.created_at >= NOW() - INTERVAL '${period}'`;
        linkAnalytics = await query(
          `
        SELECT 
          dl.id,
          dl.name,
          dl.slug,
          dl.created_at,
          dl.current_views,
          dl.max_views,
          d.title as document_title
        FROM document_links dl
        JOIN documents d ON dl.document_id = d.id
        WHERE dl.user_id = $1 AND dl.is_active = true ${periodFilter}
        ORDER BY dl.created_at DESC
        LIMIT 10
      `,
          [userId]
        );
      }

      res.json({
        success: true,
        data: {
          period,
          userStats: userStats.rows[0],
          documentAnalytics: documentAnalytics?.rows || [],
          linkAnalytics: linkAnalytics?.rows || [],
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Error fetching user analytics:", error);
      throw createError(
        "Failed to fetch analytics",
        500,
        "ANALYTICS_FETCH_ERROR"
      );
    }
  }
);

// Get organization analytics (Enterprise only)
export const getOrganizationAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      organizationId,
      period = "30d",
      includeUsers = true,
      includeDepartments = true,
      includeProjects = true,
    } = req.query;

    // Verify user has access to organization
    const orgAccess = await query(
      `
    SELECT role FROM organization_members 
    WHERE user_id = $1 AND organization_id = $2 AND role IN ('owner', 'admin')
  `,
      [userId, organizationId]
    );

    if (orgAccess.rows.length === 0) {
      throw createError(
        "Access denied to organization",
        403,
        "ORGANIZATION_ACCESS_DENIED"
      );
    }

    try {
      // Get organization stats
      const orgStats = await query(
        `
      SELECT 
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(DISTINCT u.id) as total_members,
        SUM(d.file_size) as total_storage,
        MAX(d.created_at) as last_activity
      FROM organizations o
      LEFT JOIN documents d ON o.id = d.organization_id AND d.status = 'active'
      LEFT JOIN organization_members om ON o.id = om.organization_id
      LEFT JOIN users u ON om.user_id = u.id
      WHERE o.id = $1
    `,
        [organizationId]
      );

      res.json({
        success: true,
        data: {
          organizationId,
          period,
          organizationStats: orgStats.rows[0],
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Error fetching organization analytics:", error);
      throw createError(
        "Failed to fetch organization analytics",
        500,
        "ORG_ANALYTICS_FETCH_ERROR"
      );
    }
  }
);

// Get document performance metrics
export const getDocumentPerformanceMetrics = asyncHandler(
  async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const {
      period = "30d",
      includeHeatmap = false,
      includeUserJourney = false,
      includeEngagement = false,
    } = req.query;
    const userId = req.user!.id;

    // Verify document access
    const documentAccess = await query(
      `
    SELECT id FROM documents
    WHERE id = $1 AND (
      user_id = $2 OR 
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = $2
      )
    )
  `,
      [documentId, userId]
    );

    if (documentAccess.rows.length === 0) {
      throw createError(
        "Document not found or access denied",
        404,
        "DOCUMENT_NOT_FOUND"
      );
    }

    try {
      // Get basic performance metrics
      const periodFilter =
        period === "all"
          ? ""
          : `AND dv.created_at >= NOW() - INTERVAL '${period}'`;
      const performanceMetrics = await query(
        `
      SELECT 
        COUNT(dv.id) as total_views,
        COUNT(DISTINCT dv.visitor_id) as unique_visitors,
        COUNT(DISTINCT dv.ip_address) as unique_ips,
        COUNT(dd.id) as total_downloads,
        AVG(EXTRACT(EPOCH FROM (dv.updated_at - dv.created_at))) as avg_session_duration
      FROM documents d
      LEFT JOIN document_views dv ON d.id = dv.document_id ${periodFilter}
      LEFT JOIN document_downloads dd ON d.id = dd.document_id ${periodFilter}
      WHERE d.id = $1
    `,
        [documentId]
      );

      res.json({
        success: true,
        data: {
          documentId,
          period,
          performanceMetrics: performanceMetrics.rows[0],
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Error fetching document performance metrics:", error);
      throw createError(
        "Failed to fetch performance metrics",
        500,
        "PERFORMANCE_METRICS_FETCH_ERROR"
      );
    }
  }
);

// Placeholder implementations for other analytics functions
export const getRealTimeAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Real-time analytics endpoint - to be implemented",
    });
  }
);

export const getPredictiveAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Predictive analytics endpoint - to be implemented",
    });
  }
);

export const getEngagementInsights = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Engagement insights endpoint - to be implemented",
    });
  }
);

export const getConversionAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Conversion analytics endpoint - to be implemented",
    });
  }
);

export const getSecurityAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Security analytics endpoint - to be implemented",
    });
  }
);

export const getComplianceReport = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Compliance report endpoint - to be implemented",
    });
  }
);

export const getCustomReport = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Custom report endpoint - to be implemented",
    });
  }
);

export const exportAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Export analytics endpoint - to be implemented",
    });
  }
);

export const getHeatmapData = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Heatmap data endpoint - to be implemented",
    });
  }
);

export const getAIPoweredInsights = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "AI-powered insights endpoint - to be implemented",
    });
  }
);

export const getTrendAnalysis = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Trend analysis endpoint - to be implemented",
    });
  }
);

export const getBenchmarkComparison = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Benchmark comparison endpoint - to be implemented",
    });
  }
);

export const getROIAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "ROI analytics endpoint - to be implemented",
    });
  }
);
