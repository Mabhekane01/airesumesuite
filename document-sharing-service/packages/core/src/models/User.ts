import { query } from "../database/connection";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  role: "owner" | "admin" | "member" | "viewer";
  permissions: string[];
  subscriptionTier: "free" | "pro" | "enterprise";
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  role?: "owner" | "admin" | "member" | "viewer";
  subscriptionTier?: "free" | "pro" | "enterprise";
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  role?: "owner" | "admin" | "member" | "viewer";
  permissions?: string[];
  subscriptionTier?: "free" | "pro" | "enterprise";
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UserWithOrganization extends User {
  organization?: {
    id: string;
    name: string;
    domain?: string;
    settings: Record<string, any>;
  };
}

export class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const now = new Date();

    const user: User = {
      id,
      email: userData.email.toLowerCase(),
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      organizationId: userData.organizationId,
      role: userData.role || "member",
      permissions: this.getDefaultPermissions(userData.role || "member"),
      subscriptionTier: userData.subscriptionTier || "free",
      isActive: true,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    await query(
      `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, organization_id,
        role, permissions, subscription_tier, is_active, email_verified,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.firstName,
        user.lastName,
        user.organizationId,
        user.role,
        user.permissions,
        user.subscriptionTier,
        user.isActive,
        user.emailVerified,
        user.createdAt,
        user.updatedAt,
      ]
    );

    return user;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const result = await query(
      "SELECT * FROM users WHERE id = $1 AND is_active = true",
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Find user with organization details
   */
  static async findByIdWithOrganization(
    id: string
  ): Promise<UserWithOrganization | null> {
    const result = await query(
      `
      SELECT u.*, o.name as org_name, o.domain, o.settings as org_settings
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1 AND u.is_active = true
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const user = this.mapRowToUser(row);

    if (row.organization_id) {
      return {
        ...user,
        organization: {
          id: row.organization_id,
          name: row.org_name,
          domain: row.domain,
          settings: row.org_settings || {},
        },
      };
    }

    return user;
  }

  /**
   * Update user
   */
  static async update(
    id: string,
    updateData: UpdateUserData
  ): Promise<User | null> {
    const setFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey =
          key === "firstName"
            ? "first_name"
            : key === "lastName"
              ? "last_name"
              : key === "organizationId"
                ? "organization_id"
                : key === "subscriptionTier"
                  ? "subscription_tier"
                  : key === "emailVerified"
                    ? "email_verified"
                    : key === "lastLoginAt"
                      ? "last_login_at"
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
      UPDATE users 
      SET ${setFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string): Promise<void> {
    await query(
      "UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2",
      [new Date(), id]
    );
  }

  /**
   * Delete user (soft delete)
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query(
      "UPDATE users SET is_active = false, updated_at = $1 WHERE id = $2",
      [new Date(), id]
    );

    return result.rowCount > 0;
  }

  /**
   * Find users by organization
   */
  static async findByOrganization(organizationId: string): Promise<User[]> {
    const result = await query(
      "SELECT * FROM users WHERE organization_id = $1 AND is_active = true ORDER BY created_at DESC",
      [organizationId]
    );

    return result.rows.map((row) => this.mapRowToUser(row));
  }

  /**
   * Verify password
   */
  static async verifyPassword(
    userId: string,
    password: string
  ): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    newPassword: string
  ): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await query(
      "UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3",
      [passwordHash, new Date(), userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Get default permissions for role
   */
  private static getDefaultPermissions(role: string): string[] {
    switch (role) {
      case "owner":
        return [
          "manage_organization",
          "manage_members",
          "manage_documents",
          "view_analytics",
          "manage_integrations",
          "manage_billing",
        ];
      case "admin":
        return [
          "manage_members",
          "manage_documents",
          "view_analytics",
          "manage_integrations",
        ];
      case "member":
        return ["manage_documents", "view_analytics"];
      case "viewer":
        return ["view_documents", "view_analytics"];
      default:
        return [];
    }
  }

  /**
   * Map database row to User object
   */
  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      organizationId: row.organization_id,
      role: row.role,
      permissions: row.permissions || [],
      subscriptionTier: row.subscription_tier,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
