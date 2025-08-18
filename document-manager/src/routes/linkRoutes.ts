import { Router, Request, Response } from "express";
import { body, param, query } from "express-validator";
import { requireDocumentAccess, requireSubscription } from "@/middleware/auth";
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

// ===== DOCUMENT SHARING INTEGRATION =====
// Note: Document sharing is handled by document-sharing-service
// This service provides integration and redirects

// Get sharing service status
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
        message: "Document sharing service integration",
        data: {
          service: "document-sharing-service",
          status: isHealthy ? "available" : "unavailable",
          url: config.baseURL,
          health: isHealthy,
          note: "Document sharing is handled by the dedicated sharing service",
        },
      });
    } catch (error) {
      logger.error("Error checking sharing service status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check sharing service status",
        code: "SHARING_SERVICE_ERROR",
      });
    }
  }
);

// Redirect to document-sharing-service for link creation
router.post(
  "/redirect/create",
  [
    body("documentId").isUUID().withMessage("Document ID is required"),
    body("options").optional().isObject().withMessage("Options must be object"),
  ],
  validateRequest,
  requireSubscription(["free", "pro", "enterprise"]),
  async (req: Request, res: Response) => {
    try {
      const { documentId, options } = req.body;

      const redirect = await documentSharingIntegration.redirectToSharing(
        documentId,
        options
      );

      res.json({
        success: true,
        message: "Redirecting to sharing service",
        data: {
          ...redirect,
          method: "POST",
          note: "Use this URL to create shareable links via document-sharing-service",
        },
      });
    } catch (error) {
      logger.error("Error generating sharing redirect:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate sharing redirect",
        code: "SHARING_REDIRECT_ERROR",
      });
    }
  }
);

// Redirect to document-sharing-service for link management
router.get(
  "/redirect/:documentId",
  [param("documentId").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireSubscription(["free", "pro", "enterprise"]),
  async (req: Request, res: Response) => {
    try {
      const documentId = req.params.documentId;
      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: "Document ID is required",
          code: "MISSING_DOCUMENT_ID",
        });
      }

      const redirect =
        await documentSharingIntegration.redirectToLinkManagement(documentId);

      res.json({
        success: true,
        message: "Redirecting to sharing service",
        data: {
          ...redirect,
          method: "GET",
          note: "Use this URL to manage document links via document-sharing-service",
        },
      });
    } catch (error) {
      logger.error("Error generating link management redirect:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate link management redirect",
        code: "LINK_REDIRECT_ERROR",
      });
    }
  }
);

// Get basic sharing info (minimal - detailed info in document-sharing-service)
router.get(
  "/:documentId/basic",
  [param("documentId").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["free", "pro", "enterprise"]),
  async (req: Request, res: Response) => {
    try {
      const documentId = req.params.documentId;
      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: "Document ID is required",
          code: "MISSING_DOCUMENT_ID",
        });
      }

      // Try to get basic sharing info from document-sharing-service
      const basicInfo =
        await documentSharingIntegration.getBasicSharingInfo(documentId);

      res.json({
        success: true,
        message: "Basic document sharing information",
        data: {
          documentId,
          ...basicInfo.data,
          note: "Detailed sharing information available in document-sharing-service",
        },
      });
    } catch (error) {
      logger.error("Error getting basic sharing info:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get basic sharing info",
        code: "BASIC_SHARING_ERROR",
      });
    }
  }
);

export default router;
