import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';
import { Config } from '../config/environment';

export class AuthController {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel();
  }

  /**
   * User registration
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, organizationName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: email, password, firstName, lastName'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await this.userModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const userData = {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        organizationName: organizationName || null,
        subscriptionTier: 'free',
        isActive: true
      };

      const user = await this.userModel.create(userData);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          subscriptionTier: user.subscriptionTier 
        },
        Config.jwtSecret,
        { expiresIn: Config.jwtExpiresIn }
      );

      // Log successful registration
      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            subscriptionTier: user.subscriptionTier,
            createdAt: user.createdAt
          },
          token
        }
      });
    } catch (error) {
      logger.error('Registration error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  /**
   * User login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      // Find user by email
      const user = await this.userModel.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          subscriptionTier: user.subscriptionTier 
        },
        Config.jwtSecret,
        { expiresIn: Config.jwtExpiresIn }
      );

      // Log successful login
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            subscriptionTier: user.subscriptionTier,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
          },
          token
        }
      });
    } catch (error) {
      logger.error('Login error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, Config.jwtSecret) as any;
      
      // Find user
      const user = await this.userModel.findById(decoded.userId);
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
        return;
      }

      // Generate new access token
      const newToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          subscriptionTier: user.subscriptionTier 
        },
        Config.jwtSecret,
        { expiresIn: Config.jwtExpiresIn }
      );

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            subscriptionTier: user.subscriptionTier
          }
        }
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
        return;
      }

      logger.error('Token refresh error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error during token refresh'
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            organizationName: user.organizationName,
            subscriptionTier: user.subscriptionTier,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Get profile error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching profile'
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { firstName, lastName, organizationName } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Validate required fields
      if (!firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
        return;
      }

      const updateData = {
        firstName,
        lastName,
        organizationName: organizationName || null
      };

      const updatedUser = await this.userModel.update(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            organizationName: updatedUser.organizationName,
            subscriptionTier: updatedUser.subscriptionTier,
            updatedAt: updatedUser.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Update profile error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating profile'
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long'
        });
        return;
      }

      // Get user to verify current password
      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.userModel.update(userId, { password: hashedNewPassword });

      // Log password change
      logger.info('User changed password', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error while changing password'
      });
    }
  }

  /**
   * Logout (invalidate token on client side)
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (userId) {
        // Log logout event
        logger.info('User logged out', {
          userId,
          ip: req.ip
        });
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout'
      });
    }
  }
}



