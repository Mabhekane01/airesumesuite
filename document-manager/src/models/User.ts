import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  customDomain?: string;
  brandLogoUrl?: string;
  brandColors: Record<string, any>;
  apiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  customDomain?: string;
  brandLogoUrl?: string;
  brandColors?: Record<string, any>;
}

export interface UpdateUserData {
  name?: string;
  passwordHash?: string;
  avatarUrl?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  customDomain?: string;
  brandLogoUrl?: string;
  brandColors?: Record<string, any>;
  apiKey?: string;
}

export class UserModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new user
   */
  async create(userData: CreateUserData): Promise<User> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO users (id, email, name, password_hash, subscription_tier, custom_domain, brand_logo_url, brand_colors, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        id,
        userData.email,
        userData.name,
        userData.passwordHash || null,
        userData.subscriptionTier || 'free',
        userData.customDomain || null,
        userData.brandLogoUrl || null,
        JSON.stringify(userData.brandColors || {}),
        now,
        now
      ];

      const result = await client.query(query, values);
      const user = this.mapRowToUser(result.rows[0]);
      
      logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw new Error('Failed to create user');
    } finally {
      client.release();
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE id = $1 AND status != \'deleted\'';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find user by ID:', error);
      throw new Error('Failed to find user');
    } finally {
      client.release();
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE email = $1 AND status != \'deleted\'';
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find user by email:', error);
      throw new Error('Failed to find user');
    } finally {
      client.release();
    }
  }

  /**
   * Find user by API key
   */
  async findByApiKey(apiKey: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE api_key = $1 AND status != \'deleted\'';
      const result = await client.query(query, [apiKey]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find user by API key:', error);
      throw new Error('Failed to find user');
    } finally {
      client.release();
    }
  }

  /**
   * Update user
   */
  async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      
      if (updateData.avatarUrl !== undefined) {
        fields.push(`avatar_url = $${paramCount++}`);
        values.push(updateData.avatarUrl);
      }
      
      if (updateData.subscriptionTier !== undefined) {
        fields.push(`subscription_tier = $${paramCount++}`);
        values.push(updateData.subscriptionTier);
      }
      
      if (updateData.customDomain !== undefined) {
        fields.push(`custom_domain = $${paramCount++}`);
        values.push(updateData.customDomain);
      }
      
      if (updateData.brandLogoUrl !== undefined) {
        fields.push(`brand_logo_url = $${paramCount++}`);
        values.push(updateData.brandLogoUrl);
      }
      
      if (updateData.brandColors !== undefined) {
        fields.push(`brand_colors = $${paramCount++}`);
        values.push(JSON.stringify(updateData.brandColors));
      }
      
      if (updateData.apiKey !== undefined) {
        fields.push(`api_key = $${paramCount++}`);
        values.push(updateData.apiKey);
      }
      
      if (updateData.passwordHash !== undefined) {
        fields.push(`password_hash = $${paramCount++}`);
        values.push(updateData.passwordHash);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push(`updated_at = $${paramCount++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = this.mapRowToUser(result.rows[0]);
      logger.info('User updated successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw new Error('Failed to update user');
    } finally {
      client.release();
    }
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = 'UPDATE users SET status = \'deleted\', updated_at = NOW() WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        return false;
      }
      
      logger.info('User deleted successfully', { userId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw new Error('Failed to delete user');
    } finally {
      client.release();
    }
  }

  /**
   * List users with pagination
   */
  async list(page: number = 1, limit: number = 20, filters?: any): Promise<{ users: User[], total: number }> {
    const client = await this.pool.connect();
    
    try {
      let whereClause = 'WHERE status != \'deleted\'';
      const values: any[] = [];
      let paramCount = 1;

      if (filters?.subscriptionTier) {
        whereClause += ` AND subscription_tier = $${paramCount++}`;
        values.push(filters.subscriptionTier);
      }

      if (filters?.search) {
        whereClause += ` AND (name ILIKE $${paramCount++} OR email ILIKE $${paramCount++})`;
        values.push(`%${filters.search}%`);
        values.push(`%${filters.search}%`);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (page - 1) * limit;
      const listQuery = `
        SELECT * FROM users 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;
      
      values.push(limit, offset);
      const result = await client.query(listQuery, values);
      
      const users = result.rows.map(row => this.mapRowToUser(row));
      
      return { users, total };
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw new Error('Failed to list users');
    } finally {
      client.release();
    }
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<{ total: number, byTier: Record<string, number> }> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          subscription_tier,
          COUNT(*) as count
        FROM users 
        WHERE status != 'deleted'
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
      logger.error('Failed to get user stats:', error);
      throw new Error('Failed to get user stats');
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      avatarUrl: row.avatar_url,
      subscriptionTier: row.subscription_tier,
      customDomain: row.custom_domain,
      brandLogoUrl: row.brand_logo_url,
      brandColors: row.brand_colors || {},
      apiKey: row.api_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}




