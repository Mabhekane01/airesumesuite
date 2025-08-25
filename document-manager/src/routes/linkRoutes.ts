import { Router } from "express";
import {
  createLink,
  getDocumentLinks,
  getLink,
  updateLink,
  deleteLink,
  getLinkAnalytics,
  generateQRCode,
} from "../controllers/linkController";
import { authMiddleware, requireSubscription } from "../middleware/auth";

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Link CRUD operations
router.get(
  "/",
  requireSubscription(["free", "pro", "enterprise"]),
  getDocumentLinks
);
router.get("/:id", requireSubscription(["free", "pro", "enterprise"]), getLink);
router.post(
  "/",
  requireSubscription(["free", "pro", "enterprise"]),
  createLink
);
router.put(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  updateLink
);
router.delete(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  deleteLink
);

// Link operations
router.get(
  "/:id/analytics",
  requireSubscription(["pro", "enterprise"]),
  getLinkAnalytics
);
router.get(
  "/:id/qr",
  requireSubscription(["free", "pro", "enterprise"]),
  generateQRCode
);

// Document-specific links
router.get(
  "/document/:documentId",
  requireSubscription(["free", "pro", "enterprise"]),
  getDocumentLinks
);

export default router;
