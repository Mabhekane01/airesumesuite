import { Router } from "express";
import { FolderController } from "../controllers/folderController";
import { authMiddleware, requireSubscription } from "../middleware/auth";

const router = Router();
const folderController = new FolderController();

// Apply authentication to all routes
router.use(authMiddleware);

// Folder CRUD operations
router.get(
  "/",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.getFolders.bind(folderController)
);
router.get(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.getFolder.bind(folderController)
);
router.post(
  "/",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.createFolder.bind(folderController)
);
router.put(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.updateFolder.bind(folderController)
);
router.delete(
  "/:id",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.deleteFolder.bind(folderController)
);

// Folder operations
router.post(
  "/:id/documents",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.addDocumentToFolder.bind(folderController)
);
router.delete(
  "/:id/documents/:documentId",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.removeDocumentFromFolder.bind(folderController)
);
router.post(
  "/:id/move",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.moveFolder.bind(folderController)
);
router.post(
  "/:id/duplicate",
  requireSubscription(["free", "pro", "enterprise"]),
  folderController.duplicateFolder.bind(folderController)
);

export default router;
