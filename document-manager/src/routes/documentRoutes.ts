import { Router } from 'express';
import { DocumentController } from '../controllers/documentController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
const documentController = new DocumentController();

// Apply authentication middleware to all document routes
router.use(authMiddleware);

// Document CRUD operations
router.post('/', upload.single('file'), documentController.uploadDocument.bind(documentController));
router.get('/:id', documentController.getDocument.bind(documentController));
router.put('/:id', documentController.updateDocument.bind(documentController));
router.delete('/:id', documentController.deleteDocument.bind(documentController));

// Document search and listing
router.get('/', documentController.searchDocuments.bind(documentController));

// Document operations
router.put('/:id/move', documentController.moveDocument.bind(documentController));
router.get('/:id/download', documentController.downloadDocument.bind(documentController));

// Document statistics
router.get('/stats/overview', documentController.getDocumentStats.bind(documentController));

// Share link management
router.post('/:id/share', documentController.createShareLink.bind(documentController));

export default router;
