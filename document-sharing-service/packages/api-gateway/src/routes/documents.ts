import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { DocumentModel } from "@document-sharing/core/models/Document";
import { logger } from "@document-sharing/core/utils/logger";
import jwt from "jsonwebtoken";

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || "./uploads";
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authorization header required",
      code: "AUTHORIZATION_HEADER_MISSING",
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
};

/**
 * @route POST /api/v1/documents/upload
 * @desc Upload a new document
 * @access Private
 */
router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          code: "NO_FILE_UPLOADED",
        });
      }

      const { title, description, tags, isPublic } = req.body;
      const { file } = req;

      // Validate required fields
      if (!title || !file) {
        return res.status(400).json({
          error: "Title and file are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      // Create document
      const document = await DocumentModel.create({
        title,
        description,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        organizationId: req.user.organizationId,
        createdById: req.user.userId,
        isPublic: isPublic === "true",
        tags: tags ? tags.split(",").map((tag: string) => tag.trim()) : [],
      });

      logger.info("Document uploaded successfully", {
        documentId: document.id,
        userId: req.user.userId,
        fileName: file.originalname,
      });

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        data: {
          document,
        },
      });
    } catch (error) {
      logger.error("Document upload error:", error);
      res.status(500).json({
        error: "Document upload failed",
        code: "UPLOAD_ERROR",
      });
    }
  }
);

/**
 * @route GET /api/v1/documents
 * @desc Get documents for the authenticated user's organization
 * @access Private
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      tags,
      createdBy,
      isPublic,
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const result = await DocumentModel.findByOrganization(
      req.user.organizationId,
      {
        limit: parseInt(limit as string),
        offset,
        search: search as string,
        tags: tags ? (tags as string).split(",") : undefined,
        createdById: createdBy as string,
        isPublic: isPublic !== undefined ? isPublic === "true" : undefined,
      }
    );

    res.json({
      success: true,
      data: {
        documents: result.documents,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error("Get documents error:", error);
    res.status(500).json({
      error: "Failed to get documents",
      code: "GET_DOCUMENTS_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/documents/public
 * @desc Get public documents
 * @access Public
 */
router.get("/public", async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tags, organizationId } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const result = await DocumentModel.findPublicDocuments({
      limit: parseInt(limit as string),
      offset,
      search: search as string,
      tags: tags ? (tags as string).split(",") : undefined,
      organizationId: organizationId as string,
    });

    res.json({
      success: true,
      data: {
        documents: result.documents,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error("Get public documents error:", error);
    res.status(500).json({
      error: "Failed to get public documents",
      code: "GET_PUBLIC_DOCUMENTS_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/documents/:id
 * @desc Get a specific document
 * @access Private
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const document = await DocumentModel.findByIdWithCreator(id);
    if (!document) {
      return res.status(404).json({
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // Check if user has access to this document
    if (
      document.organizationId !== req.user.organizationId &&
      !document.isPublic
    ) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    res.json({
      success: true,
      data: {
        document,
      },
    });
  } catch (error) {
    logger.error("Get document error:", error);
    res.status(500).json({
      error: "Failed to get document",
      code: "GET_DOCUMENT_ERROR",
    });
  }
});

/**
 * @route PUT /api/v1/documents/:id
 * @desc Update a document
 * @access Private
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get the document first to check permissions
    const existingDocument = await DocumentModel.findById(id);
    if (!existingDocument) {
      return res.status(404).json({
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // Check if user has permission to update this document
    if (existingDocument.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Only allow creators or admins to update
    if (
      existingDocument.createdById !== req.user.userId &&
      !req.user.permissions.includes("manage_documents")
    ) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const updatedDocument = await DocumentModel.update(id, updateData);
    if (!updatedDocument) {
      return res.status(500).json({
        error: "Failed to update document",
        code: "UPDATE_FAILED",
      });
    }

    logger.info("Document updated successfully", {
      documentId: id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: "Document updated successfully",
      data: {
        document: updatedDocument,
      },
    });
  } catch (error) {
    logger.error("Update document error:", error);
    res.status(500).json({
      error: "Failed to update document",
      code: "UPDATE_DOCUMENT_ERROR",
    });
  }
});

/**
 * @route DELETE /api/v1/documents/:id
 * @desc Delete a document
 * @access Private
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the document first to check permissions
    const existingDocument = await DocumentModel.findById(id);
    if (!existingDocument) {
      return res.status(404).json({
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // Check if user has permission to delete this document
    if (existingDocument.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Only allow creators or admins to delete
    if (
      existingDocument.createdById !== req.user.userId &&
      !req.user.permissions.includes("manage_documents")
    ) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const success = await DocumentModel.delete(id);
    if (!success) {
      return res.status(500).json({
        error: "Failed to delete document",
        code: "DELETE_FAILED",
      });
    }

    logger.info("Document deleted successfully", {
      documentId: id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    logger.error("Delete document error:", error);
    res.status(500).json({
      error: "Failed to delete document",
      code: "DELETE_DOCUMENT_ERROR",
    });
  }
});

/**
 * @route POST /api/v1/documents/:id/archive
 * @desc Archive a document
 * @access Private
 */
router.post("/:id/archive", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the document first to check permissions
    const existingDocument = await DocumentModel.findById(id);
    if (!existingDocument) {
      return res.status(404).json({
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // Check if user has permission to archive this document
    if (existingDocument.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    const success = await DocumentModel.archive(id);
    if (!success) {
      return res.status(500).json({
        error: "Failed to archive document",
        code: "ARCHIVE_FAILED",
      });
    }

    logger.info("Document archived successfully", {
      documentId: id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: "Document archived successfully",
    });
  } catch (error) {
    logger.error("Archive document error:", error);
    res.status(500).json({
      error: "Failed to archive document",
      code: "ARCHIVE_DOCUMENT_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/documents/search
 * @desc Search documents by content
 * @access Private
 */
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 20 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        error: "Search term is required",
        code: "MISSING_SEARCH_TERM",
      });
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const result = await DocumentModel.searchByContent(
      req.user.organizationId,
      searchTerm as string,
      {
        limit: parseInt(limit as string),
        offset,
      }
    );

    res.json({
      success: true,
      data: {
        documents: result.documents,
        searchTerm,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error("Search documents error:", error);
    res.status(500).json({
      error: "Search failed",
      code: "SEARCH_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/documents/stats
 * @desc Get document statistics
 * @access Private
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await DocumentModel.getStatistics(req.user.organizationId);

    res.json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    logger.error("Get document stats error:", error);
    res.status(500).json({
      error: "Failed to get document statistics",
      code: "GET_STATS_ERROR",
    });
  }
});

export default router;
