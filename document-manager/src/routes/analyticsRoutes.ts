import { Router, Request, Response } from "express";
import { body, param, query } from "express-validator";
import { requireSubscription } from "@/middleware/auth";
import { validationErrorHandler } from "@/middleware/errorHandler";
import { logger } from "@/utils/logger";
import { documentSharingIntegration } from "@/services/documentSharingIntegration";

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = require("express-validator").validationResult(req);
  if (!errors.isEmpty()) {
    throw validationErrorHandler(errors.array());
  }
  next();
};

// ===== ANALYTICS INTEGRATION =====
// Note: Detailed analytics are handled by document-sharing-service
// This service provides basic integration and redirects

// Get analytics service status
router.get(
  "/status",
  requireSubscription(["free", "pro", "enterprise"]),
  async (req: Request, res: Response) => {
    try {
      // Check if document-sharing-service is available
      const isHealthy = await documentSharingIntegration.checkServiceHealth();
      const config = documentSharingIntegration.getConfig();
      
      res.json({
        success: true,
        message: "Analytics service integration",
        data: {
          service: "document-sharing-service",
          status: isHealthy ? "available" : "unavailable",
          url: config.baseURL,
          health: isHealthy,
          note: "Detailed analytics are handled by the dedicated analytics service"
        }
      });
    } catch (error) {
      logger.error('Error checking analytics service status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check analytics service status',
        code: 'ANALYTICS_SERVICE_ERROR'
      });
    }
  }
);

// Redirect to document-sharing-service for detailed analytics
router.get(
  "/redirect/:documentId",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    query("type").optional().isIn(["views", "downloads", "engagement", "heatmap"]).withMessage("Invalid analytics type"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  async (req: Request, res: Response) => {
    try {
      const documentId = req.params.documentId;
      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
          code: 'MISSING_DOCUMENT_ID'
        });
      }
      
      const type = (req.query.type as string) || "views";
      
      const redirect = await documentSharingIntegration.redirectToAnalytics(documentId, type);
      
      res.json({
        success: true,
        message: "Redirecting to analytics service",
        data: redirect,
        note: "Use this URL to access detailed analytics from document-sharing-service"
      });
    } catch (error) {
      logger.error('Error generating analytics redirect:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate analytics redirect',
        code: 'ANALYTICS_REDIRECT_ERROR'
      });
    }
  }
);

// Get basic document stats (minimal - detailed stats in document-sharing-service)
router.get(
  "/documents/:documentId/basic",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      
      // Return basic stats only - detailed analytics are in document-sharing-service
      res.json({
        success: true,
        message: "Basic document statistics",
        data: {
          documentId,
          note: "Detailed analytics available in document-sharing-service",
          basicStats: {
            hasAnalytics: true,
            serviceUrl: process.env.DOCUMENT_SHARING_SERVICE_URL || 'http://localhost:3003'
          }
        }
      });
    } catch (error) {
      logger.error('Error getting basic document stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get basic document stats',
        code: 'BASIC_STATS_ERROR'
      });
    }
  }
);

export default router;
