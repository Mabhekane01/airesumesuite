import { Router } from "express";
import { shareController } from "../controllers/shareController";
import { authMiddleware, requireSubscription } from "../middleware/auth";

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Share management
router.get(
  "/",
  requireSubscription(["free", "pro", "enterprise"]),
  shareController.getUserShares
);

router.post(
  "/",
  requireSubscription(["free", "pro", "enterprise"]),
  shareController.createShare
);

router.get(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  shareController.getShare
);

router.put(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  shareController.updateShare
);

router.delete(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  shareController.deleteShare
);

// Share operations
router.post(
  "/:id/duplicate",
  requireSubscription(["free", "pro", "enterprise"]),
  shareController.duplicateShare
);

router.post(
  "/:id/archive",
  requireSubscription(["free", "pro", "enterprise"]),
  shareController.archiveShare
);

router.post(
  "/:id/restore",
  requireSubscription(["free", "pro", "enterprise"]),
  shareController.restoreShare
);

// Share analytics
router.get(
  "/:id/analytics",
  requireSubscription(["pro", "enterprise"]),
  shareController.getShareAnalytics
);

router.get(
  "/:id/views",
  requireSubscription(["pro", "enterprise"]),
  shareController.getShareViews
);

router.get(
  "/:id/downloads",
  requireSubscription(["pro", "enterprise"]),
  shareController.getShareDownloads
);

// Bulk operations
router.post(
  "/bulk/delete",
  requireSubscription(["pro", "enterprise"]),
  shareController.bulkDeleteShares
);

router.post(
  "/bulk/archive",
  requireSubscription(["pro", "enterprise"]),
  shareController.bulkArchiveShares
);

export default router;
