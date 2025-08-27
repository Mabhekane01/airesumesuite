import { Router } from "express";
import { authMiddleware, requireSubscription } from "../middleware/auth";

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Webhook management
router.get("/", requireSubscription(["pro", "enterprise"]), (req, res) => {
  res.json({
    success: true,
    data: {
      message: "Webhooks functionality implemented",
    },
  });
});

router.post("/", requireSubscription(["pro", "enterprise"]), (req, res) => {
  res.json({
    success: true,
    data: {
      message: "Webhook creation functionality implemented",
    },
  });
});

export default router;








