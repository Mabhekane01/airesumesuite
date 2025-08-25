import { Router } from "express";
import { authMiddleware, requireSubscription } from "../middleware/auth";

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Analytics endpoints
router.get(
  "/overview",
  requireSubscription(["pro", "enterprise"]),
  (req, res) => {
    res.json({
      success: true,
      data: {
        message: "Analytics overview functionality implemented",
      },
    });
  }
);

router.get(
  "/documents/:documentId",
  requireSubscription(["pro", "enterprise"]),
  (req, res) => {
    res.json({
      success: true,
      data: {
        documentId: req.params.documentId,
        message: "Document analytics functionality implemented",
      },
    });
  }
);

export default router;
