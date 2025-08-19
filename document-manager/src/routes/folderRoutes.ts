import { Router } from 'express';
import { FolderController } from '../controllers/folderController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const folderController = new FolderController();

// Apply authentication middleware to all folder routes
router.use(authMiddleware);

// Folder CRUD operations
router.post('/', folderController.createFolder.bind(folderController));
router.get('/:id', folderController.getFolder.bind(folderController));
router.put('/:id', folderController.updateFolder.bind(folderController));
router.delete('/:id', folderController.deleteFolder.bind(folderController));

// Folder hierarchy and navigation
router.get('/tree/overview', folderController.getFolderTree.bind(folderController));
router.get('/:id/contents', folderController.getFolderContents.bind(folderController));
router.get('/:id/stats', folderController.getFolderStats.bind(folderController));

export default router;



