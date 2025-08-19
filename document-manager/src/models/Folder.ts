import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export interface Folder {
  id: string;
  userId: string;
  organizationId?: string;
  parentFolderId?: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFolderData {
  userId: string;
  organizationId?: string;
  parentFolderId?: string;
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateFolderData {
  name?: string;
  description?: string;
  color?: string;
  parentFolderId?: string;
}

export interface FolderTree {
  folder: Folder;
  children: FolderTree[];
  documentCount: number;
}

export class FolderModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new folder
   */
  async create(folderData: CreateFolderData): Promise<Folder> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO folders (id, user_id, organization_id, parent_folder_id, name, description, color, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        id,
        folderData.userId,
        folderData.organizationId || null,
        folderData.parentFolderId || null,
        folderData.name,
        folderData.description || null,
        folderData.color || null,
        now,
        now
      ];

      const result = await client.query(query, values);
      const folder = this.mapRowToFolder(result.rows[0]);
      
      logger.info('Folder created successfully', { 
        folderId: folder.id, 
        userId: folder.userId,
        name: folder.name 
      });
      return folder;
    } catch (error) {
      logger.error('Failed to create folder:', error);
      throw new Error('Failed to create folder');
    } finally {
      client.release();
    }
  }

  /**
   * Find folder by ID
   */
  async findById(id: string): Promise<Folder | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM folders WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToFolder(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find folder by ID:', error);
      throw new Error('Failed to find folder');
    } finally {
      client.release();
    }
  }

  /**
   * Find folders by user ID
   */
  async findByUserId(userId: string): Promise<Folder[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM folders 
        WHERE user_id = $1
        ORDER BY name ASC
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.map(row => this.mapRowToFolder(row));
    } catch (error) {
      logger.error('Failed to find folders by user ID:', error);
      throw new Error('Failed to find folders');
    } finally {
      client.release();
    }
  }

  /**
   * Find folders by organization ID
   */
  async findByOrganizationId(organizationId: string): Promise<Folder[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM folders 
        WHERE organization_id = $1
        ORDER BY name ASC
      `;
      
      const result = await client.query(query, [organizationId]);
      return result.rows.map(row => this.mapRowToFolder(row));
    } catch (error) {
      logger.error('Failed to find folders by organization ID:', error);
      throw new Error('Failed to find folders');
    } finally {
      client.release();
    }
  }

  /**
   * Find child folders
   */
  async findChildren(parentFolderId: string): Promise<Folder[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM folders 
        WHERE parent_folder_id = $1
        ORDER BY name ASC
      `;
      
      const result = await client.query(query, [parentFolderId]);
      return result.rows.map(row => this.mapRowToFolder(row));
    } catch (error) {
      logger.error('Failed to find child folders:', error);
      throw new Error('Failed to find child folders');
    } finally {
      client.release();
    }
  }

  /**
   * Get folder tree structure
   */
  async getFolderTree(userId: string, organizationId?: string): Promise<FolderTree[]> {
    const client = await this.pool.connect();
    
    try {
      // Get all folders for user/organization
      let whereClause = 'WHERE user_id = $1';
      const values = [userId];
      
      if (organizationId) {
        whereClause += ' AND organization_id = $2';
        values.push(organizationId);
      }
      
      const query = `
        SELECT * FROM folders 
        ${whereClause}
        ORDER BY name ASC
      `;
      
      const result = await client.query(query, values);
      const folders = result.rows.map(row => this.mapRowToFolder(row));
      
      // Get document counts for each folder
      const documentCounts = await this.getDocumentCounts(folders.map(f => f.id), client);
      
      // Build tree structure
      const folderMap = new Map<string, FolderTree>();
      const rootFolders: FolderTree[] = [];
      
      // Initialize all folders
      folders.forEach(folder => {
        folderMap.set(folder.id, {
          folder,
          children: [],
          documentCount: documentCounts[folder.id] || 0
        });
      });
      
      // Build parent-child relationships
      folders.forEach(folder => {
        const folderTree = folderMap.get(folder.id)!;
        
        if (folder.parentFolderId) {
          const parent = folderMap.get(folder.parentFolderId);
          if (parent) {
            parent.children.push(folderTree);
          }
        } else {
          rootFolders.push(folderTree);
        }
      });
      
      return rootFolders;
    } catch (error) {
      logger.error('Failed to get folder tree:', error);
      throw new Error('Failed to get folder tree');
    } finally {
      client.release();
    }
  }

  /**
   * Update folder
   */
  async update(id: string, updateData: UpdateFolderData): Promise<Folder | null> {
    const client = await this.pool.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      
      if (updateData.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updateData.description);
      }
      
      if (updateData.color !== undefined) {
        fields.push(`color = $${paramCount++}`);
        values.push(updateData.color);
      }
      
      if (updateData.parentFolderId !== undefined) {
        // Check for circular references
        if (updateData.parentFolderId === id) {
          throw new Error('Folder cannot be its own parent');
        }
        
        if (updateData.parentFolderId) {
          const wouldCreateCycle = await this.wouldCreateCycle(id, updateData.parentFolderId, client);
          if (wouldCreateCycle) {
            throw new Error('Moving folder would create a circular reference');
          }
        }
        
        fields.push(`parent_folder_id = $${paramCount++}`);
        values.push(updateData.parentFolderId);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push(`updated_at = $${paramCount++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE folders 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const folder = this.mapRowToFolder(result.rows[0]);
      logger.info('Folder updated successfully', { folderId: folder.id });
      return folder;
    } catch (error) {
      logger.error('Failed to update folder:', error);
      throw new Error('Failed to update folder');
    } finally {
      client.release();
    }
  }

  /**
   * Delete folder and move documents to parent or root
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get folder info
      const folder = await this.findById(id);
      if (!folder) {
        await client.query('ROLLBACK');
        return false;
      }
      
      // Move documents to parent folder or root
      const newParentId = folder.parentFolderId || null;
      await client.query(
        'UPDATE documents SET folder_id = $1, updated_at = NOW() WHERE folder_id = $2',
        [newParentId, id]
      );
      
      // Move child folders to parent
      await client.query(
        'UPDATE folders SET parent_folder_id = $1, updated_at = NOW() WHERE parent_folder_id = $2',
        [newParentId, id]
      );
      
      // Delete the folder
      await client.query('DELETE FROM folders WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      logger.info('Folder deleted successfully', { folderId: id });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete folder:', error);
      throw new Error('Failed to delete folder');
    } finally {
      client.release();
    }
  }

  /**
   * Check if moving a folder would create a circular reference
   */
  private async wouldCreateCycle(folderId: string, newParentId: string, client: PoolClient): Promise<boolean> {
    let currentParentId = newParentId;
    
    while (currentParentId) {
      if (currentParentId === folderId) {
        return true; // Would create cycle
      }
      
      const result = await client.query(
        'SELECT parent_folder_id FROM folders WHERE id = $1',
        [currentParentId]
      );
      
      if (result.rows.length === 0) {
        break;
      }
      
      currentParentId = result.rows[0].parent_folder_id;
    }
    
    return false;
  }

  /**
   * Get document counts for folders
   */
  private async getDocumentCounts(folderIds: string[], client: PoolClient): Promise<Record<string, number>> {
    if (folderIds.length === 0) {
      return {};
    }
    
    try {
      const placeholders = folderIds.map((_, index) => `$${index + 1}`).join(',');
      const query = `
        SELECT folder_id, COUNT(*) as count
        FROM documents 
        WHERE folder_id IN (${placeholders}) AND status != 'deleted'
        GROUP BY folder_id
      `;
      
      const result = await client.query(query, folderIds);
      
      const counts: Record<string, number> = {};
      result.rows.forEach(row => {
        counts[row.folder_id] = parseInt(row.count);
      });
      
      return counts;
    } catch (error) {
      logger.error('Failed to get document counts:', error);
      return {};
    }
  }

  /**
   * Map database row to Folder object
   */
  private mapRowToFolder(row: any): Folder {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      parentFolderId: row.parent_folder_id,
      name: row.name,
      description: row.description,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}




