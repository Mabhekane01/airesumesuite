import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export interface DocumentShare {
  id: string;
  documentId: string;
  userId: string;
  organizationId?: string;
  title: string;
  description?: string;
  password?: string;
  expiresAt?: Date;
  settings: {
    allowDownload: boolean;
    allowPrint: boolean;
    trackViews: boolean;
    notifyOnView: boolean;
    watermark?: string;
    accessList?: string[];
  };
  shareUrl: string;
  shareId: string;
  status: 'active' | 'expired' | 'revoked';
  viewCount: number;
  downloadCount: number;
  printCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentShareData {
  documentId: string;
  userId: string;
  organizationId?: string;
  title: string;
  description?: string;
  password?: string;
  expiresAt?: Date;
  settings?: {
    allowDownload?: boolean;
    allowPrint?: boolean;
    trackViews?: boolean;
    notifyOnView?: boolean;
    watermark?: string;
    accessList?: string[];
  };
}

export interface UpdateDocumentShareData {
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: Date;
  settings?: {
    allowDownload?: boolean;
    allowPrint?: boolean;
    trackViews?: boolean;
    notifyOnView?: boolean;
    watermark?: string;
    accessList?: string[];
  };
  status?: 'active' | 'expired' | 'revoked';
}

export class DocumentShareModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new document share
   */
  async create(shareData: CreateDocumentShareData): Promise<DocumentShare> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const shareId = this.generateShareId();
      const now = new Date();
      
      const query = `
        INSERT INTO document_shares (
          id, document_id, user_id, organization_id, title, description, password,
          expires_at, settings, share_url, share_id, status, view_count,
          download_count, print_count, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;
      
      const values = [
        id,
        shareData.documentId,
        shareData.userId,
        shareData.organizationId || null,
        shareData.title,
        shareData.description || null,
        shareData.password || null,
        shareData.expiresAt || null,
        JSON.stringify(shareData.settings || {}),
        `/view/${shareId}`,
        shareId,
        'active',
        0,
        0,
        0,
        now,
        now
      ];

      const result = await client.query(query, values);
      const share = this.mapRowToDocumentShare(result.rows[0]);
      
      logger.info('Document share created successfully', { 
        shareId: share.id, 
        documentId: share.documentId,
        shareUrl: share.shareUrl
      });
      return share;
    } catch (error) {
      logger.error('Failed to create document share:', error);
      throw new Error('Failed to create document share');
    } finally {
      client.release();
    }
  }

  /**
   * Find share by ID
   */
  async findById(id: string): Promise<DocumentShare | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM document_shares WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToDocumentShare(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find share by ID:', error);
      throw new Error('Failed to find share');
    } finally {
      client.release();
    }
  }

  /**
   * Find share by share ID (public identifier)
   */
  async findByShareId(shareId: string): Promise<DocumentShare | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM document_shares WHERE share_id = $1 AND status = \'active\'';
      const result = await client.query(query, [shareId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToDocumentShare(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find share by share ID:', error);
      throw new Error('Failed to find share');
    } finally {
      client.release();
    }
  }

  /**
   * Find shares by document ID
   */
  async findByDocumentId(documentId: string): Promise<DocumentShare[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM document_shares 
        WHERE document_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [documentId]);
      return result.rows.map(row => this.mapRowToDocumentShare(row));
    } catch (error) {
      logger.error('Failed to find shares by document ID:', error);
      throw new Error('Failed to find shares');
    } finally {
      client.release();
    }
  }

  /**
   * Find shares by user ID
   */
  async findByUserId(userId: string): Promise<DocumentShare[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM document_shares 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.map(row => this.mapRowToDocumentShare(row));
    } catch (error) {
      logger.error('Failed to find shares by user ID:', error);
      throw new Error('Failed to find shares');
    } finally {
      client.release();
    }
  }

  /**
   * Update share
   */
  async update(id: string, updateData: UpdateDocumentShareData): Promise<DocumentShare | null> {
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
      
      if (updateData.password !== undefined) {
        fields.push(`password = $${paramCount++}`);
        values.push(updateData.password);
      }
      
      if (updateData.expiresAt !== undefined) {
        fields.push(`expires_at = $${paramCount++}`);
        values.push(updateData.expiresAt);
      }
      
      if (updateData.settings !== undefined) {
        fields.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(updateData.settings));
      }
      
      if (updateData.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updateData.status);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push(`updated_at = $${paramCount++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE document_shares 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const share = this.mapRowToDocumentShare(result.rows[0]);
      logger.info('Document share updated successfully', { shareId: share.id });
      return share;
    } catch (error) {
      logger.error('Failed to update document share:', error);
      throw new Error('Failed to update document share');
    } finally {
      client.release();
    }
  }

  /**
   * Delete share
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM document_shares WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        return false;
      }
      
      logger.info('Document share deleted successfully', { shareId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete document share:', error);
      throw new Error('Failed to delete document share');
    } finally {
      client.release();
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(shareId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE document_shares 
        SET view_count = view_count + 1, updated_at = NOW()
        WHERE share_id = $1
      `;
      
      await client.query(query, [shareId]);
    } catch (error) {
      logger.error('Failed to increment view count:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(shareId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE document_shares 
        SET download_count = download_count + 1, updated_at = NOW()
        WHERE share_id = $1
      `;
      
      await client.query(query, [shareId]);
    } catch (error) {
      logger.error('Failed to increment download count:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Increment print count
   */
  async incrementPrintCount(shareId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE document_shares 
        SET print_count = print_count + 1, updated_at = NOW()
        WHERE share_id = $1
      `;
      
      await client.query(query, [shareId]);
    } catch (error) {
      logger.error('Failed to increment print count:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Check if share is expired
   */
  async isExpired(shareId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT expires_at FROM document_shares 
        WHERE share_id = $1 AND status = 'active'
      `;
      
      const result = await client.query(query, [shareId]);
      
      if (result.rows.length === 0) {
        return true;
      }
      
      const expiresAt = result.rows[0].expires_at;
      if (!expiresAt) {
        return false; // No expiration date
      }
      
      return new Date(expiresAt) < new Date();
    } catch (error) {
      logger.error('Failed to check if share is expired:', error);
      return true; // Assume expired on error
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique share ID
   */
  private generateShareId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Map database row to DocumentShare object
   */
  private mapRowToDocumentShare(row: any): DocumentShare {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      organizationId: row.organization_id,
      title: row.title,
      description: row.description,
      password: row.password,
      expiresAt: row.expires_at,
      settings: row.settings || {},
      shareUrl: row.share_url,
      shareId: row.share_id,
      status: row.status,
      viewCount: row.view_count,
      downloadCount: row.download_count,
      printCount: row.print_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}



