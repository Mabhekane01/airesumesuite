import { Router, Request, Response } from "express";
import { param, query } from "express-validator";
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

// ===== PUBLIC DOCUMENT VIEWING INTEGRATION =====
// Note: Public document viewing is handled by document-sharing-service
// This service provides integration and redirects

// Get public viewing service status
router.get(
  "/status",
  async (req: Request, res: Response) => {
    try {
      // Check if document-sharing-service is available
      const isHealthy = await documentSharingIntegration.checkServiceHealth();
      const config = documentSharingIntegration.getConfig();
      
      res.json({
        success: true,
        message: "Public document viewing service integration",
        data: {
          service: "document-sharing-service",
          status: isHealthy ? "available" : "unavailable",
          url: config.baseURL,
          health: isHealthy,
          note: "Public document viewing is handled by the dedicated viewing service"
        }
      });
    } catch (error) {
      logger.error('Error checking viewing service status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check viewing service status',
        code: 'VIEWING_SERVICE_ERROR'
      });
    }
  }
);

// Redirect to document-sharing-service for public document viewing
router.get(
  "/view/:slug",
  [
    param("slug").isString().withMessage("Document slug is required"),
    query("password").optional().isString().withMessage("Password must be string"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      if (!slug) {
        return res.status(400).json({
          success: false,
          message: 'Document slug is required',
          code: 'MISSING_SLUG'
        });
      }
      
      const password = req.query.password as string;
      const redirect = await documentSharingIntegration.redirectToViewing(slug, password);
      
      res.json({
        success: true,
        message: "Redirecting to viewing service",
        data: {
          ...redirect,
          method: "GET",
          note: "Use this URL to view the document via document-sharing-service"
        }
      });
    } catch (error) {
      logger.error('Error generating viewing redirect:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate viewing redirect',
        code: 'VIEWING_REDIRECT_ERROR'
      });
    }
  }
);

// Redirect to document-sharing-service for short URL format
router.get(
  "/d/:slug",
  [
    param("slug").isString().withMessage("Document slug is required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      if (!slug) {
        return res.status(400).json({
          success: false,
          message: 'Document slug is required',
          code: 'MISSING_SLUG'
        });
      }
      
      const redirect = await documentSharingIntegration.redirectToShortUrl(slug);
      
      res.json({
        success: true,
        message: "Redirecting to viewing service",
        data: {
          ...redirect,
          method: "GET",
          note: "Use this URL to view the document via document-sharing-service (short format)"
        }
      });
    } catch (error) {
      logger.error('Error generating short URL redirect:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate short URL redirect',
        code: 'SHORT_URL_REDIRECT_ERROR'
      });
    }
  }
);

// Get basic viewing info (minimal - detailed info in document-sharing-service)
router.get(
  "/info/:slug",
  [
    param("slug").isString().withMessage("Document slug is required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      if (!slug) {
        return res.status(400).json({
          success: false,
          message: 'Document slug is required',
          code: 'MISSING_SLUG'
        });
      }
      
      // Try to get basic viewing info from document-sharing-service
      const basicInfo = await documentSharingIntegration.getBasicViewingInfo(slug);
      
      res.json({
        success: true,
        message: "Basic document viewing information",
        data: {
          slug,
          ...basicInfo.data,
          note: "Detailed viewing information available in document-sharing-service"
        }
      });
    } catch (error) {
      logger.error('Error getting basic viewing info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get basic viewing info',
        code: 'BASIC_VIEWING_ERROR'
      });
    }
  }
);

export default router;