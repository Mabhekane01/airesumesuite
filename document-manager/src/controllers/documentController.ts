import { Request, Response } from 'express';
import { DocumentService } from '../services/documentService';
import { logger } from '../utils/logger';

export class DocumentController {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  /**
   * Upload a new document
   */
  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { folderId, title, description, tags } = req.body;
      const file = req.file;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      if (!title) {
        res.status(400).json({
          success: false,
          message: 'Document title is required'
        });
        return;
      }

      const documentData = {
        userId,
        folderId: folderId || null,
        title,
        description: description || null,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        originalFilename: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype
      };

      const document = await this.documentService.createDocument(documentData);

      logger.info('Document uploaded successfully', {
        userId,
        documentId: document.id,
        filename: file.originalname,
        fileSize: file.size
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          document: {
            id: document.id,
            title: document.title,
            description: document.description,
            tags: document.tags,
            originalFilename: document.originalFilename,
            fileSize: document.fileSize,
            mimeType: document.mimeType,
            folderId: document.folderId,
            createdAt: document.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Document upload error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error during document upload'
      });
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(req: Request, res: Response): Promise<void> {
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
          message: 'Document ID is required'
        });
        return;
      }

      const document = await this.documentService.getDocument(id, userId);

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { document }
      });
    } catch (error) {
      logger.error('Get document error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        documentId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching document'
      });
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const {
        query,
        folderId,
        tags,
        mimeType,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const filters = {
        query: query as string,
        folderId: folderId as string,
        tags: tags ? (tags as string).split(',').map(tag => tag.trim()) : undefined,
        mimeType: mimeType as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined
      };

      const sort = {
        field: sortBy as string,
        order: sortOrder as 'asc' | 'desc'
      };

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await this.documentService.searchDocuments(
        userId,
        filters,
        sort,
        pagination
      );

      res.status(200).json({
        success: true,
        data: {
          documents: result.documents,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: Math.ceil(result.pagination.total / result.pagination.limit)
          }
        }
      });
    } catch (error) {
      logger.error('Search documents error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while searching documents'
      });
    }
  }

  /**
   * Update document
   */
  async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { title, description, tags, folderId } = req.body;

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
          message: 'Document ID is required'
        });
        return;
      }

      if (!title) {
        res.status(400).json({
          success: false,
          message: 'Document title is required'
        });
        return;
      }

      const updateData = {
        title,
        description: description || null,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        folderId: folderId || null
      };

      const updatedDocument = await this.documentService.updateDocument(
        id,
        userId,
        updateData
      );

      if (!updatedDocument) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      logger.info('Document updated successfully', {
        userId,
        documentId: id
      });

      res.status(200).json({
        success: true,
        message: 'Document updated successfully',
        data: {
          document: {
            id: updatedDocument.id,
            title: updatedDocument.title,
            description: updatedDocument.description,
            tags: updatedDocument.tags,
            folderId: updatedDocument.folderId,
            updatedAt: updatedDocument.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Update document error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        documentId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating document'
      });
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(req: Request, res: Response): Promise<void> {
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
          message: 'Document ID is required'
        });
        return;
      }

      const deleted = await this.documentService.deleteDocument(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      logger.info('Document deleted successfully', {
        userId,
        documentId: id
      });

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      logger.error('Delete document error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        documentId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting document'
      });
    }
  }

  /**
   * Move document to folder
   */
  async moveDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { folderId } = req.body;

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
          message: 'Document ID is required'
        });
        return;
      }

      const moved = await this.documentService.moveDocumentToFolder(
        id,
        userId,
        folderId || null
      );

      if (!moved) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      logger.info('Document moved successfully', {
        userId,
        documentId: id,
        folderId
      });

      res.status(200).json({
        success: true,
        message: 'Document moved successfully',
        data: {
          documentId: id,
          folderId
        }
      });
    } catch (error) {
      logger.error('Move document error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        documentId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while moving document'
      });
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const stats = await this.documentService.getDocumentStats(userId);

      res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get document stats error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching document statistics'
      });
    }
  }

  /**
   * Create share link for document
   */
  async createShareLink(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { 
        isPublic = false, 
        password, 
        expiresAt, 
        allowDownload = true, 
        allowPrint = false,
        watermark = false 
      } = req.body;

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
          message: 'Document ID is required'
        });
        return;
      }

      const shareData = {
        isPublic,
        password: password || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowDownload,
        allowPrint,
        watermark
      };

      const share = await this.documentService.createShareLink(id, userId, shareData);

      if (!share) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      logger.info('Share link created successfully', {
        userId,
        documentId: id,
        shareId: share.id
      });

      res.status(201).json({
        success: true,
        message: 'Share link created successfully',
        data: {
          share: {
            id: share.id,
            shareId: share.shareId,
            isPublic: share.isPublic,
            password: share.password ? '***' : null,
            expiresAt: share.expiresAt,
            allowDownload: share.allowDownload,
            allowPrint: share.allowPrint,
            watermark: share.watermark,
            createdAt: share.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Create share link error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        documentId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating share link'
      });
    }
  }

  /**
   * Download document
   */
  async downloadDocument(req: Request, res: Response): Promise<void> {
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
          message: 'Document ID is required'
        });
        return;
      }

      const document = await this.documentService.getDocument(id, userId);

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      // Set headers for file download
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename}"`);
      res.setHeader('Content-Length', document.fileSize);

      // Send file
      res.sendFile(document.filePath, (err) => {
        if (err) {
          logger.error('File download error', { 
            error: err.message,
            userId,
            documentId: id,
            filePath: document.filePath
          });
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error downloading file'
            });
          }
        }
      });

      // Log download
      logger.info('Document downloaded', {
        userId,
        documentId: id,
        filename: document.originalFilename
      });
    } catch (error) {
      logger.error('Download document error', { 
        error: error.message, 
        stack: error.stack,
        userId: (req as any).user?.userId,
        documentId: req.params.id
      });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Internal server error while downloading document'
        });
      }
    }
  }
}