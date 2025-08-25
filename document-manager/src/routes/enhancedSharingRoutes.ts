import { Router } from 'express';
import { EnhancedSharingController } from '../controllers/enhancedSharingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new EnhancedSharingController();

// Public endpoints (no authentication required)
router.get('/view/:slug', controller.getShareableLinkBySlug);
router.post('/view/:linkId/record', controller.recordDocumentView);
router.post('/page/:documentViewId/record', controller.recordPageView);
router.post('/download/record', controller.recordDocumentDownload);

// Protected endpoints (authentication required)
router.use(authMiddleware);

// Shareable links management
router.post('/links', controller.createShareableLink);
router.get('/links', controller.getUserShareableLinks);
router.get('/links/:id', controller.getLinkAnalytics);
router.put('/links/:id', controller.updateShareableLink);
router.delete('/links/:id', controller.deleteShareableLink);

// Data rooms management
router.post('/data-rooms', controller.createDataRoom);
router.get('/data-rooms', controller.getUserDataRooms);
router.post('/data-rooms/:dataRoomId/documents', controller.addDocumentToDataRoom);

// Analytics and insights
router.get('/documents/:documentId/insights', controller.getDocumentInsights);
router.get('/links/:linkId/analytics', controller.getLinkAnalytics);
router.get('/links/:linkId/visitors', controller.getLinkVisitors);
router.get('/links/:linkId/email-captures', controller.getLinkEmailCaptures);
router.get('/links/:linkId/real-time', controller.getRealTimeViewers);
router.get('/documents/:documentId/heatmap/:pageNumber', controller.getHeatmapData);

// QR codes and exports
router.post('/links/:linkId/qr-code', controller.generateQRCode);
router.post('/analytics/export', controller.exportAnalytics);

// Webhooks
router.post('/links/:linkId/webhook', controller.setupWebhook);
router.get('/links/:linkId/webhook', controller.getWebhookConfig);
router.post('/links/:linkId/webhook/test', controller.testWebhook);

export default router;
