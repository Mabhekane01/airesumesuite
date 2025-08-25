import { Request, Response } from "express";
import { query } from "../config/database";
import { createError, asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { AuthenticatedRequest } from "../types/express";

export class FolderController {
  /**
   * Get all folders for a user
   */
  async getFolders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const result = await query(
        `
        SELECT 
          f.id, f.name, f.description, f.color, f.parent_folder_id,
          f.created_at, f.updated_at,
          COUNT(d.id) as document_count
        FROM folders f
        LEFT JOIN documents d ON f.id = d.folder_id AND d.status = 'active'
        WHERE f.user_id = $1 AND f.status = 'active'
        GROUP BY f.id
        ORDER BY f.created_at DESC
      `,
        [userId]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      logger.error("Get folders error", {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get folders",
      });
    }
  }

  /**
   * Get a specific folder
   */
  async getFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const result = await query(
        `
        SELECT 
          f.*, COUNT(d.id) as document_count
        FROM folders f
        LEFT JOIN documents d ON f.id = d.folder_id AND d.status = 'active'
        WHERE f.id = $1 AND f.user_id = $2 AND f.status = 'active'
        GROUP BY f.id
      `,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw createError("Folder not found", 404, "FOLDER_NOT_FOUND");
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("Get folder error", {
        error: error.message,
        userId: req.user?.id,
        folderId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get folder",
      });
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { name, description, color, parentFolderId } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      if (!name) {
        throw createError(
          "Folder name is required",
          400,
          "MISSING_FOLDER_NAME"
        );
      }

      const folderId = uuidv4();
      const result = await query(
        `
        INSERT INTO folders (id, name, description, color, parent_folder_id, user_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `,
        [
          folderId,
          name,
          description,
          color || "#3B82F6",
          parentFolderId,
          userId,
        ]
      );

      logger.info("Folder created", { userId, folderId, name });

      res.status(201).json({
        success: true,
        message: "Folder created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("Error creating folder", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Internal server error while creating folder",
      });
    }
  }

  /**
   * Update a folder
   */
  async updateFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, description, color, parentFolderId } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const result = await query(
        `
        UPDATE folders 
        SET name = COALESCE($1, name), 
            description = COALESCE($2, description),
            color = COALESCE($3, color),
            parent_folder_id = $4,
            updated_at = NOW()
        WHERE id = $5 AND user_id = $6 AND status = 'active'
        RETURNING *
      `,
        [name, description, color, parentFolderId, id, userId]
      );

      if (result.rows.length === 0) {
        throw createError(
          "Folder not found or access denied",
          404,
          "FOLDER_NOT_FOUND"
        );
      }

      logger.info("Folder updated", { userId, folderId: id });

      res.json({
        success: true,
        message: "Folder updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("Update folder error", {
        error: error.message,
        userId: req.user?.id,
        folderId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to update folder",
      });
    }
  }

  /**
   * Delete a folder
   */
  async deleteFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      // Check if folder has documents
      const docResult = await query(
        `
        SELECT COUNT(*) as doc_count FROM documents 
        WHERE folder_id = $1 AND status = 'active'
      `,
        [id]
      );

      if (parseInt(docResult.rows[0].doc_count) > 0) {
        throw createError(
          "Cannot delete folder with documents. Move or delete documents first.",
          400,
          "FOLDER_HAS_DOCUMENTS"
        );
      }

      const result = await query(
        `
        UPDATE folders 
        SET status = 'deleted', updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'active'
        RETURNING *
      `,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw createError(
          "Folder not found or access denied",
          404,
          "FOLDER_NOT_FOUND"
        );
      }

      logger.info("Folder deleted", { userId, folderId: id });

      res.json({
        success: true,
        message: "Folder deleted successfully",
      });
    } catch (error) {
      logger.error("Delete folder error", {
        error: error.message,
        userId: req.user?.id,
        folderId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to delete folder",
      });
    }
  }

  /**
   * Add document to folder
   */
  async addDocumentToFolder(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id: folderId } = req.params;
      const { documentId } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      // Verify folder ownership
      const folderResult = await query(
        `
        SELECT id FROM folders WHERE id = $1 AND user_id = $2 AND status = 'active'
      `,
        [folderId, userId]
      );

      if (folderResult.rows.length === 0) {
        throw createError(
          "Folder not found or access denied",
          404,
          "FOLDER_NOT_FOUND"
        );
      }

      // Verify document ownership
      const docResult = await query(
        `
        SELECT id FROM documents WHERE id = $1 AND user_id = $2 AND status = 'active'
      `,
        [documentId, userId]
      );

      if (docResult.rows.length === 0) {
        throw createError(
          "Document not found or access denied",
          404,
          "DOCUMENT_NOT_FOUND"
        );
      }

      // Update document folder
      await query(
        `
        UPDATE documents SET folder_id = $1, updated_at = NOW() WHERE id = $2
      `,
        [folderId, documentId]
      );

      logger.info("Document added to folder", { userId, documentId, folderId });

      res.json({
        success: true,
        message: "Document added to folder successfully",
      });
    } catch (error) {
      logger.error("Add document to folder error", {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to add document to folder",
      });
    }
  }

  /**
   * Remove document from folder
   */
  async removeDocumentFromFolder(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id: folderId, documentId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      // Update document to remove folder
      const result = await query(
        `
        UPDATE documents 
        SET folder_id = NULL, updated_at = NOW()
        WHERE id = $1 AND folder_id = $2 AND user_id = $3 AND status = 'active'
        RETURNING id
      `,
        [documentId, folderId, userId]
      );

      if (result.rows.length === 0) {
        throw createError(
          "Document not found in folder or access denied",
          404,
          "DOCUMENT_NOT_FOUND"
        );
      }

      logger.info("Document removed from folder", {
        userId,
        documentId,
        folderId,
      });

      res.json({
        success: true,
        message: "Document removed from folder successfully",
      });
    } catch (error) {
      logger.error("Remove document from folder error", {
        error: error.message,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to remove document from folder",
      });
    }
  }

  /**
   * Move folder
   */
  async moveFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id: folderId } = req.params;
      const { newParentFolderId } = req.body;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      // Verify folder ownership
      const folderResult = await query(
        `
        SELECT id FROM folders WHERE id = $1 AND user_id = $2 AND status = 'active'
      `,
        [folderId, userId]
      );

      if (folderResult.rows.length === 0) {
        throw createError(
          "Folder not found or access denied",
          404,
          "FOLDER_NOT_FOUND"
        );
      }

      // Update folder parent
      await query(
        `
        UPDATE folders 
        SET parent_folder_id = $1, updated_at = NOW()
        WHERE id = $2
      `,
        [newParentFolderId, folderId]
      );

      logger.info("Folder moved", { userId, folderId, newParentFolderId });

      res.json({
        success: true,
        message: "Folder moved successfully",
      });
    } catch (error) {
      logger.error("Move folder error", {
        error: error.message,
        userId: req.user?.id,
        folderId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to move folder",
      });
    }
  }

  /**
   * Duplicate folder
   */
  async duplicateFolder(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id: folderId } = req.params;

      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      // Get folder data
      const folderResult = await query(
        `
        SELECT name, description, color, parent_folder_id
        FROM folders WHERE id = $1 AND user_id = $2 AND status = 'active'
      `,
        [folderId, userId]
      );

      if (folderResult.rows.length === 0) {
        throw createError(
          "Folder not found or access denied",
          404,
          "FOLDER_NOT_FOUND"
        );
      }

      const folder = folderResult.rows[0];
      const newFolderId = uuidv4();

      // Create duplicate folder
      const result = await query(
        `
        INSERT INTO folders (id, name, description, color, parent_folder_id, user_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `,
        [
          newFolderId,
          `${folder.name} (Copy)`,
          folder.description,
          folder.color,
          folder.parent_folder_id,
          userId,
        ]
      );

      logger.info("Folder duplicated", {
        userId,
        originalFolderId: folderId,
        newFolderId,
      });

      res.status(201).json({
        success: true,
        message: "Folder duplicated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("Duplicate folder error", {
        error: error.message,
        userId: req.user?.id,
        folderId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to duplicate folder",
      });
    }
  }
}
