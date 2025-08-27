import { Router } from "express";
import { DocumentModel } from "@document-sharing/core/models/Document";
import { logger } from "@document-sharing/core/utils/logger";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { query } from "@document-sharing/core/database/connection";

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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
 * @route POST /api/v1/shares
 * @desc Create a shareable link for a document
 * @access Private
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { documentId, password, expiresAt, allowDownload, customDomain } =
      req.body;

    // Validate required fields
    if (!documentId) {
      return res.status(400).json({
        error: "Document ID is required",
        code: "MISSING_DOCUMENT_ID",
      });
    }

    // Get the document
    const document = await DocumentModel.findById(documentId);
    if (!document) {
      return res.status(404).json({
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // Check if user has access to this document
    if (document.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Generate unique slug
    const slug = uuidv4().replace(/-/g, "").substring(0, 12);

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      const bcrypt = require("bcrypt");
      passwordHash = await bcrypt.hash(password, 12);
    }

    // Create shareable link
    const shareData = {
      id: uuidv4(),
      documentId,
      slug,
      passwordHash,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      allowDownload: allowDownload !== false, // Default to true
      customDomain: customDomain || null,
      createdById: req.user.userId,
      organizationId: req.user.organizationId,
      isActive: true,
      currentViews: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await query(
      `
      INSERT INTO document_links (
        id, document_id, slug, password_hash, expires_at, allow_download,
        custom_domain, created_by_id, organization_id, is_active,
        current_views, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        shareData.id,
        shareData.documentId,
        shareData.slug,
        shareData.passwordHash,
        shareData.expiresAt,
        shareData.allowDownload,
        shareData.customDomain,
        shareData.createdById,
        shareData.organizationId,
        shareData.isActive,
        shareData.currentViews,
        shareData.createdAt,
        shareData.updatedAt,
      ]
    );

    logger.info("Shareable link created successfully", {
      documentId,
      slug,
      userId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      message: "Shareable link created successfully",
      data: {
        share: {
          id: shareData.id,
          slug: shareData.slug,
          documentId: shareData.documentId,
          expiresAt: shareData.expiresAt,
          allowDownload: shareData.allowDownload,
          customDomain: shareData.customDomain,
          url: `${process.env.BASE_URL || "http://localhost:3000"}/d/${shareData.slug}`,
        },
      },
    });
  } catch (error) {
    logger.error("Create share error:", error);
    res.status(500).json({
      error: "Failed to create shareable link",
      code: "CREATE_SHARE_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/shares
 * @desc Get all shareable links for the user's organization
 * @access Private
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, documentId } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions = ["dl.organization_id = $1"];
    const values: any[] = [req.user.organizationId];
    let paramCount = 1;

    if (documentId) {
      paramCount++;
      whereConditions.push(`dl.document_id = $${paramCount}`);
      values.push(documentId);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM document_links dl WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get shares with pagination
    paramCount++;
    values.push(parseInt(limit as string));
    paramCount++;
    values.push(offset);

    const result = await query(
      `
      SELECT dl.*, d.title as document_title, d.file_name
      FROM document_links dl
      JOIN documents d ON dl.document_id = d.id
      WHERE ${whereClause}
      ORDER BY dl.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
      `,
      values
    );

    const shares = result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      documentId: row.document_id,
      documentTitle: row.document_title,
      fileName: row.file_name,
      expiresAt: row.expires_at,
      allowDownload: row.allow_download,
      customDomain: row.custom_domain,
      currentViews: parseInt(row.current_views),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      url: `${process.env.BASE_URL || "http://localhost:3000"}/d/${row.slug}`,
    }));

    res.json({
      success: true,
      data: {
        shares,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error("Get shares error:", error);
    res.status(500).json({
      error: "Failed to get shares",
      code: "GET_SHARES_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/shares/:id
 * @desc Get a specific shareable link
 * @access Private
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `
      SELECT dl.*, d.title as document_title, d.file_name, d.description
      FROM document_links dl
      JOIN documents d ON dl.document_id = d.id
      WHERE dl.id = $1 AND dl.organization_id = $2
      `,
      [id, req.user.organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Share not found",
        code: "SHARE_NOT_FOUND",
      });
    }

    const row = result.rows[0];
    const share = {
      id: row.id,
      slug: row.slug,
      documentId: row.document_id,
      documentTitle: row.document_title,
      fileName: row.file_name,
      description: row.description,
      expiresAt: row.expires_at,
      allowDownload: row.allow_download,
      customDomain: row.custom_domain,
      currentViews: parseInt(row.current_views),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      url: `${process.env.BASE_URL || "http://localhost:3000"}/d/${row.slug}`,
    };

    res.json({
      success: true,
      data: {
        share,
      },
    });
  } catch (error) {
    logger.error("Get share error:", error);
    res.status(500).json({
      error: "Failed to get share",
      code: "GET_SHARE_ERROR",
    });
  }
});

/**
 * @route PUT /api/v1/shares/:id
 * @desc Update a shareable link
 * @access Private
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, expiresAt, allowDownload, customDomain, isActive } =
      req.body;

    // Check if share exists and user has access
    const existingShare = await query(
      "SELECT * FROM document_links WHERE id = $1 AND organization_id = $2",
      [id, req.user.organizationId]
    );

    if (existingShare.rows.length === 0) {
      return res.status(404).json({
        error: "Share not found",
        code: "SHARE_NOT_FOUND",
      });
    }

    // Build update query
    const setFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (password !== undefined) {
      if (password === null) {
        setFields.push("password_hash = NULL");
      } else {
        const bcrypt = require("bcrypt");
        const passwordHash = await bcrypt.hash(password, 12);
        setFields.push(`password_hash = $${paramCount}`);
        values.push(passwordHash);
        paramCount++;
      }
    }

    if (expiresAt !== undefined) {
      setFields.push(`expires_at = $${paramCount}`);
      values.push(expiresAt ? new Date(expiresAt) : null);
      paramCount++;
    }

    if (allowDownload !== undefined) {
      setFields.push(`allow_download = $${paramCount}`);
      values.push(allowDownload);
      paramCount++;
    }

    if (customDomain !== undefined) {
      setFields.push(`custom_domain = $${paramCount}`);
      values.push(customDomain);
      paramCount++;
    }

    if (isActive !== undefined) {
      setFields.push(`is_active = $${paramCount}`);
      values.push(isActive);
      paramCount++;
    }

    if (setFields.length === 0) {
      return res.status(400).json({
        error: "No fields to update",
        code: "NO_FIELDS_TO_UPDATE",
      });
    }

    // Add updated_at timestamp
    setFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    paramCount++;

    // Add WHERE clause
    values.push(id);
    values.push(req.user.organizationId);

    const queryText = `
      UPDATE document_links 
      SET ${setFields.join(", ")}
      WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(500).json({
        error: "Failed to update share",
        code: "UPDATE_FAILED",
      });
    }

    logger.info("Share updated successfully", {
      shareId: id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: "Share updated successfully",
    });
  } catch (error) {
    logger.error("Update share error:", error);
    res.status(500).json({
      error: "Failed to update share",
      code: "UPDATE_SHARE_ERROR",
    });
  }
});

/**
 * @route DELETE /api/v1/shares/:id
 * @desc Delete a shareable link
 * @access Private
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      "DELETE FROM document_links WHERE id = $1 AND organization_id = $2",
      [id, req.user.organizationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Share not found",
        code: "SHARE_NOT_FOUND",
      });
    }

    logger.info("Share deleted successfully", {
      shareId: id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: "Share deleted successfully",
    });
  } catch (error) {
    logger.error("Delete share error:", error);
    res.status(500).json({
      error: "Failed to delete share",
      code: "DELETE_SHARE_ERROR",
    });
  }
});

/**
 * @route GET /d/:slug
 * @desc Public document viewer endpoint
 * @access Public
 */
router.get("/d/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.query;

    // Get the shareable link
    const shareResult = await query(
      `
      SELECT dl.*, d.*, u.first_name, u.last_name
      FROM document_links dl
      JOIN documents d ON dl.document_id = d.id
      JOIN users u ON dl.created_by_id = u.id
      WHERE dl.slug = $1 AND dl.is_active = true
      `,
      [slug]
    );

    if (shareResult.rows.length === 0) {
      return res.status(404).json({
        error: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    const share = shareResult.rows[0];

    // Check if link has expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({
        error: "This link has expired",
        code: "LINK_EXPIRED",
      });
    }

    // Check password if required
    if (share.password_hash) {
      if (!password) {
        return res.status(401).json({
          error: "Password required",
          code: "PASSWORD_REQUIRED",
        });
      }

      const bcrypt = require("bcrypt");
      const isValidPassword = await bcrypt.compare(
        password as string,
        share.password_hash
      );
      if (!isValidPassword) {
        return res.status(401).json({
          error: "Invalid password",
          code: "INVALID_PASSWORD",
        });
      }
    }

    // Record view (this would integrate with analytics service)
    // For now, just increment the view count
    await query(
      "UPDATE document_links SET current_views = current_views + 1 WHERE id = $1",
      [share.id]
    );

    // Return document info for viewing
    const documentInfo = {
      id: share.document_id,
      title: share.title,
      description: share.description,
      fileName: share.file_name,
      mimeType: share.mime_type,
      pageCount: share.page_count,
      allowDownload: share.allow_download,
      creator: {
        firstName: share.first_name,
        lastName: share.last_name,
      },
      createdAt: share.created_at,
      currentViews: share.current_views + 1,
    };

    res.json({
      success: true,
      data: {
        document: documentInfo,
        viewUrl: `/api/v1/documents/${share.document_id}/view`,
        downloadUrl: share.allow_download
          ? `/api/v1/documents/${share.document_id}/download`
          : null,
      },
    });
  } catch (error) {
    logger.error("Document view error:", error);
    res.status(500).json({
      error: "Failed to load document",
      code: "DOCUMENT_LOAD_ERROR",
    });
  }
});

export default router;
