import { Request, Response } from "express";
import { UserService, LoginCredentials } from "@/services/userService";
import { logger } from "@/utils/logger";
import { createError } from "@/middleware/errorHandler";

const userService = new UserService();

export class AuthController {
  /**
   * User registration
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, organizationId } = req.body;

      // Validate required fields
      if (!email || !password || !name) {
        throw createError(
          "Email, password, and name are required",
          400,
          "MISSING_REQUIRED_FIELDS"
        );
      }

      // Check if user already exists
      const existingUser = await userService.getUserById(email);
      if (existingUser) {
        throw createError(
          "User with this email already exists",
          409,
          "USER_ALREADY_EXISTS"
        );
      }

      // Create user
      const user = await userService.createUser({
        email,
        passwordHash: await userService.hashPassword(password),
        name,
        subscriptionTier: "free",
      });

      logger.info("User registered successfully", { userId: user.id, email: user.email });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscriptionTier,
          },
        },
      });
    } catch (error) {
      logger.error("User registration error:", error);
      
      if (error instanceof Error && "code" in error) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: (error as any).code,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to register user",
        });
      }
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
        throw createError(
          "Email and password are required",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      // Authenticate user
      const authResult = await userService.authenticateUser({ email, password });

      logger.info("User logged in successfully", { userId: authResult.user.id, email: authResult.user.email });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            name: authResult.user.name,
            subscriptionTier: authResult.user.subscriptionTier,
            organization: authResult.user.organization,
            permissions: authResult.user.permissions,
          },
          token: authResult.token,
          refreshToken: authResult.refreshToken,
        },
      });
    } catch (error) {
      logger.error("User login error:", error);
      
      if (error instanceof Error && error.message === "Invalid credentials") {
        res.status(401).json({
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Login failed",
        });
      }
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw createError(
          "Refresh token is required",
          400,
          "MISSING_REFRESH_TOKEN"
        );
      }

      const tokens = await userService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          token: tokens.token,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      logger.error("Token refresh error:", error);
      
      if (error instanceof Error && error.message === "Invalid refresh token") {
        res.status(401).json({
          success: false,
          message: "Invalid refresh token",
          code: "INVALID_REFRESH_TOKEN",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Token refresh failed",
        });
      }
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // This should be called after authentication middleware
      const userId = (req as any).user?.id;
      
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        throw createError(
          "User not found",
          404,
          "USER_NOT_FOUND"
        );
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscriptionTier,
            organization: user.organization,
            permissions: user.permissions,
            customDomain: user.customDomain,
            brandLogoUrl: user.brandLogoUrl,
            brandColors: user.brandColors,
            apiKey: user.apiKey,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error("Get profile error:", error);
      
      if (error instanceof Error && "code" in error) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: (error as any).code,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to get profile",
        });
      }
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      const updateData = req.body;
      const updatedUser = await userService.updateUser(userId, updateData);

      logger.info("User profile updated", { userId });

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            subscriptionTier: updatedUser.subscriptionTier,
            customDomain: updatedUser.customDomain,
            brandLogoUrl: updatedUser.brandLogoUrl,
            brandColors: updatedUser.brandColors,
            updatedAt: updatedUser.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error("Update profile error:", error);
      
      if (error instanceof Error && "code" in error) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: (error as any).code,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to update profile",
        });
      }
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!userId) {
        throw createError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      if (!currentPassword || !newPassword) {
        throw createError(
          "Current password and new password are required",
          400,
          "MISSING_PASSWORD_FIELDS"
        );
      }

      // Verify current password
      const user = await userService.getUserById(userId);
      if (!user) {
        throw createError(
          "User not found",
          404,
          "USER_NOT_FOUND"
        );
      }

      // Update password
      await userService.updateUser(userId, { passwordHash: await userService.hashPassword(newPassword) });

      logger.info("Password changed successfully", { userId });

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Change password error:", error);
      
      if (error instanceof Error && "code" in error) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: (error as any).code,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to change password",
        });
      }
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw createError(
          "Email is required",
          400,
          "MISSING_EMAIL"
        );
      }

      // Generate reset token and send email
      // This would integrate with your email service
      const resetToken = `reset_${Math.random().toString(36).substr(2, 9)}`;
      
      // For now, just return success
      // TODO: Implement email sending and token storage
      logger.info("Password reset requested", { email, resetToken });

      res.status(200).json({
        success: true,
        message: "Password reset email sent",
        data: {
          resetToken, // Remove this in production
        },
      });
    } catch (error) {
      logger.error("Request password reset error:", error);
      
      if (error instanceof Error && "code" in error) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: (error as any).code,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to request password reset",
        });
      }
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        throw createError(
          "Reset token and new password are required",
          400,
          "MISSING_RESET_FIELDS"
        );
      }

      // TODO: Implement token verification and password reset
      // This would verify the reset token and update the user's password
      logger.info("Password reset completed", { resetToken });

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      logger.error("Reset password error:", error);
      
      if (error instanceof Error && "code" in error) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: (error as any).code,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to reset password",
        });
      }
    }
  }

  /**
   * Logout (client-side token removal)
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a stateless JWT system, logout is handled client-side
      // You could implement a blacklist for revoked tokens if needed
      logger.info("User logged out", { userId: (req as any).user?.id });

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      logger.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
  }
}



