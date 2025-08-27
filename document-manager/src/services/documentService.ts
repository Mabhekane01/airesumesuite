import {
  DocumentModel,
  Document,
  CreateDocumentData,
  UpdateDocumentData,
  DocumentFilters,
  DocumentSort,
} from "@/models/Document";
import { FolderModel, Folder } from "@/models/Folder";
import { DocumentSharingIntegration } from "./documentSharingIntegration";
import {
  DocumentProcessingService,
  UploadedFile,
} from "./documentUploadService";
import { webhookEventService } from "./webhookEventService";
import { pool, redis } from "@/config/database";
import { config } from "@/config/environment";
import { logger, logFileOperation, logAnalytics } from "@/utils/logger";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

export interface DocumentWithFolder extends Document {
  folder?: Folder;
  shareCount?: number;
  viewCount?: number;
  lastViewed?: Date;
}

export interface DocumentSearchResult {
  documents: DocumentWithFolder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocumentStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalSize: number;
  averageSize: number;
  recentUploads: Document[];
  popularDocuments: Document[];
}

export class DocumentService {
  private documentModel: DocumentModel;
  private folderModel: FolderModel;
  private documentSharingIntegration: DocumentSharingIntegration;
  private documentProcessingService: DocumentProcessingService;

  constructor() {
    this.documentModel = new DocumentModel(pool);
    this.folderModel = new FolderModel(pool);
    this.documentSharingIntegration = new DocumentSharingIntegration();
    this.documentProcessingService = new DocumentProcessingService();
  }

  /**
   * Create a new document
   */
  async createDocument(
    userId: string,
    organizationId: string | undefined,
    file: Express.Multer.File,
    metadata: Partial<CreateDocumentData>
  ): Promise<Document> {
    try {
      // Process the uploaded file
      const processedFile = await DocumentProcessingService.processFile(
        file,
        userId
      );

      // Create document record
      const documentData: CreateDocumentData = {
        userId,
        organizationId,
        folderId: metadata.folderId,
        title: metadata.title || processedFile.originalName,
        description: metadata.description,
        fileName: processedFile.fileName,
        fileSize: processedFile.fileSize,
        fileType: processedFile.fileType,
        mimeType: processedFile.mimeType,
        fileUrl: processedFile.url,
        filePath: processedFile.filePath,
        pageCount: processedFile.pageCount,
        thumbnailUrl: processedFile.thumbnailUrl,
        previewImages: processedFile.previewImages,
        textContent: processedFile.textContent,
        source: metadata.source || "upload",
        sourceMetadata: metadata.sourceMetadata || {},
      };

      const document = await this.documentModel.create(documentData);

      // Cache document data
      await this.cacheDocument(document);

      // Log file operation
      logFileOperation("create", document.filePath, userId, {
        documentId: document.id,
        fileSize: document.fileSize,
        fileType: document.fileType,
      });

      // Log analytics
      logAnalytics("Document created", {
        documentId: document.id,
        userId,
        organizationId,
        fileType: document.fileType,
        fileSize: document.fileSize,
        source: document.source,
      });

      // Create webhook events for document creation
      try {
        await webhookEventService.createWebhookEventsForAction(
          "document.created",
          {
            documentId: document.id,
            title: document.title,
            fileType: document.fileType,
            fileSize: document.fileSize,
            userId,
            organizationId,
          },
          userId,
          organizationId
        );
      } catch (error) {
        logger.warn(
          "Failed to create webhook events for document creation:",
          error
        );
      }

      return document;
    } catch (error) {
      logger.error("Failed to create document:", error);
      throw new Error("Failed to create document");
    }
  }

  /**
   * Get document by ID with folder information
   */
  async getDocument(
    id: string,
    userId: string
  ): Promise<DocumentWithFolder | null> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedDocument(id);
      if (cached) {
        return cached;
      }

      const document = await this.documentModel.findById(id);
      if (!document) {
        return null;
      }

      // Check access permissions
      if (document.userId !== userId && document.organizationId) {
        // TODO: Check organization membership
        throw new Error("Access denied");
      }

      // Get folder information
      let folder: Folder | undefined;
      if (document.folderId) {
        const foundFolder = await this.folderModel.findById(document.folderId);
        folder = foundFolder || undefined;
      }

      // Get sharing and analytics data from document-sharing-service
      let shareCount = 0;
      let viewCount = 0;
      let lastViewed: Date | undefined;

      try {
        const sharingData =
          await this.documentSharingIntegration.getBasicDocumentAnalytics(id);
        if (sharingData?.data) {
          shareCount = sharingData.data.shareCount || 0;
          viewCount = sharingData.data.totalViews || 0;
          lastViewed = sharingData.data.lastViewed
            ? new Date(sharingData.data.lastViewed)
            : undefined;
        }
      } catch (error) {
        logger.warn("Failed to get sharing analytics:", error);
      }

      const documentWithFolder: DocumentWithFolder = {
        ...document,
        folder,
        shareCount,
        viewCount,
        lastViewed,
      };

      // Cache the result
      await this.cacheDocument(documentWithFolder);

      return documentWithFolder;
    } catch (error) {
      logger.error("Failed to get document:", error);
      throw new Error("Failed to get document");
    }
  }

  /**
   * Move document to folder (alias for moveDocumentToFolder)
   */
  async moveDocument(
    documentId: string,
    userId: string,
    folderId: string | null
  ): Promise<Document | null> {
    return this.moveDocumentToFolder(documentId, userId, folderId);
  }

  /**
   * Search documents with advanced filtering
   */
  async searchDocuments(
    userId: string,
    organizationId: string | undefined,
    filters: DocumentFilters,
    sort: DocumentSort = { field: "createdAt", direction: "desc" },
    page: number = 1,
    limit: number = 20
  ): Promise<DocumentSearchResult> {
    try {
      // Add user/organization filters
      const searchFilters: DocumentFilters = {
        ...filters,
        userId,
        organizationId,
      };

      const result = await this.documentModel.search(
        searchFilters,
        sort,
        page,
        limit
      );

      // Enrich documents with folder information
      const documentsWithFolders = await Promise.all(
        result.documents.map(async (doc) => {
          let folder: Folder | undefined;
          if (doc.folderId) {
            const foundFolder = await this.folderModel.findById(doc.folderId);
            folder = foundFolder || undefined;
          }

          return {
            ...doc,
            folder,
          };
        })
      );

      const totalPages = Math.ceil(result.total / limit);

      return {
        documents: documentsWithFolders,
        total: result.total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error("Failed to search documents:", error);
      throw new Error("Failed to search documents");
    }
  }

  /**
   * Update document
   */
  async updateDocument(
    id: string,
    userId: string,
    updateData: UpdateDocumentData
  ): Promise<Document | null> {
    try {
      // Check if document exists and user has access
      const existingDocument = await this.documentModel.findById(id);
      if (!existingDocument) {
        return null;
      }

      if (existingDocument.userId !== userId) {
        throw new Error("Access denied");
      }

      // Update document
      const updatedDocument = await this.documentModel.update(id, updateData);
      if (!updatedDocument) {
        return null;
      }

      // Clear cache
      await this.clearDocumentCache(id);

      // Log analytics
      logAnalytics("Document updated", {
        documentId: id,
        userId,
        updateFields: Object.keys(updateData),
      });

      // Create webhook events for document update
      try {
        await webhookEventService.createWebhookEventsForAction(
          "document.updated",
          {
            documentId: id,
            updateFields: Object.keys(updateData),
            userId,
            organizationId: existingDocument.organizationId,
          },
          userId,
          existingDocument.organizationId
        );
      } catch (error) {
        logger.warn(
          "Failed to create webhook events for document update:",
          error
        );
      }

      return updatedDocument;
    } catch (error) {
      logger.error("Failed to update document:", error);
      throw new Error("Failed to update document");
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string, userId: string): Promise<boolean> {
    try {
      // Check if document exists and user has access
      const existingDocument = await this.documentModel.findById(id);
      if (!existingDocument) {
        return false;
      }

      if (existingDocument.userId !== userId) {
        throw new Error("Access denied");
      }

      // Delete from document-sharing-service first
      try {
        // TODO: Implement deleteDocumentShares method in DocumentSharingIntegration
        // For now, we'll just log that this needs to be implemented
        logger.info("Document shares deletion not yet implemented", {
          documentId: id,
        });
      } catch (error) {
        logger.warn("Failed to delete document shares:", error);
      }

      // Delete document (soft delete)
      const deleted = await this.documentModel.delete(id);
      if (deleted) {
        // Clear cache
        await this.clearDocumentCache(id);

        // Log analytics
        logAnalytics("Document deleted", {
          documentId: id,
          userId,
          fileType: existingDocument.fileType,
          fileSize: existingDocument.fileSize,
        });

        // Create webhook events for document deletion
        try {
          await webhookEventService.createWebhookEventsForAction(
            "document.deleted",
            {
              documentId: id,
              title: existingDocument.title,
              fileType: existingDocument.fileType,
              fileSize: existingDocument.fileSize,
              userId,
              organizationId: existingDocument.organizationId,
            },
            userId,
            existingDocument.organizationId
          );
        } catch (error) {
          logger.warn(
            "Failed to create webhook events for document deletion:",
            error
          );
        }
      }

      return deleted;
    } catch (error) {
      logger.error("Failed to delete document:", error);
      throw new Error("Failed to delete document");
    }
  }

  /**
   * Move document to folder
   */
  async moveDocumentToFolder(
    documentId: string,
    userId: string,
    folderId: string | null
  ): Promise<Document | null> {
    try {
      // Check if document exists and user has access
      const existingDocument = await this.documentModel.findById(documentId);
      if (!existingDocument) {
        return null;
      }

      if (existingDocument.userId !== userId) {
        throw new Error("Access denied");
      }

      // Check if folder exists and user has access
      if (folderId) {
        const folder = await this.folderModel.findById(folderId);
        if (!folder || folder.userId !== userId) {
          throw new Error("Invalid folder");
        }
      }

      // Update document
      const updatedDocument = await this.documentModel.update(documentId, {
        folderId: folderId || undefined,
      });

      // Clear cache
      await this.clearDocumentCache(documentId);

      return updatedDocument;
    } catch (error) {
      logger.error("Failed to move document to folder:", error);
      throw new Error("Failed to move document to folder");
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(
    userId: string,
    organizationId: string | undefined
  ): Promise<DocumentStats> {
    try {
      const stats = await this.documentModel.getStats(userId, organizationId);

      // Get recent uploads
      const recentUploads = await this.documentModel.search(
        { userId, organizationId },
        { field: "createdAt", direction: "desc" },
        1,
        5
      );

      // Get popular documents (by view count from document-sharing-service)
      const popularDocuments = await this.getPopularDocuments(
        userId,
        organizationId
      );

      return {
        ...stats,
        recentUploads: recentUploads.documents,
        popularDocuments,
      };
    } catch (error) {
      logger.error("Failed to get document stats:", error);
      throw new Error("Failed to get document stats");
    }
  }

  /**
   * Create share link via document-sharing-service
   */
  async createShareLink(
    documentId: string,
    userId: string,
    shareOptions: {
      title?: string;
      description?: string;
      password?: string;
      expiresAt?: Date;
      allowDownload?: boolean;
      allowPrint?: boolean;
      trackViews?: boolean;
      notifyOnView?: boolean;
    }
  ): Promise<any> {
    try {
      // Check if document exists and user has access
      const existingDocument = await this.documentModel.findById(documentId);
      if (!existingDocument) {
        throw new Error("Document not found");
      }

      if (existingDocument.userId !== userId) {
        throw new Error("Access denied");
      }

      // Create share via document-sharing-service
      // TODO: Implement createShare method in DocumentSharingIntegration
      // For now, we'll create a mock share object
      const share = {
        id: uuidv4(),
        documentId,
        title: shareOptions.title || existingDocument.title,
        description: shareOptions.description || existingDocument.description,
        password: shareOptions.password,
        expiresAt: shareOptions.expiresAt,
        settings: {
          allowDownload: shareOptions.allowDownload !== false,
          allowPrint: shareOptions.allowPrint !== false,
          trackViews: shareOptions.trackViews !== false,
          notifyOnView: shareOptions.notifyOnView || false,
        },
      };

      // Log analytics
      logAnalytics("Share link created", {
        documentId,
        userId,
        shareId: share.id,
        hasPassword: !!shareOptions.password,
        expiresAt: shareOptions.expiresAt,
      });

      return share;
    } catch (error) {
      logger.error("Failed to create share link:", error);
      throw new Error("Failed to create share link");
    }
  }

  /**
   * Get popular documents by view count
   */
  private async getPopularDocuments(
    userId: string,
    organizationId: string | undefined,
    limit: number = 5
  ): Promise<Document[]> {
    try {
      // Get user's documents
      const userDocuments = await this.documentModel.search(
        { userId, organizationId },
        { field: "createdAt", direction: "desc" },
        1,
        50 // Get more documents to sort by popularity
      );

      if (userDocuments.documents.length === 0) {
        return [];
      }

      // Get view counts from document-sharing-service
      const documentsWithViews = await Promise.all(
        userDocuments.documents.map(async (doc) => {
          try {
            const analytics =
              await this.documentSharingIntegration.getBasicDocumentAnalytics(
                doc.id
              );
            return {
              ...doc,
              viewCount: analytics?.data?.totalViews || 0,
            };
          } catch (error) {
            return {
              ...doc,
              viewCount: 0,
            };
          }
        })
      );

      // Sort by view count and return top documents
      return documentsWithViews
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, limit);
    } catch (error) {
      logger.error("Failed to get popular documents:", error);
      return [];
    }
  }

  /**
   * Cache document data
   */
  private async cacheDocument(
    document: Document | DocumentWithFolder
  ): Promise<void> {
    try {
      const cacheKey = `document:${document.id}`;
      await redis.setEx(cacheKey, 300, JSON.stringify(document)); // 5 minutes
    } catch (error) {
      logger.warn("Failed to cache document:", error);
    }
  }

  /**
   * Get cached document
   */
  private async getCachedDocument(
    id: string
  ): Promise<DocumentWithFolder | null> {
    try {
      const cacheKey = `document:${id}`;
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn("Failed to get cached document:", error);
      return null;
    }
  }

  /**
   * Clear document cache
   */
  private async clearDocumentCache(id: string): Promise<void> {
    try {
      const cacheKey = `document:${id}`;
      await redis.del(cacheKey);
    } catch (error) {
      logger.warn("Failed to clear document cache:", error);
    }
  }
}

export default DocumentService;
