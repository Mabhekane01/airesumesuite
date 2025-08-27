import { query } from "../database/connection";
import { v4 as uuidv4 } from "uuid";

export interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  thumbnailPath?: string;
  previewPaths?: string[];
  textContent?: string;
  metadata: Record<string, any>;
  organizationId: string;
  createdById: string;
  isPublic: boolean;
  isArchived: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentData {
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  thumbnailPath?: string;
  previewPaths?: string[];
  textContent?: string;
  metadata?: Record<string, any>;
  organizationId: string;
  createdById: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  pageCount?: number;
  thumbnailPath?: string;
  previewPaths?: string[];
  textContent?: string;
  metadata?: Record<string, any>;
  isPublic?: boolean;
  isArchived?: boolean;
  tags?: string[];
}

export interface DocumentWithCreator extends Document {
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface DocumentWithAnalytics extends Document {
  analytics: {
    totalViews: number;
    uniqueVisitors: number;
    averageTimeOnPage: number;
    lastViewedAt?: Date;
  };
}

export class DocumentModel {
  /**
   * Create a new document
   */
  static async create(documentData: CreateDocumentData): Promise<Document> {
    const id = uuidv4();
    const now = new Date();

    const document: Document = {
      id,
      title: documentData.title,
      description: documentData.description,
      fileName: documentData.fileName,
      filePath: documentData.filePath,
      fileSize: documentData.fileSize,
      mimeType: documentData.mimeType,
      pageCount: documentData.pageCount,
      thumbnailPath: documentData.thumbnailPath,
      previewPaths: documentData.previewPaths || [],
      textContent: documentData.textContent,
      metadata: documentData.metadata || {},
      organizationId: documentData.organizationId,
      createdById: documentData.createdById,
      isPublic: documentData.isPublic || false,
      isArchived: false,
      tags: documentData.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await query(
      `
      INSERT INTO documents (
        id, title, description, file_name, file_path, file_size, mime_type,
        page_count, thumbnail_path, preview_paths, text_content, metadata,
        organization_id, created_by_id, is_public, is_archived, tags,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `,
      [
        document.id,
        document.title,
        document.description,
        document.fileName,
        document.filePath,
        document.fileSize,
        document.mimeType,
        document.pageCount,
        document.thumbnailPath,
        document.previewPaths,
        document.textContent,
        document.metadata,
        document.organizationId,
        document.createdById,
        document.isPublic,
        document.isArchived,
        document.tags,
        document.createdAt,
        document.updatedAt,
      ]
    );

    return document;
  }

  /**
   * Find document by ID
   */
  static async findById(id: string): Promise<Document | null> {
    const result = await query(
      "SELECT * FROM documents WHERE id = $1 AND is_archived = false",
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Find document with creator details
   */
  static async findByIdWithCreator(
    id: string
  ): Promise<DocumentWithCreator | null> {
    const result = await query(
      `
      SELECT d.*, u.first_name, u.last_name, u.email
      FROM documents d
      JOIN users u ON d.created_by_id = u.id
      WHERE d.id = $1 AND d.is_archived = false
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const document = this.mapRowToDocument(row);

    return {
      ...document,
      creator: {
        id: row.created_by_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
      },
    };
  }

  /**
   * Find documents by organization
   */
  static async findByOrganization(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      tags?: string[];
      createdById?: string;
      isPublic?: boolean;
    } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      search,
      tags,
      createdById,
      isPublic,
    } = options;

    let whereConditions = ["d.organization_id = $1", "d.is_archived = false"];
    const values: any[] = [organizationId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereConditions.push(
        `(d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`
      );
      values.push(`%${search}%`);
    }

    if (tags && tags.length > 0) {
      paramCount++;
      whereConditions.push(`d.tags && $${paramCount}`);
      values.push(tags);
    }

    if (createdById) {
      paramCount++;
      whereConditions.push(`d.created_by_id = $${paramCount}`);
      values.push(createdById);
    }

    if (isPublic !== undefined) {
      paramCount++;
      whereConditions.push(`d.is_public = $${paramCount}`);
      values.push(isPublic);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM documents d WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get documents with pagination
    paramCount++;
    values.push(limit);
    paramCount++;
    values.push(offset);

    const result = await query(
      `
      SELECT * FROM documents d
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
      `,
      values
    );

    const documents = result.rows.map((row) => this.mapRowToDocument(row));

    return { documents, total };
  }

  /**
   * Find public documents
   */
  static async findPublicDocuments(
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      tags?: string[];
      organizationId?: string;
    } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    const { limit = 50, offset = 0, search, tags, organizationId } = options;

    let whereConditions = ["d.is_public = true", "d.is_archived = false"];
    const values: any[] = [];
    let paramCount = 0;

    if (organizationId) {
      paramCount++;
      whereConditions.push(`d.organization_id = $${paramCount}`);
      values.push(organizationId);
    }

    if (search) {
      paramCount++;
      whereConditions.push(
        `(d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`
      );
      values.push(`%${search}%`);
    }

    if (tags && tags.length > 0) {
      paramCount++;
      whereConditions.push(`d.tags && $${paramCount}`);
      values.push(tags);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM documents d WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get documents with pagination
    paramCount++;
    values.push(limit);
    paramCount++;
    values.push(offset);

    const result = await query(
      `
      SELECT * FROM documents d
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
      `,
      values
    );

    const documents = result.rows.map((row) => this.mapRowToDocument(row));

    return { documents, total };
  }

  /**
   * Update document
   */
  static async update(
    id: string,
    updateData: UpdateDocumentData
  ): Promise<Document | null> {
    const setFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey =
          key === "fileName"
            ? "file_name"
            : key === "filePath"
              ? "file_path"
              : key === "fileSize"
                ? "file_size"
                : key === "mimeType"
                  ? "mime_type"
                  : key === "pageCount"
                    ? "page_count"
                    : key === "thumbnailPath"
                      ? "thumbnail_path"
                      : key === "previewPaths"
                        ? "preview_paths"
                        : key === "textContent"
                          ? "text_content"
                          : key === "organizationId"
                            ? "organization_id"
                            : key === "createdById"
                              ? "created_by_id"
                              : key === "isPublic"
                                ? "is_public"
                                : key === "isArchived"
                                  ? "is_archived"
                                  : key === "createdAt"
                                    ? "created_at"
                                    : key === "updatedAt"
                                      ? "updated_at"
                                      : key;

        setFields.push(`${dbKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (setFields.length === 0) {
      return this.findById(id);
    }

    // Add updated_at timestamp
    setFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    paramCount++;

    // Add WHERE clause
    values.push(id);

    const queryText = `
      UPDATE documents 
      SET ${setFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Archive document
   */
  static async archive(id: string): Promise<boolean> {
    const result = await query(
      "UPDATE documents SET is_archived = true, updated_at = $1 WHERE id = $2",
      [new Date(), id]
    );

    return result.rowCount > 0;
  }

  /**
   * Delete document permanently
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query("DELETE FROM documents WHERE id = $1", [id]);

    return result.rowCount > 0;
  }

  /**
   * Search documents by text content
   */
  static async searchByContent(
    organizationId: string,
    searchTerm: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    // Get total count
    const countResult = await query(
      `
      SELECT COUNT(*) FROM documents 
      WHERE organization_id = $1 
        AND is_archived = false 
        AND (
          title ILIKE $2 
          OR description ILIKE $2 
          OR text_content ILIKE $2
        )
      `,
      [organizationId, `%${searchTerm}%`]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get documents
    const result = await query(
      `
      SELECT * FROM documents 
      WHERE organization_id = $1 
        AND is_archived = false 
        AND (
          title ILIKE $2 
          OR description ILIKE $2 
          OR text_content ILIKE $2
        )
      ORDER BY 
        CASE 
          WHEN title ILIKE $2 THEN 1
          WHEN description ILIKE $2 THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT $3 OFFSET $4
      `,
      [organizationId, `%${searchTerm}%`, limit, offset]
    );

    const documents = result.rows.map((row) => this.mapRowToDocument(row));

    return { documents, total };
  }

  /**
   * Get document statistics
   */
  static async getStatistics(organizationId: string): Promise<{
    totalDocuments: number;
    totalSize: number;
    documentsByType: Record<string, number>;
    recentUploads: number;
  }> {
    const [totalResult, sizeResult, typeResult, recentResult] =
      await Promise.all([
        query(
          "SELECT COUNT(*) FROM documents WHERE organization_id = $1 AND is_archived = false",
          [organizationId]
        ),
        query(
          "SELECT COALESCE(SUM(file_size), 0) FROM documents WHERE organization_id = $1 AND is_archived = false",
          [organizationId]
        ),
        query(
          `
        SELECT mime_type, COUNT(*) 
        FROM documents 
        WHERE organization_id = $1 AND is_archived = false 
        GROUP BY mime_type
        `,
          [organizationId]
        ),
        query(
          `
        SELECT COUNT(*) 
        FROM documents 
        WHERE organization_id = $1 
          AND is_archived = false 
          AND created_at >= NOW() - INTERVAL '7 days'
        `,
          [organizationId]
        ),
      ]);

    const documentsByType: Record<string, number> = {};
    typeResult.rows.forEach((row) => {
      documentsByType[row.mime_type] = parseInt(row.count);
    });

    return {
      totalDocuments: parseInt(totalResult.rows[0].count),
      totalSize: parseInt(sizeResult.rows[0].coalesce) || 0,
      documentsByType,
      recentUploads: parseInt(recentResult.rows[0].count),
    };
  }

  /**
   * Map database row to Document object
   */
  private static mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: parseInt(row.file_size),
      mimeType: row.mime_type,
      pageCount: row.page_count ? parseInt(row.page_count) : undefined,
      thumbnailPath: row.thumbnail_path,
      previewPaths: row.preview_paths || [],
      textContent: row.text_content,
      metadata: row.metadata || {},
      organizationId: row.organization_id,
      createdById: row.created_by_id,
      isPublic: row.is_public,
      isArchived: row.is_archived,
      tags: row.tags || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
