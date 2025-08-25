import { Router } from "express";
import { WebhookController } from "../controllers/webhookController";
import { authMiddleware, requireSubscription } from "../middleware/auth";

const router = Router();
const webhookController = new WebhookController();

// Apply authentication to all routes
router.use(authMiddleware);

// Webhook management
router.get(
  "/",
  requireSubscription(["pro", "enterprise"]),
  webhookController.getWebhooks.bind(webhookController)
);
router.post(
  "/",
  requireSubscription(["pro", "enterprise"]),
  webhookController.createWebhook.bind(webhookController)
);
router.get(
  "/:id",
  requireSubscription(["pro", "enterprise"]),
  webhookController.getWebhook.bind(webhookController)
);
router.put(
  "/:id",
  requireSubscription(["pro", "enterprise"]),
  webhookController.updateWebhook.bind(webhookController)
);
router.delete(
  "/:id",
  requireSubscription(["pro", "enterprise"]),
  webhookController.deleteWebhook.bind(webhookController)
);

// Webhook testing
router.post(
  "/:id/test",
  requireSubscription(["pro", "enterprise"]),
  webhookController.testWebhook.bind(webhookController)
);

// Webhook events
router.get(
  "/:id/events",
  requireSubscription(["pro", "enterprise"]),
  webhookController.getWebhookEvents.bind(webhookController)
);

export default router;
