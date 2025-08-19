import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export interface Document {
  id: string;
  userId: string;
  organizationId?: string;
  folderId?: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  fileUrl: string;
  filePath: string;
  storageProvider: 'local' | 's3' | 'gcs' | 'azure';
  pageCount?: number;
  thumbnailUrl?: string;
  previewImages?: string[];
  textContent?: string;
  version: number;
  parentDocumentId?: string;
  status: 'active' | 'archived' | 'deleted';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  source: 'upload' | 'ai_resume' | 'pdf_editor' | 'api';
  sourceMetadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentData {
  userId: string;
  organizationId?: string;
  folderId?: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  fileUrl: string;
  filePath: string;
  storageProvider?: 'local' | 's3' | 'gcs' | 'azure';
  pageCount?: number;
  thumbnailUrl?: string;
  previewImages?: string[];
  textContent?: string;
  source?: 'upload' | 'ai_resume' | 'pdf_editor' | 'api';
  sourceMetadata?: Record<string, any>;
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  folderId?: string;
  pageCount?: number;
  thumbnailUrl?: string;
  previewImages?: string[];
  textContent?: string;
  status?: 'active' | 'archived' | 'deleted';
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  sourceMetadata?: Record<string, any>;
}

export interface DocumentFilters {
  userId?: string;
  organizationId?: string;
  folderId?: string;
  fileType?: string;
  status?: string;
  processingStatus?: string;
  source?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DocumentSort {
  field: 'title' | 'fileSize' | 'createdAt' | 'updatedAt' | 'fileType';
  direction: 'asc' | 'desc';
}

export class DocumentModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new document
   */
  async create(documentData: CreateDocumentData): Promise<Document> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO documents (
          id, user_id, organization_id, folder_id, title, description, file_name, 
          file_size, file_type, mime_type, file_url, file_path, storage_provider,
          page_count, thumbnail_url, preview_images, text_content, version,
          parent_document_id, status, processing_status, source, source_metadata,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *
      `;
      
      const values = [
        id,
        documentData.userId,
        documentData.organizationId || null,
        documentData.folderId || null,
        documentData.title,
        documentData.description || null,
        documentData.fileName,
        documentData.fileSize,
        documentData.fileType,
        documentData.mimeType,
        documentData.fileUrl,
        documentData.filePath,
        documentData.storageProvider || 'local',
        documentData.pageCount || null,
        documentData.thumbnailUrl || null,
        documentData.previewImages || null,
        documentData.textContent || null,
        1, // version
        null, // parent_document_id
        'active', // status
        'pending', // processing_status
        documentData.source || 'upload',
        JSON.stringify(documentData.sourceMetadata || {}),
        now,
        now
      ];

      const result = await client.query(query, values);
      const document = this.mapRowToDocument(result.rows[0]);
      
      logger.info('Document created successfully', { 
        documentId: document.id, 
        userId: document.userId,
        fileName: document.fileName 
      });
      return document;
    } catch (error) {
      logger.error('Failed to create document:', error);
      throw new Error('Failed to create document');
    } finally {
      client.release();
    }
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<Document | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM documents WHERE id = $1 AND status != \'deleted\'';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find document by ID:', error);
      throw new Error('Failed to find document');
    } finally {
      client.release();
    }
  }

  /**
   * Find documents by user ID
   */
  async findByUserId(userId: string, page: number = 1, limit: number = 20): Promise<{ documents: Document[], total: number }> {
    const client = await this.pool.connect();
    
    try {
      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM documents WHERE user_id = $1 AND status != \'deleted\'';
      const countResult = await client.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (page - 1) * limit;
      const listQuery = `
        SELECT * FROM documents 
        WHERE user_id = $1 AND status != 'deleted'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(listQuery, [userId, limit, offset]);
      const documents = result.rows.map(row => this.mapRowToDocument(row));
      
      return { documents, total };
    } catch (error) {
      logger.error('Failed to find documents by user ID:', error);
      throw new Error('Failed to find documents');
    } finally {
      client.release();
    }
  }

  /**
   * Find documents by organization ID
   */
  async findByOrganizationId(organizationId: string, page: number = 1, limit: number = 20): Promise<{ documents: Document[], total: number }> {
    const client = await this.pool.connect();
    
    try {
      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM documents WHERE organization_id = $1 AND status != \'deleted\'';
      const countResult = await client.query(countQuery, [organizationId]);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (page - 1) * limit;
      const listQuery = `
        SELECT * FROM documents 
        WHERE organization_id = $1 AND status != 'deleted'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(listQuery, [organizationId, limit, offset]);
      const documents = result.rows.map(row => this.mapRowToDocument(row));
      
      return { documents, total };
    } catch (error) {
      logger.error('Failed to find documents by organization ID:', error);
      throw new Error('Failed to find documents');
    } finally {
      client.release();
    }
  }

  /**
   * Search documents with filters, sorting, and pagination
   */
  async search(
    filters: DocumentFilters,
    sort: DocumentSort = { field: 'createdAt', direction: 'desc' },
    page: number = 1,
    limit: number = 20
  ): Promise<{ documents: Document[], total: number }> {
    const client = await this.pool.connect();
    
    try {
      let whereClause = 'WHERE status != \'deleted\'';
      const values: any[] = [];
      let paramCount = 1;

      if (filters.userId) {
        whereClause += ` AND user_id = $${paramCount++}`;
        values.push(filters.userId);
      }

      if (filters.organizationId) {
        whereClause += ` AND organization_id = $${paramCount++}`;
        values.push(filters.organizationId);
      }

      if (filters.folderId) {
        whereClause += ` AND folder_id = $${paramCount++}`;
        values.push(filters.folderId);
      }

      if (filters.fileType) {
        whereClause += ` AND file_type = $${paramCount++}`;
        values.push(filters.fileType);
      }

      if (filters.status) {
        whereClause += ` AND status = $${paramCount++}`;
        values.push(filters.status);
      }

      if (filters.processingStatus) {
        whereClause += ` AND processing_status = $${paramCount++}`;
        values.push(filters.processingStatus);
      }

      if (filters.source) {
        whereClause += ` AND source = $${paramCount++}`;
        values.push(filters.source);
      }

      if (filters.search) {
        whereClause += ` AND (title ILIKE $${paramCount++} OR description ILIKE $${paramCount++} OR text_content ILIKE $${paramCount++})`;
        values.push(`%${filters.search}%`);
        values.push(`%${filters.search}%`);
        values.push(`%${filters.search}%`);
      }

      if (filters.dateFrom) {
        whereClause += ` AND created_at >= $${paramCount++}`;
        values.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereClause += ` AND created_at <= $${paramCount++}`;
        values.push(filters.dateTo);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM documents ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results with sorting
      const offset = (page - 1) * limit;
      const orderByField = this.getOrderByField(sort.field);
      const listQuery = `
        SELECT * FROM documents 
        ${whereClause}
        ORDER BY ${orderByField} ${sort.direction.toUpperCase()}
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;
      
      values.push(limit, offset);
      const result = await client.query(listQuery, values);
      
      const documents = result.rows.map(row => this.mapRowToDocument(row));
      
      return { documents, total };
    } catch (error) {
      logger.error('Failed to search documents:', error);
      throw new Error('Failed to search documents');
    } finally {
      client.release();
    }
  }

  /**
   * Update document
   */
  async update(id: string, updateData: UpdateDocumentData): Promise<Document | null> {
    const client = await this.pool.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.title !== undefined) {
        fields.push(`title = $${paramCount++}`);
        values.push(updateData.title);
      }
      
      if (updateData.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updateData.description);
      }
      
      if (updateData.folderId !== undefined) {
        fields.push(`folder_id = $${paramCount++}`);
        values.push(updateData.folderId);
      }
      
      if (updateData.pageCount !== undefined) {
        fields.push(`page_count = $${paramCount++}`);
        values.push(updateData.pageCount);
      }
      
      if (updateData.thumbnailUrl !== undefined) {
        fields.push(`thumbnail_url = $${paramCount++}`);
        values.push(updateData.thumbnailUrl);
      }
      
      if (updateData.previewImages !== undefined) {
        fields.push(`preview_images = $${paramCount++}`);
        values.push(updateData.previewImages);
      }
      
      if (updateData.textContent !== undefined) {
        fields.push(`text_content = $${paramCount++}`);
        values.push(updateData.textContent);
      }
      
      if (updateData.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updateData.status);
      }
      
      if (updateData.processingStatus !== undefined) {
        fields.push(`processing_status = $${paramCount++}`);
        values.push(updateData.processingStatus);
      }
      
      if (updateData.sourceMetadata !== undefined) {
        fields.push(`source_metadata = $${paramCount++}`);
        values.push(JSON.stringify(updateData.sourceMetadata));
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push(`updated_at = $${paramCount++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE documents 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const document = this.mapRowToDocument(result.rows[0]);
      logger.info('Document updated successfully', { documentId: document.id });
      return document;
    } catch (error) {
      logger.error('Failed to update document:', error);
      throw new Error('Failed to update document');
    } finally {
      client.release();
    }
  }

  /**
   * Delete document (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = 'UPDATE documents SET status = \'deleted\', updated_at = NOW() WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        return false;
      }
      
      logger.info('Document deleted successfully', { documentId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw new Error('Failed to delete document');
    } finally {
      client.release();
    }
  }

  /**
   * Get document statistics
   */
  async getStats(userId?: string, organizationId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    totalSize: number;
    averageSize: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      let whereClause = 'WHERE status != \'deleted\'';
      const values: any[] = [];

      if (userId) {
        whereClause += ' AND user_id = $1';
        values.push(userId);
      }

      if (organizationId) {
        whereClause += userId ? ' AND organization_id = $2' : ' AND organization_id = $1';
        values.push(organizationId);
      }

      const query = `
        SELECT 
          COUNT(*) as total,
          file_type,
          COUNT(*) as count,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size
        FROM documents 
        ${whereClause}
        GROUP BY file_type
      `;
      
      const result = await client.query(query, values);
      
      const stats = {
        total: 0,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        totalSize: 0,
        averageSize: 0
      };
      
      result.rows.forEach(row => {
        stats.total += parseInt(row.count);
        stats.byType[row.file_type] = parseInt(row.count);
        stats.totalSize += parseInt(row.total_size || 0);
      });
      
      stats.averageSize = stats.total > 0 ? stats.totalSize / stats.total : 0;
      
      return stats;
    } catch (error) {
      logger.error('Failed to get document stats:', error);
      throw new Error('Failed to get document stats');
    } finally {
      client.release();
    }
  }

  /**
   * Get order by field for SQL query
   */
  private getOrderByField(field: string): string {
    const fieldMap: Record<string, string> = {
      title: 'title',
      fileSize: 'file_size',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      fileType: 'file_type'
    };
    
    return fieldMap[field] || 'created_at';
  }

  /**
   * Map database row to Document object
   */
  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      folderId: row.folder_id,
      title: row.title,
      description: row.description,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileType: row.file_type,
      mimeType: row.mime_type,
      fileUrl: row.file_url,
      filePath: row.file_path,
      storageProvider: row.storage_provider,
      pageCount: row.page_count,
      thumbnailUrl: row.thumbnail_url,
      previewImages: row.preview_images || [],
      textContent: row.text_content,
      version: row.version,
      parentDocumentId: row.parent_document_id,
      status: row.status,
      processingStatus: row.processing_status,
      source: row.source,
      sourceMetadata: row.source_metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}




