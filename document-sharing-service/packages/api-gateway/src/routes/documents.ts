import { Router } from 'express';
import { DocumentController } from '../controllers/documentController';

const router = Router();
const documentController = new DocumentController();

router.get('/:id', documentController.getDocument.bind(documentController));

export default router;
