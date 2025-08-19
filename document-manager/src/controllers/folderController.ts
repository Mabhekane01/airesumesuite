import { Request, Response } from 'express';
import { FolderModel } from '../models/Folder';
import { DocumentModel } from '../models/Document';
import { logger } from '../utils/logger';

export class FolderController {
  private folderModel: FolderModel;
  private documentModel: DocumentModel;

  constructor() {
    this.folderModel = new FolderModel();
    this.documentModel = new DocumentModel();
  }

  /**
   * Create a new folder
   */
  async createFolder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { name, description, color, parentId } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Folder name is required'
        });
        return;
      }

      // Check if folder with same name already exists in the same parent
      const existingFolder = await this.folderModel.findByUserId(userId);
      const hasDuplicateName = existingFolder.some(folder => 
        folder.name === name && folder.parentId === (parentId || null)
      );

      if (hasDuplicateName) {
        res.status(409).json({
          success: false,
          message: 'A folder with this name already exists in the same location'
        });
        return;
      }

      // Validate parent folder exists and belongs to user
      if (parentId) {
        const parentFolder = await this.folderModel.findById(parentId);
        if (!parentFolder || parentFolder.userId !== userId) {
          res.status(404).json({
            success: false,
            message: 'Parent folder not found'
          });
          return;
        }
      }

      const folderData = {
        userId,
        name,
        description: description || null,
        color: color || '#3B82F6',
        parentId: parentId || null
      };

      const folder = await this.folderModel.create(folderData);

      logger.info('Folder created successfully', {
        userId,
        folderId: folder.id,
        folderName: folder.name,
        parentId: folder.parentId
      });

      res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        data: {
          folder: {
            id: folder.id,
            name: folder.name,
            description: folder.description,
            color: folder.color,
            parentId: folder.parentId,
            createdAt: folder.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Create folder error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating folder'
      });
    }
  }

  /**
   * Get folder by ID
   */
  async getFolder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
        return;
      }

      const folder = await this.folderModel.findById(id);

      if (!folder || folder.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
        return;
      }

      // Get folder contents (documents and subfolders)
      const documents = await this.documentModel.findByUserId(userId);
      const folderDocuments = documents.filter(doc => doc.folderId === id);

      const subfolders = await this.folderModel.findByUserId(userId);
      const folderSubfolders = subfolders.filter(subfolder => subfolder.parentId === id);

      res.status(200).json({
        success: true,
        data: {
          folder: {
            id: folder.id,
            name: folder.name,
            description: folder.description,
            color: folder.color,
            parentId: folder.parentId,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt
          },
          contents: {
            documents: folderDocuments.length,
            subfolders: folderSubfolders.length
          }
        }
      });
    } catch (error) {
      logger.error('Get folder error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        folderId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching folder'
      });
    }
  }

  /**
   * Get folder tree for user
   */
  async getFolderTree(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const folderTree = await this.folderModel.getFolderTree(userId);

      res.status(200).json({
        success: true,
        data: {
          folders: folderTree
        }
      });
    } catch (error) {
      logger.error('Get folder tree error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching folder tree'
      });
    }
  }

  /**
   * Update folder
   */
  async updateFolder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { name, description, color, parentId } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Folder name is required'
        });
        return;
      }

      // Check if folder exists and belongs to user
      const existingFolder = await this.folderModel.findById(id);
      if (!existingFolder || existingFolder.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
        return;
      }

      // Check if moving to a new parent would create a cycle
      if (parentId && parentId !== existingFolder.parentId) {
        const wouldCreateCycle = await this.folderModel.wouldCreateCycle(id, parentId);
        if (wouldCreateCycle) {
          res.status(400).json({
            success: false,
            message: 'Cannot move folder: would create a circular reference'
          });
          return;
        }

        // Validate new parent folder exists and belongs to user
        const newParentFolder = await this.folderModel.findById(parentId);
        if (!newParentFolder || newParentFolder.userId !== userId) {
          res.status(404).json({
            success: false,
            message: 'Parent folder not found'
          });
          return;
        }
      }

      // Check for duplicate names in the same parent
      const userFolders = await this.folderModel.findByUserId(userId);
      const hasDuplicateName = userFolders.some(folder => 
        folder.id !== id && 
        folder.name === name && 
        folder.parentId === (parentId || existingFolder.parentId)
      );

      if (hasDuplicateName) {
        res.status(409).json({
          success: false,
          message: 'A folder with this name already exists in the same location'
        });
        return;
      }

      const updateData = {
        name,
        description: description || null,
        color: color || existingFolder.color,
        parentId: parentId !== undefined ? parentId : existingFolder.parentId
      };

      const updatedFolder = await this.folderModel.update(id, updateData);

      logger.info('Folder updated successfully', {
        userId,
        folderId: id,
        folderName: updatedFolder.name
      });

      res.status(200).json({
        success: true,
        message: 'Folder updated successfully',
        data: {
          folder: {
            id: updatedFolder.id,
            name: updatedFolder.name,
            description: updatedFolder.description,
            color: updatedFolder.color,
            parentId: updatedFolder.parentId,
            updatedAt: updatedFolder.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Update folder error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        folderId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating folder'
      });
    }
  }

  /**
   * Delete folder
   */
  async deleteFolder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
        return;
      }

      // Check if folder exists and belongs to user
      const folder = await this.folderModel.findById(id);
      if (!folder || folder.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
        return;
      }

      // Get folder contents count
      const documentCounts = await this.folderModel.getDocumentCounts(id);
      const totalItems = documentCounts.documents + documentCounts.subfolders;

      if (totalItems > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete folder: contains ${totalItems} items. Please move or delete all contents first.`
        });
        return;
      }

      await this.folderModel.delete(id);

      logger.info('Folder deleted successfully', {
        userId,
        folderId: id,
        folderName: folder.name
      });

      res.status(200).json({
        success: true,
        message: 'Folder deleted successfully'
      });
    } catch (error) {
      logger.error('Delete folder error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        folderId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting folder'
      });
    }
  }

  /**
   * Get folder contents (documents and subfolders)
   */
  async getFolderContents(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
        return;
      }

      // Check if folder exists and belongs to user
      const folder = await this.folderModel.findById(id);
      if (!folder || folder.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
        return;
      }

      // Get documents in folder
      const documents = await this.documentModel.findByUserId(userId);
      const folderDocuments = documents.filter(doc => doc.folderId === id);

      // Get subfolders in folder
      const subfolders = await this.folderModel.findByUserId(userId);
      const folderSubfolders = subfolders.filter(subfolder => subfolder.parentId === id);

      // Combine and paginate results
      const allItems = [
        ...folderSubfolders.map(subfolder => ({ ...subfolder, type: 'folder' })),
        ...folderDocuments.map(doc => ({ ...doc, type: 'document' }))
      ];

      const paginatedItems = allItems.slice(
        (parseInt(page as string) - 1) * parseInt(limit as string),
        parseInt(page as string) * parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: {
          folder: {
            id: folder.id,
            name: folder.name,
            description: folder.description,
            color: folder.color
          },
          contents: {
            items: paginatedItems,
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total: allItems.length,
              totalPages: Math.ceil(allItems.length / parseInt(limit as string))
            }
          }
        }
      });
    } catch (error) {
      logger.error('Get folder contents error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        folderId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching folder contents'
      });
    }
  }

  /**
   * Get folder statistics
   */
  async getFolderStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
        return;
      }

      // Check if folder exists and belongs to user
      const folder = await this.folderModel.findById(id);
      if (!folder || folder.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
        return;
      }

      // Get document counts
      const documentCounts = await this.folderModel.getDocumentCounts(id);

      // Get total size of documents in folder
      const documents = await this.documentModel.findByUserId(userId);
      const folderDocuments = documents.filter(doc => doc.folderId === id);
      const totalSize = folderDocuments.reduce((sum, doc) => sum + doc.fileSize, 0);

      res.status(200).json({
        success: true,
        data: {
          folder: {
            id: folder.id,
            name: folder.name,
            description: folder.description,
            color: folder.color
          },
          stats: {
            documents: documentCounts.documents,
            subfolders: documentCounts.subfolders,
            totalSize,
            totalItems: documentCounts.documents + documentCounts.subfolders
          }
        }
      });
    } catch (error) {
      logger.error('Get folder stats error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        folderId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching folder statistics'
      });
    }
  }
}



