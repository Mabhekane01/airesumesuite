import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationData {
  name: string;
  domain?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  settings?: Record<string, any>;
}

export interface UpdateOrganizationData {
  name?: string;
  domain?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  settings?: Record<string, any>;
}

export class OrganizationModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new organization
   */
  async create(orgData: CreateOrganizationData): Promise<Organization> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO organizations (id, name, domain, subscription_tier, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        id,
        orgData.name,
        orgData.domain || null,
        orgData.subscriptionTier || 'free',
        JSON.stringify(orgData.settings || {}),
        now,
        now
      ];

      const result = await client.query(query, values);
      const organization = this.mapRowToOrganization(result.rows[0]);
      
      logger.info('Organization created successfully', { 
        organizationId: organization.id, 
        name: organization.name 
      });
      return organization;
    } catch (error) {
      logger.error('Failed to create organization:', error);
      throw new Error('Failed to create organization');
    } finally {
      client.release();
    }
  }

  /**
   * Find organization by ID
   */
  async findById(id: string): Promise<Organization | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM organizations WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToOrganization(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find organization by ID:', error);
      throw new Error('Failed to find organization');
    } finally {
      client.release();
    }
  }

  /**
   * Find organization by domain
   */
  async findByDomain(domain: string): Promise<Organization | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM organizations WHERE domain = $1';
      const result = await client.query(query, [domain]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToOrganization(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find organization by domain:', error);
      throw new Error('Failed to find organization');
    } finally {
      client.release();
    }
  }

  /**
   * Update organization
   */
  async update(id: string, updateData: UpdateOrganizationData): Promise<Organization | null> {
    const client = await this.pool.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      
      if (updateData.domain !== undefined) {
        fields.push(`domain = $${paramCount++}`);
        values.push(updateData.domain);
      }
      
      if (updateData.subscriptionTier !== undefined) {
        fields.push(`subscription_tier = $${paramCount++}`);
        values.push(updateData.subscriptionTier);
      }
      
      if (updateData.settings !== undefined) {
        fields.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(updateData.settings));
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push(`updated_at = $${paramCount++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE organizations 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const organization = this.mapRowToOrganization(result.rows[0]);
      logger.info('Organization updated successfully', { organizationId: organization.id });
      return organization;
    } catch (error) {
      logger.error('Failed to update organization:', error);
      throw new Error('Failed to update organization');
    } finally {
      client.release();
    }
  }

  /**
   * Delete organization
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM organizations WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        return false;
      }
      
      logger.info('Organization deleted successfully', { organizationId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete organization:', error);
      throw new Error('Failed to delete organization');
    } finally {
      client.release();
    }
  }

  /**
   * List organizations with pagination
   */
  async list(page: number = 1, limit: number = 20, filters?: any): Promise<{ organizations: Organization[], total: number }> {
    const client = await this.pool.connect();
    
    try {
      let whereClause = '';
      const values: any[] = [];
      let paramCount = 1;

      if (filters?.subscriptionTier) {
        whereClause += `WHERE subscription_tier = $${paramCount++}`;
        values.push(filters.subscriptionTier);
      }

      if (filters?.search) {
        const searchClause = `name ILIKE $${paramCount++}`;
        whereClause = whereClause ? `${whereClause} AND ${searchClause}` : `WHERE ${searchClause}`;
        values.push(`%${filters.search}%`);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM organizations ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (page - 1) * limit;
      const listQuery = `
        SELECT * FROM organizations 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;
      
      values.push(limit, offset);
      const result = await client.query(listQuery, values);
      
      const organizations = result.rows.map(row => this.mapRowToOrganization(row));
      
      return { organizations, total };
    } catch (error) {
      logger.error('Failed to list organizations:', error);
      throw new Error('Failed to list organizations');
    } finally {
      client.release();
    }
  }

  /**
   * Get organization statistics
   */
  async getStats(): Promise<{ total: number, byTier: Record<string, number> }> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          subscription_tier,
          COUNT(*) as count
        FROM organizations 
        GROUP BY subscription_tier
      `;
      
      const result = await client.query(query);
      
      const stats = {
        total: 0,
        byTier: {} as Record<string, number>
      };
      
      result.rows.forEach(row => {
        stats.total += parseInt(row.count);
        stats.byTier[row.subscription_tier] = parseInt(row.count);
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get organization stats:', error);
      throw new Error('Failed to get organization stats');
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Organization object
   */
  private mapRowToOrganization(row: any): Organization {
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      subscriptionTier: row.subscription_tier,
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}



