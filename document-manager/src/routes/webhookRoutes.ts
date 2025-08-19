import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const webhookController = new WebhookController();

// Apply authentication middleware to all webhook routes
router.use(authMiddleware);

// Webhook CRUD operations
router.post('/', webhookController.createWebhook.bind(webhookController));
router.get('/:id', webhookController.getWebhook.bind(webhookController));
router.put('/:id', webhookController.updateWebhook.bind(webhookController));
router.delete('/:id', webhookController.deleteWebhook.bind(webhookController));

// Webhook management
router.get('/', webhookController.listWebhooks.bind(webhookController));
router.post('/:id/test', webhookController.testWebhook.bind(webhookController));
router.get('/:id/history', webhookController.getWebhookHistory.bind(webhookController));

export default router;