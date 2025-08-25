import { Router } from "express";
import { DocumentController } from "../controllers/documentController";
import { authMiddleware, requireSubscription } from "../middleware/auth";
import { upload, handleUploadError } from "../middleware/upload";

const router = Router();
const documentController = new DocumentController();

// Apply authentication to all routes
router.use(authMiddleware);

// Document CRUD operations
router.get(
  "/",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.getDocuments.bind(documentController)
);
router.get(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.getDocument.bind(documentController)
);
router.post(
  "/",
  requireSubscription(["free", "pro", "enterprise"]),
  upload.single("file"),
  documentController.uploadDocument.bind(documentController)
);
router.put(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.updateDocument.bind(documentController)
);
router.delete(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.deleteDocument.bind(documentController)
);

// Document operations
router.post(
  "/:id/duplicate",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.duplicateDocument.bind(documentController)
);
router.post(
  "/:id/archive",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.archiveDocument.bind(documentController)
);
router.post(
  "/:id/restore",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.restoreDocument.bind(documentController)
);
router.post(
  "/:id/favorite",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.toggleFavorite.bind(documentController)
);

// Document processing
router.get(
  "/:id/preview",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.getDocumentPreview.bind(documentController)
);
router.get(
  "/:id/thumbnail",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.getDocumentThumbnail.bind(documentController)
);
router.get(
  "/:id/download",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.downloadDocument.bind(documentController)
);

// Document search and filtering
router.get(
  "/search",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.searchDocuments.bind(documentController)
);
router.get(
  "/recent",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.getRecentDocuments.bind(documentController)
);
router.get(
  "/favorites",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.getFavoriteDocuments.bind(documentController)
);

// Bulk operations
router.post(
  "/bulk/delete",
  requireSubscription(["pro", "enterprise"]),
  documentController.bulkDeleteDocuments.bind(documentController)
);
router.post(
  "/bulk/move",
  requireSubscription(["pro", "enterprise"]),
  documentController.bulkMoveDocuments.bind(documentController)
);
router.post(
  "/bulk/archive",
  requireSubscription(["pro", "enterprise"]),
  documentController.bulkArchiveDocuments.bind(documentController)
);

// Integration endpoints
router.post(
  "/from-ai-resume",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.createFromAIResume.bind(documentController)
);
router.post(
  "/from-pdf-editor",
  requireSubscription(["free", "pro", "enterprise"]),
  documentController.createFromPDFEditor.bind(documentController)
);

// Handle upload errors
router.use(handleUploadError);

export default router;
