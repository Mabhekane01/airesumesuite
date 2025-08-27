import { UserModel, User, CreateUserData, UpdateUserData } from "@/models/User";
import { OrganizationModel, Organization } from "@/models/Organization";
import { pool } from "@/config/database";
import { logger } from "@/utils/logger";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "@/config/environment";

export interface UserWithOrganization extends User {
  organization?: Organization;
  permissions?: string[];
}

export interface AuthResult {
  user: UserWithOrganization;
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class UserService {
  private userModel: UserModel;
  private organizationModel: OrganizationModel;

  constructor() {
    this.userModel = new UserModel(pool);
    this.organizationModel = new OrganizationModel(pool);
  }

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Hash password if provided
      if (userData.passwordHash) {
        userData.passwordHash = await this.hashPassword(userData.passwordHash);
      }

      // Generate API key if not provided
      if (!userData.apiKey) {
        userData.apiKey = `api_${uuidv4().replace(/-/g, '')}`;
      }

      const user = await this.userModel.create(userData);
      
      logger.info("User created successfully", { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logger.error("Failed to create user:", error);
      throw new Error("Failed to create user");
    }
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const user = await this.userModel.findByEmail(credentials.email);
      if (!user || !user.passwordHash) {
        throw new Error("Invalid credentials");
      }

      const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      // Get organization if user has one
      let organization: Organization | undefined;
      if (user.organizationId) {
        organization = await this.organizationModel.findById(user.organizationId);
      }

      const userWithOrg: UserWithOrganization = {
        ...user,
        organization,
        permissions: await this.getUserPermissions(user.id, user.organizationId),
      };

      // Generate JWT tokens
      const token = this.generateJWT(userWithOrg);
      const refreshToken = this.generateRefreshToken(userWithOrg);

      logger.info("User authenticated successfully", { userId: user.id, email: user.email });
      
      return {
        user: userWithOrg,
        token,
        refreshToken,
      };
    } catch (error) {
      logger.error("Authentication failed:", error);
      throw new Error("Authentication failed");
    }
  }

  /**
   * Get user by ID with organization and permissions
   */
  async getUserById(userId: string): Promise<UserWithOrganization | null> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        return null;
      }

      let organization: Organization | undefined;
      if (user.organizationId) {
        organization = await this.organizationModel.findById(user.organizationId);
      }

      const userWithOrg: UserWithOrganization = {
        ...user,
        organization,
        permissions: await this.getUserPermissions(user.id, user.organizationId),
      };

      return userWithOrg;
    } catch (error) {
      logger.error("Failed to get user:", error);
      throw new Error("Failed to get user");
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateData: UpdateUserData): Promise<User> {
    try {
      // Hash password if it's being updated
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }

      const updatedUser = await this.userModel.update(userId, updateData);
      
      logger.info("User updated successfully", { userId });
      return updatedUser;
    } catch (error) {
      logger.error("Failed to update user:", error);
      throw new Error("Failed to update user");
    }
  }

  /**
   * Get user permissions based on role and organization
   */
  private async getUserPermissions(userId: string, organizationId?: string): Promise<string[]> {
    const permissions: string[] = [];

    try {
      if (organizationId) {
        // Get organization member role
        const member = await this.organizationModel.getMember(userId, organizationId);
        if (member) {
          switch (member.role) {
            case 'owner':
              permissions.push('admin', 'manage_organization', 'manage_members', 'manage_documents', 'view_analytics');
              break;
            case 'admin':
              permissions.push('manage_members', 'manage_documents', 'view_analytics');
              break;
            case 'member':
              permissions.push('manage_documents', 'view_analytics');
              break;
            case 'viewer':
              permissions.push('view_documents', 'view_analytics');
              break;
          }
        }
      }

      // Add basic user permissions
      permissions.push('manage_own_documents', 'view_own_analytics');

      return permissions;
    } catch (error) {
      logger.warn("Failed to get user permissions:", error);
      return ['manage_own_documents', 'view_own_analytics'];
    }
  }

  /**
   * Generate JWT token
   */
  private generateJWT(user: UserWithOrganization): string {
    const payload = {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      permissions: user.permissions,
      subscriptionTier: user.subscriptionTier,
    };

    return jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: UserWithOrganization): string {
    const payload = {
      userId: user.id,
      tokenType: 'refresh',
    };

    return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error("Invalid refresh token");
      }

      const user = await this.getUserById(decoded.userId);
      if (!user) {
        throw new Error("User not found");
      }

      const newToken = this.generateJWT(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      logger.error("Token refresh failed:", error);
      throw new Error("Token refresh failed");
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return false;
      }

      return user.permissions?.includes(permission) || false;
    } catch (error) {
      logger.error("Permission check failed:", error);
      return false;
    }
  }

  /**
   * Get users by organization
   */
  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    try {
      return await this.userModel.findByOrganization(organizationId);
    } catch (error) {
      logger.error("Failed to get organization users:", error);
      throw new Error("Failed to get organization users");
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await this.userModel.delete(userId);
      logger.info("User deleted successfully", { userId });
    } catch (error) {
      logger.error("Failed to delete user:", error);
      throw new Error("Failed to delete user");
    }
  }
}
