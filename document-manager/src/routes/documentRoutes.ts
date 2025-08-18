import { Router } from "express";
import { body, param, query } from "express-validator";
import { uploadMiddleware } from "@/services/documentUploadService";
import { requireDocumentAccess, requireSubscription } from "@/middleware/auth";
import { validationErrorHandler } from "@/middleware/errorHandler";
import {
  // Core document operations
  uploadDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,

  // Document processing
  generateDocumentPreview,
  optimizeDocument,
  extractDocumentText,

  // Document management
  moveDocument,
  copyDocument,
  archiveDocument,
  restoreDocument,

  // Version control
  getDocumentVersions,
  createDocumentVersion,
  restoreDocumentVersion,

  // Document metadata
  updateDocumentMetadata,
  addDocumentTags,
  removeDocumentTags,
  getDocumentTags,

  // Document search
  searchDocuments,
  getDocumentSuggestions,

  // Bulk operations
  bulkUpdateDocuments,
  bulkDeleteDocuments,
  bulkMoveDocuments,

  // Export operations
  exportDocuments,
  generateDocumentReport,

  // Document collaboration
  getDocumentCollaborators,
  addDocumentCollaborator,
  removeDocumentCollaborator,
  updateCollaboratorPermissions,

  // Document comments
  getDocumentComments,
  addDocumentComment,
  updateDocumentComment,
  deleteDocumentComment,

  // Document workflow
  getDocumentWorkflow,
  updateDocumentWorkflow,
  approveDocument,
  rejectDocument,

  // Document security
  getDocumentSecurityInfo,
  updateDocumentSecurity,
  auditDocumentAccess,

  // Document insights
  getDocumentInsights,
  getDocumentAnalytics,
  getDocumentRecommendations,
} from "@/controllers/documentController";

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = require("express-validator").validationResult(req);
  if (!errors.isEmpty()) {
    throw validationErrorHandler(errors.array());
  }
  next();
};

// ===== CORE DOCUMENT OPERATIONS =====

// Upload document
router.post(
  "/",
  uploadMiddleware.single("document"),
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Title is required (1-255 chars)"),
    body("description")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Description max 1000 chars"),
    body("folderId").optional().isUUID().withMessage("Invalid folder ID"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("metadata")
      .optional()
      .isObject()
      .withMessage("Metadata must be an object"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be boolean"),
    body("allowComments")
      .optional()
      .isBoolean()
      .withMessage("allowComments must be boolean"),
    body("allowCollaboration")
      .optional()
      .isBoolean()
      .withMessage("allowCollaboration must be boolean"),
  ],
  validateRequest,
  requireSubscription(["free", "pro", "enterprise"]),
  uploadDocument
);

// Get documents (with advanced filtering)
router.get(
  "/",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
    query("search").optional().isString().withMessage("Search must be string"),
    query("folderId").optional().isUUID().withMessage("Invalid folder ID"),
    query("tags").optional().isArray().withMessage("Tags must be array"),
    query("fileType")
      .optional()
      .isString()
      .withMessage("File type must be string"),
    query("dateFrom").optional().isISO8601().withMessage("Invalid date format"),
    query("dateTo").optional().isISO8601().withMessage("Invalid date format"),
    query("sizeFrom")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Size must be positive"),
    query("sizeTo")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Size must be positive"),
    query("status")
      .optional()
      .isIn(["active", "archived", "deleted"])
      .withMessage("Invalid status"),
    query("sortBy")
      .optional()
      .isIn(["name", "created_at", "updated_at", "file_size", "file_type"])
      .withMessage("Invalid sort field"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Sort order must be asc/desc"),
    query("includeArchived")
      .optional()
      .isBoolean()
      .withMessage("includeArchived must be boolean"),
    query("includeDeleted")
      .optional()
      .isBoolean()
      .withMessage("includeDeleted must be boolean"),
  ],
  validateRequest,
  requireSubscription(["free", "pro", "enterprise"]),
  getDocuments
);

// Get single document
router.get(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    query("includeVersions")
      .optional()
      .isBoolean()
      .withMessage("includeVersions must be boolean"),
    query("includeCollaborators")
      .optional()
      .isBoolean()
      .withMessage("includeCollaborators must be boolean"),
    query("includeComments")
      .optional()
      .isBoolean()
      .withMessage("includeComments must be boolean"),
    query("includeAnalytics")
      .optional()
      .isBoolean()
      .withMessage("includeAnalytics must be boolean"),
  ],
  validateRequest,
  requireDocumentAccess,
  getDocument
);

// Update document
router.put(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Title must be 1-255 chars"),
    body("description")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Description max 1000 chars"),
    body("folderId").optional().isUUID().withMessage("Invalid folder ID"),
    body("tags").optional().isArray().withMessage("Tags must be array"),
    body("metadata")
      .optional()
      .isObject()
      .withMessage("Metadata must be object"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be boolean"),
    body("allowComments")
      .optional()
      .isBoolean()
      .withMessage("allowComments must be boolean"),
    body("allowCollaboration")
      .optional()
      .isBoolean()
      .withMessage("allowCollaboration must be boolean"),
  ],
  validateRequest,
  requireDocumentAccess,
  updateDocument
);

// Delete document
router.delete(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    query("permanent")
      .optional()
      .isBoolean()
      .withMessage("permanent must be boolean"),
  ],
  validateRequest,
  requireDocumentAccess,
  deleteDocument
);

// ===== DOCUMENT PROCESSING =====

// Generate document preview
router.post(
  "/:id/preview",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("quality")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Quality must be low/medium/high"),
    body("format")
      .optional()
      .isIn(["png", "jpg", "webp"])
      .withMessage("Format must be png/jpg/webp"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  generateDocumentPreview
);

// Optimize document
router.post(
  "/:id/optimize",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("optimizationType")
      .isIn(["compress", "enhance", "convert"])
      .withMessage("Invalid optimization type"),
    body("options").optional().isObject().withMessage("Options must be object"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  optimizeDocument
);

// Extract document text
router.post(
  "/:id/extract-text",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("includeMetadata")
      .optional()
      .isBoolean()
      .withMessage("includeMetadata must be boolean"),
    body("language")
      .optional()
      .isString()
      .withMessage("Language must be string"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  extractDocumentText
);

// ===== DOCUMENT MANAGEMENT =====

// Move document
router.patch(
  "/:id/move",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("targetFolderId").isUUID().withMessage("Invalid target folder ID"),
  ],
  validateRequest,
  requireDocumentAccess,
  moveDocument
);

// Copy document
router.post(
  "/:id/copy",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("targetFolderId").isUUID().withMessage("Invalid target folder ID"),
    body("newName")
      .optional()
      .isString()
      .withMessage("New name must be string"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  copyDocument
);

// Archive document
router.patch(
  "/:id/archive",
  [param("id").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireDocumentAccess,
  archiveDocument
);

// Restore document
router.patch(
  "/:id/restore",
  [param("id").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireDocumentAccess,
  restoreDocument
);

// ===== VERSION CONTROL =====

// Get document versions
router.get(
  "/:id/versions",
  [param("id").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  getDocumentVersions
);

// Create document version
router.post(
  "/:id/versions",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("description")
      .optional()
      .isString()
      .withMessage("Description must be string"),
    body("tags").optional().isArray().withMessage("Tags must be array"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  createDocumentVersion
);

// Restore document version
router.post(
  "/:id/versions/:versionId/restore",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    param("versionId").isUUID().withMessage("Invalid version ID"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  restoreDocumentVersion
);

// ===== DOCUMENT METADATA =====

// Update document metadata
router.patch(
  "/:id/metadata",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("metadata").isObject().withMessage("Metadata must be object"),
  ],
  validateRequest,
  requireDocumentAccess,
  updateDocumentMetadata
);

// Add document tags
router.post(
  "/:id/tags",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("tags").isArray().withMessage("Tags must be array"),
  ],
  validateRequest,
  requireDocumentAccess,
  addDocumentTags
);

// Remove document tags
router.delete(
  "/:id/tags",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("tags").isArray().withMessage("Tags must be array"),
  ],
  validateRequest,
  requireDocumentAccess,
  removeDocumentTags
);

// Get document tags
router.get(
  "/:id/tags",
  [param("id").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireDocumentAccess,
  getDocumentTags
);

// ===== DOCUMENT SEARCH =====

// Search documents
router.post(
  "/search",
  [
    body("query").isString().withMessage("Search query is required"),
    body("filters").optional().isObject().withMessage("Filters must be object"),
    body("sortBy")
      .optional()
      .isString()
      .withMessage("Sort field must be string"),
    body("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Sort order must be asc/desc"),
    body("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be positive"),
    body("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
  ],
  validateRequest,
  requireSubscription(["free", "pro", "enterprise"]),
  searchDocuments
);

// Get document suggestions
router.get(
  "/suggestions",
  [
    query("query").isString().withMessage("Query is required"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage("Limit must be 1-20"),
  ],
  validateRequest,
  requireSubscription(["free", "pro", "enterprise"]),
  getDocumentSuggestions
);

// ===== BULK OPERATIONS =====

// Bulk update documents
router.patch(
  "/bulk",
  [
    body("documentIds").isArray().withMessage("Document IDs must be array"),
    body("updates").isObject().withMessage("Updates must be object"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  bulkUpdateDocuments
);

// Bulk delete documents
router.delete(
  "/bulk",
  [
    body("documentIds").isArray().withMessage("Document IDs must be array"),
    body("permanent")
      .optional()
      .isBoolean()
      .withMessage("permanent must be boolean"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  bulkDeleteDocuments
);

// Bulk move documents
router.patch(
  "/bulk/move",
  [
    body("documentIds").isArray().withMessage("Document IDs must be array"),
    body("targetFolderId").isUUID().withMessage("Invalid target folder ID"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  bulkMoveDocuments
);

// ===== EXPORT OPERATIONS =====

// Export documents
router.post(
  "/export",
  [
    body("documentIds").isArray().withMessage("Document IDs must be array"),
    body("format")
      .isIn(["csv", "json", "pdf", "zip"])
      .withMessage("Invalid export format"),
    body("includeMetadata")
      .optional()
      .isBoolean()
      .withMessage("includeMetadata must be boolean"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  exportDocuments
);

// Generate document report
router.post(
  "/:id/report",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("reportType")
      .isIn(["summary", "detailed", "analytics"])
      .withMessage("Invalid report type"),
    body("format")
      .optional()
      .isIn(["pdf", "html", "json"])
      .withMessage("Invalid format"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  generateDocumentReport
);

// ===== DOCUMENT COLLABORATION =====

// Get document collaborators
router.get(
  "/:id/collaborators",
  [param("id").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  getDocumentCollaborators
);

// Add document collaborator
router.post(
  "/:id/collaborators",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("email").isEmail().withMessage("Valid email required"),
    body("permissions").isArray().withMessage("Permissions must be array"),
    body("role").optional().isString().withMessage("Role must be string"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  addDocumentCollaborator
);

// Remove document collaborator
router.delete(
  "/:id/collaborators/:collaboratorId",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    param("collaboratorId").isUUID().withMessage("Invalid collaborator ID"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  removeDocumentCollaborator
);

// Update collaborator permissions
router.patch(
  "/:id/collaborators/:collaboratorId",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    param("collaboratorId").isUUID().withMessage("Invalid collaborator ID"),
    body("permissions").isArray().withMessage("Permissions must be array"),
    body("role").optional().isString().withMessage("Role must be string"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  updateCollaboratorPermissions
);

// ===== DOCUMENT COMMENTS =====

// Get document comments
router.get(
  "/:id/comments",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be positive"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be 1-50"),
  ],
  validateRequest,
  requireDocumentAccess,
  getDocumentComments
);

// Add document comment
router.post(
  "/:id/comments",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("content")
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Comment content required (1-1000 chars)"),
    body("parentCommentId")
      .optional()
      .isUUID()
      .withMessage("Invalid parent comment ID"),
  ],
  validateRequest,
  requireDocumentAccess,
  addDocumentComment
);

// Update document comment
router.put(
  "/:id/comments/:commentId",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    param("commentId").isUUID().withMessage("Invalid comment ID"),
    body("content")
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Comment content required (1-1000 chars)"),
  ],
  validateRequest,
  requireDocumentAccess,
  updateDocumentComment
);

// Delete document comment
router.delete(
  "/:id/comments/:commentId",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    param("commentId").isUUID().withMessage("Invalid comment ID"),
  ],
  validateRequest,
  requireDocumentAccess,
  deleteDocumentComment
);

// ===== DOCUMENT WORKFLOW =====

// Get document workflow
router.get(
  "/:id/workflow",
  [param("id").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["enterprise"]),
  getDocumentWorkflow
);

// Update document workflow
router.patch(
  "/:id/workflow",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("workflowId").isUUID().withMessage("Invalid workflow ID"),
    body("status").isString().withMessage("Status is required"),
    body("assignee").optional().isUUID().withMessage("Invalid assignee ID"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["enterprise"]),
  updateDocumentWorkflow
);

// Approve document
router.post(
  "/:id/approve",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("comment").optional().isString().withMessage("Comment must be string"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["enterprise"]),
  approveDocument
);

// Reject document
router.post(
  "/:id/reject",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("reason").isString().withMessage("Rejection reason required"),
    body("comment").optional().isString().withMessage("Comment must be string"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["enterprise"]),
  rejectDocument
);

// ===== DOCUMENT SECURITY =====

// Get document security info
router.get(
  "/:id/security",
  [param("id").isUUID().withMessage("Invalid document ID")],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  getDocumentSecurityInfo
);

// Update document security
router.patch(
  "/:id/security",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    body("encryption")
      .optional()
      .isBoolean()
      .withMessage("encryption must be boolean"),
    body("watermark")
      .optional()
      .isBoolean()
      .withMessage("watermark must be boolean"),
    body("accessControl")
      .optional()
      .isObject()
      .withMessage("accessControl must be object"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  updateDocumentSecurity
);

// Audit document access
router.get(
  "/:id/audit",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
    query("action").optional().isString().withMessage("Action must be string"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["enterprise"]),
  auditDocumentAccess
);

// ===== DOCUMENT INSIGHTS =====

// Get document insights
router.get(
  "/:id/insights",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    query("insightType")
      .optional()
      .isIn(["usage", "performance", "security", "compliance"])
      .withMessage("Invalid insight type"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  getDocumentInsights
);

// Get document analytics (basic - detailed analytics in document-sharing-service)
router.get(
  "/:id/analytics",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    query("period")
      .optional()
      .isIn(["7d", "30d", "90d", "1y"])
      .withMessage("Invalid period"),
    query("includeBasic")
      .optional()
      .isBoolean()
      .withMessage("includeBasic must be boolean"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  getDocumentAnalytics
);

// Get document recommendations
router.get(
  "/:id/recommendations",
  [
    param("id").isUUID().withMessage("Invalid document ID"),
    query("type")
      .optional()
      .isIn(["similar", "related", "improvement"])
      .withMessage("Invalid recommendation type"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("Limit must be 1-10"),
  ],
  validateRequest,
  requireDocumentAccess,
  requireSubscription(["pro", "enterprise"]),
  getDocumentRecommendations
);

export default router;
